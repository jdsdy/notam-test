# Flight plan parse API — architecture and pipeline

This document describes how the **parse flight plan** feature works end-to-end: the HTTP API, authentication, PDF segmentation, Anthropic agents, text extraction, parallel NOTAM processing, persistence, and how that differs from the optional **orchestrator** pipeline used elsewhere in the codebase.

---

## Table of contents

1. [Overview](#overview)
2. [HTTP API contract](#http-api-contract)
3. [Prerequisites and configuration](#prerequisites-and-configuration)
4. [High-level architecture](#high-level-architecture)
5. [Detailed pipeline (production route)](#detailed-pipeline-production-route)
6. [PDF segmentation](#pdf-segmentation)
7. [Physical PDF splitting (`pdf-lib`)](#physical-pdf-splitting-pdf-lib)
8. [Flight data extraction track](#flight-data-extraction-track)
9. [NOTAM extraction track](#notam-extraction-track)
10. [Persistence and database contracts](#persistence-and-database-contracts)
11. [UI integration and loading states](#ui-integration-and-loading-states)
12. [Alternative: `runFlightPlanExtractionPipeline` (orchestrator)](#alternative-runflightplanextractionpipeline-orchestrator)
13. [Error handling and observability](#error-handling-and-observability)
14. [Source file map](#source-file-map)

---

## Overview

The parse flight plan flow ingests a **single flight-plan PDF** (typically ForeFlight-style exports), uses an **LLM-based PDF splitter** to classify every page, **physically splits** the PDF into:

- a **flight-details** PDF (everything except NOTAMs, wind-only maps, and the compact route/weather table),
- a **route/weather table** PDF slice (compact table: **waypoints in the left column**, wind columns to the right),
- and one-or-more NOTAM PDFs,

…then runs **two largely independent tracks** (flight + NOTAMs). Flight extraction itself is split into **two agent calls** (route-only + core flight fields) and merged in code.

| Track | Input | Model(s) | Persists when | Written to |
|--------|--------|----------|----------------|------------|
| **Flight data** | Route/weather table PDF + flight-details PDF (Anthropic files) | Claude **Haiku 4.5** (route-table) + Claude **Sonnet 4.6** (core flight) | Before the HTTP response returns | `flights` |
| **NOTAMs** | Text from NOTAM PDFs (`pdf-parse`) → chunked text → parallel extractors | Claude **Sonnet 4.6** per chunk | After merge, in a **detached** async task (response does not wait) | `notam_analyses` (`raw_notams`) |

Important design points:

- **No supervisor LLM** on the live API route: NOTAM chunk outputs are **merged in TypeScript** (`mergeNotamExtractionPartials`) before a single DB write.
- **`flight_plan_json`** is not populated from the model for flight data; persistence keeps that column **`null`** while still accepting the schema shape internally.
- **`pdf-parse`** runs in Node; **`next.config.ts`** marks `pdf-parse` and `pdfjs-dist` as **`serverExternalPackages`** so Turbopack does not break pdf.js worker loading.

---

## HTTP API contract

### Endpoint

| Property | Value |
|----------|--------|
| **Method** | `POST` |
| **Path** | `/api/flights/[flightId]/parse-flight-plan` |
| **Implementation** | `app/api/flights/[flightId]/parse-flight-plan/route.ts` |

### Request body (`multipart/form-data`)

| Field | Required | Description |
|-------|----------|-------------|
| `file` | Yes | Non-empty PDF. Accepted when `Content-Type` is `application/pdf` **or** the filename ends with `.pdf`. |
| `organisationId` | Yes | Organisation UUID (also accepts legacy key `organisationID`). |
| `aircraftId` | Yes | Aircraft UUID (also accepts `aircraftID`). |

### Authentication and authorization

1. **`supabase.auth.getUser()`** — unauthenticated users receive **401**.
2. **`assertUserCanAccessFlight(userId, flightId)`** — must succeed; organisation on the flight must match `organisationId` from the form (**403** / **400** as implemented).
3. **`assertAircraftBelongsToOrganisation(aircraftId, organisationId)`** — aircraft must belong to the organisation (**403**).
4. **Flight row consistency** — the `flights` row for `flightId` must exist and its `organisation_id` / `aircraft_id` must match the supplied IDs (**404** / **400**).

### Successful response (`200`)

The JSON body matches **`FlightPlanParseApiResponse`** (`lib/flight-plan-parse.ts`):

| Field | Type | Meaning |
|-------|------|---------|
| `ok` | `true` | Success discriminator. |
| `fields` | `FlightPlanParsedFields` | Normalised flight fields after extraction + `buildPersistedFields` (includes `pdf_file_id` from the **original** Anthropic upload id, `flight_metadata`, `status` forced to **`draft`** for persistence, `flight_plan_json` **null**). |
| `needsManualReview` | `FlightPlanFieldKey[]` | Top-level field keys flagged by the extractor’s `unidentified_fields` and filtered to known reviewable keys — UI should highlight these. |
| `notamAnalysisId` | `string \| null` | Id of the **pending** `notam_analyses` row created by **`markPendingNotamExtraction`** so the UI can show a loading state. **Not** updated again when background NOTAM extraction finishes (the row id is stable). |
| `notamsIdentified` | `RawNotam[]` | Currently returned as an **empty array** from this route; raw NOTAMs are loaded later via workspace queries / refresh. |

### Error responses (selection)

| Status | Typical cause |
|--------|----------------|
| **400** | Missing `organisationId` / `aircraftId`, bad file, non-PDF, org/aircraft mismatch with flight row. |
| **401** | No Supabase user session. |
| **403** | User cannot access flight, or aircraft not in organisation. |
| **404** | Flight not found. |
| **500** | `ANTHROPIC_API_KEY` missing, DB apply failure, generic parse failure. |
| **502** | Anthropic **`APIError`** (surfaced as `Anthropic request failed: …`). |

---

## Prerequisites and configuration

| Variable / setting | Purpose |
|--------------------|---------|
| **`ANTHROPIC_API_KEY`** | Required for all Claude + Files API calls. Missing → **500**. |
| **Supabase session** | Cookie-based session for `createSupabaseServerClient()` and `getUser()`. |
| **`serverExternalPackages`** (`next.config.ts`) | `["pdf-parse", "pdfjs-dist"]` — avoids bundler breakage for pdf.js workers on the server. |

---

## High-level architecture

The route performs **sequential** work for splitting + flight extraction, then **fires and forgets** NOTAM persistence so the client can render flight fields immediately.

```mermaid
flowchart TB
  subgraph request["HTTP POST"]
    A[Validate session + form + access]
  end

  subgraph upload["Anthropic Files API"]
    B[Upload original PDF with UUID filename]
  end

  subgraph split["Page intelligence + physical split"]
    C[PDF splitter agent — structured JSON]
    D[pdf-lib splitPdfBySplitterResult]
  end

  subgraph flight["Flight track — awaited"]
    E[Upload route/weather table PDF]
    F[Route-table extraction agent (route only)]
    G[Upload flight-details PDF]
    H[Flight data extraction agent (no route)]
    I[mergeFlightDataPartials (no LLM)]
    J[buildPersistedFields + applyParsedFlightPlanToFlight]
  end

  subgraph notamBg["NOTAM track — background"]
    K[pdf-parse per NOTAM PDF]
    L[Join text]
    M[splitNotamText + parallel runNotamExtractionAgent]
    N[mergeNotamExtractionPartials — no LLM]
    O[extractedNotamsToRawPayload + upsertPendingNotamAnalysis]
  end

  subgraph response["Response"]
    P[markPendingNotamExtraction then JSON 200]
    Q[finally: delete uploaded file ids]
  end

  A --> B --> C --> D
  D --> E --> F --> G --> H --> I --> J --> P
  P --> Q
  D --> K --> L --> M --> N --> O
  J -.->|void| M
```

---

## Detailed pipeline (production route)

Below is the exact order of operations in **`POST`** (`route.ts`), with file references for maintainers.

### 1. Session and multipart parsing

- **`createSupabaseServerClient()`** then **`supabase.auth.getUser()`**.
- Read **`FormData`**: `organisationId`, `aircraftId`, `file`.
- Validate PDF and cross-check flight row in **`flights`**.

### 2. Original PDF → Anthropic Files API

- Read **`file`** into **`Uint8Array`** (`originalPdfBytes`).
- **`toFile(..., \`${crypto.randomUUID()}.pdf\`, { type })`** — filename is always a UUID to avoid Anthropic filename restrictions.
- **`anthropic.beta.files.upload`** with beta header **`files-api-2025-04-14`**.
- The returned **`id`** is tracked in **`uploadedFileIds`** for cleanup and becomes **`pdf_file_id`** on the flight after normalization.

### 3. PDF splitter agent (`runPdfSplitterAgent`)

- **Model:** `claude-haiku-4-5` (see `SPLITTER_MODEL` in `lib/flight-plan/agents/pdf-splitter.ts`).
- **Input:** `beta.messages.create` with a **document** block pointing at **`originalFileId`**, plus text stating the **1-indexed page count** from **`pdf-lib`** (`PDFDocument.load` → `getPageCount()`).
- **Output:** Structured JSON validated against **`splitterResultSchema`** (`lib/flight-plan/schemas.ts`): **`SplitterResult`** with:
  - **`notamGroups[]`**: each group has **`pages`** (1-indexed), **`notamCount`**, **`startId`**, **`endId`**.
  - **`windMapPages`**: pages that are **only** graphical wind/weather charts.
  - **`routeWeatherTablePages`**: pages that contain the **compact route/weather breakdown table** (waypoints on the left, wind columns to the right; often sits beneath the larger route table).
  - **`flightDetailPages`**: remaining non-NOTAM pages after excluding wind-only maps and routeWeatherTablePages.
- **Post-processing:** **`clampSplitterResult`** deduplicates, sorts, drops out-of-range page numbers, and reconciles overlaps into a deterministic partition order:
  1. NOTAM group pages
  2. `routeWeatherTablePages`
  3. `windMapPages`
  4. everything else becomes `flightDetailPages`

**Operational note:** The splitter system prompt currently steers the model toward a **single NOTAM group** containing all NOTAM pages (diagnostic-friendly layout). Physical output is still **`notamBatchPdfs[]`** — one buffer per group — so multiple groups remain supported if the prompt/schema evolve.

### 4. Physical PDF splitting (`splitPdfBySplitterResult`)

- Loads the original bytes with **`pdf-lib`** again.
- **Flight details PDF:** copies **`flightDetailPages`** (1-indexed → 0-indexed) into a new **`PDFDocument`**, returns **`Uint8Array | null`**.
- **Route/weather table PDF:** copies **`routeWeatherTablePages`** into a new PDF buffer, returned as **`routeWeatherTablePdf: Uint8Array | null`**.
- **NOTAM batch PDFs:** for each **`notamGroups`** entry, copies that group’s pages into its own PDF buffer, pushed to **`notamBatchPdfs: Uint8Array[]`**.
- **Wind maps** are excluded by construction — they appear neither in NOTAM groups, **`routeWeatherTablePages`**, nor **`flightDetailPages`** after clamping.

### 5. Flight data extraction (blocking)

This stage now runs **two flight extractors** and merges in code:

#### 5a. Route extraction from the route/weather table

If **`routeWeatherTablePdf`** is non-null:

1. Upload that buffer with **`uploadPdfBytes`** (UUID label **`route-weather-table`**).
2. **`runFlightRouteWeatherTableAgent`** extracts **`route`** only from the left waypoint column.

If there is **no** route/weather table PDF, the route stage uses **`ROUTE_PARTIAL_WHEN_NO_TABLE_PDF`** (route is `null` and `"route"` is added to `unidentified_fields`).

#### 5b. Core flight-data extraction (no route)

If **`flightDetailsPdf`** is non-null:

1. Upload that buffer with **`uploadPdfBytes`** (UUID label **`flight-details`**).
2. **`runFlightDataExtractionAgent`** — see [Flight data extraction track](#flight-data-extraction-track).
3. Merge core + route via **`mergeFlightDataPartials`** (no LLM).
4. **`buildFullExtractionFromFlightData`** → **`buildPersistedFields`** applies ICAO normalization, **`status: "draft"`**, masks unidentified top-level fields, forces **`flight_plan_json: null`**, and sets **`pdf_file_id`** to the **original** upload id.
5. **`applyParsedFlightPlanToFlight`** writes to **`flights`**.

If there is **no** flight-details PDF, the core stage uses **`FLIGHT_DATA_CORE_FALLBACK`** (all null flight fields; `"route"` remains in `unidentified_fields` until a non-null route is merged in).

### 6. NOTAM “extracting” marker (blocking)

- **`markPendingNotamExtraction(supabase, flightId)`** inserts or updates the latest **pending** `notam_analyses` row (`analysed_notams IS NULL`) so **`raw_notams`** contains a sentinel **`_status: "extracting"`** and an empty **`notams`** array. The UI uses this for loading.

### 7. Detached NOTAM pipeline (`void runDetachedNotamPersistence`)

This runs **without awaiting** on the request thread.

1. If **`notamBatchPdfs`** is empty → **`upsertPendingNotamAnalysis(..., null)`** (clears pending if appropriate) and exits.
2. For each NOTAM PDF buffer → **`extractPdfText`** (`lib/pdf-parse-server.ts` — **`PDFParse`** from **`pdf-parse`**).
3. Trim each extract, join non-empty parts with **`"\n\n"`** → **`notamText`**.
4. If text is empty → same empty payload as “no NOTAMs”.
5. Else → **`runNotamExtractionOnTextChunks({ anthropic, notamText })`** (`lib/flight-plan/notam-text-split.ts`):
   - **`splitNotamText`** splits on a **regex boundary** for ICAO-style id lines: letter + four digits + `/` + two-digit year + **`NOTAMN` / `NOTAMR` / `NOTAMC`**, at line start (or start of string).
   - Default **chunk size** is **`DEFAULT_NOTAM_TEXT_CHUNK_SIZE`** (currently **10** NOTAM *segments* per chunk — adjust in one constant).
   - **`Promise.allSettled`** runs **`runNotamExtractionAgent`** per chunk **in parallel**.
   - Fulfilled results are **`mergeNotamExtractionPartials`**:
     - **`notams`**: concatenated in chunk order.
     - **`unformatted_notams`**: concatenated with **trim-based deduplication** (preserves first occurrence).
     - **`unidentified_fields`**: union of all chunk-level arrays.
   - If **every** chunk rejects → throws; the **`catch`** clears pending via **`upsertPendingNotamAnalysis(..., null)`** and logs **`[notam-extraction-background]`**.
6. **`buildFullExtractionFromNotams`** + **`extractedNotamsToRawPayload`** → **`upsertPendingNotamAnalysis`** with merged **`RawNotamsPayload`** (`notams` + **`unformatted_notams`**).

**Chunk agents never write to the database individually** — only the merged payload is persisted.

### 8. HTTP response and cleanup

- Returns **`FlightPlanParseApiResponse`** with **`notamsIdentified: []`**.
- **`finally`:** **`anthropic.beta.files.delete`** for every id in **`uploadedFileIds`** (original + flight-details upload). **Note:** the detached NOTAM task uses the same **`anthropic`** client but does not upload additional files for NOTAM text extraction; deletions happen after the handler returns, while the background task may still be calling the Messages API — in practice the deleted ids are only the PDFs uploaded in the **`try`** block.

---

## PDF segmentation

### What the splitter is responsible for

The splitter is **only** a **page classifier**. It must **not** extract NOTAM bodies, routes, or waypoints. It returns a machine-readable plan:

- Which pages belong to **NOTAM groups** (for `pdf-lib` extraction).
- Which pages are **wind-only** maps.
- Which pages contain the **route/weather breakdown table** (for route-only extraction).
- Which pages are **flight detail** content.

### Partitioning invariant (after clamping)

Every page index from **1** to **`totalPages`** should appear in **exactly one** of:

- Some **`notamGroups[].pages`**, or
- **`routeWeatherTablePages`**, or
- **`windMapPages`**, or
- **`flightDetailPages`**.

Violations in model output are mitigated by **`clampSplitterResult`** (invalid/out-of-range/dupes removed).

---

## Physical PDF splitting (`pdf-lib`)

**`splitPdfBySplitterResult(originalPdfBytes, result)`**

- **Input:** Full PDF bytes + validated **`SplitterResult`**.
- **Output:**
  - **`flightDetailsPdf`**: single merged PDF for all **`flightDetailPages`**, or **`null`** if that list is empty.
  - **`routeWeatherTablePdf`**: single merged PDF for all **`routeWeatherTablePages`**, or **`null`** if that list is empty.
  - **`notamBatchPdfs`**: one **`Uint8Array`** per NOTAM group, preserving page order within each group.

Internals: **`PDFDocument.load`** → **`copyPages`** with **0-based** indices → **`save()`** to bytes.

---

## Flight data extraction track

**Module:** `lib/flight-plan/agents/flight-data-extraction.ts`

| Aspect | Detail |
|--------|--------|
| **Model** | `claude-sonnet-4-6` |
| **API** | `anthropic.beta.messages.create` (non-streaming) |
| **Thinking** | Disabled |
| **Effort** | `high` via **`output_config.effort`** |
| **Structured output** | **`zodOutputFormat`** on a schema derived from **`flightDataExtractionPartialSchema`** with **`flight_plan_json` and `route` omitted** — the model does not return waypoint tables and does not return route (route is extracted separately). |
| **Input modality** | **`document`** + **`file_id`** for the uploaded **flight-details** PDF only. |

The agent returns **core flight fields only** (no route). The route-table agent (`runFlightRouteWeatherTableAgent`) returns `{ route }`. Both partials are merged in TypeScript (**`mergeFlightDataPartials`**) back into the same **`FlightDataExtractionPartial`** shape used by normalization/persistence. The route then injects empty **`flight_plan_json`** at the type level via **`buildFullExtractionFromFlightData`** before **`buildPersistedFields`**, which **always** sets **`flight_plan_json: null`** on the persisted **`FlightPlanParsedFields`**.

---

## NOTAM extraction track

### Text extraction (`pdf-parse`)

- **`extractPdfText(bytes)`** in `lib/pdf-parse-server.ts` instantiates **`PDFParse`**, **`getText()`**, then **`destroy()`** in a **`finally`** block.
- Each NOTAM-group PDF is processed; extracts are concatenated with blank-line separators to preserve page boundaries loosely in text.

### Text splitting (`splitNotamText`)

**Module:** `lib/flight-plan/notam-text-split.ts`

1. **Trim** full NOTAM string.
2. **Split** on **`NOTAM_ICAO_ID_BOUNDARY`**: lookahead for start-of-string or newline, then **`[A-Z]\d{4}/\d{2}`** + whitespace + **`NOTAMN`|`NOTAMR`|`NOTAMC`** word boundary.
3. **Trim** each segment; drop empties.
4. **Chunk** segments into groups of **`chunkSize`** (default constant **`DEFAULT_NOTAM_TEXT_CHUNK_SIZE`**).
5. **Join** each chunk’s segments with **`"\n"`** (single newline between segments inside a chunk).

**Implications**

- Text with **no** ICAO id lines produces **one chunk** (the whole string) — still one agent call.
- Very large documents produce **more parallel** agent calls; **`allSettled`** prevents one failed chunk from aborting siblings before merge.

### NOTAM extraction agent (`runNotamExtractionAgent`)

**Module:** `lib/flight-plan/agents/notam-extraction.ts`

| Aspect | Detail |
|--------|--------|
| **Model** | `claude-sonnet-4-6` |
| **API** | **`anthropic.beta.messages.stream`** → **`await stream.finalMessage()`** (full response buffered server-side). |
| **`max_tokens`** | `40000` |
| **Structured output** | **`zodOutputFormat(notamExtractionPartialSchema)`** |
| **User message** | Plain **text** only: instructions + the **chunk** body (no Files API document for NOTAM text). |

**Schema slice (`NotamExtractionPartial`):**

- **`extracted_notams.notams`**: structured ICAO-style NOTAM objects with **`null_values`** arrays for nested nullability.
- **`extracted_notams.unformatted_notams`**: string blobs for **NAIPS / non-ICAO** notices the model is instructed **not** to force into **`notams`**.
- **`unidentified_fields`**: top-level parser uncertainty (e.g. empty **`notams`** when nothing found).

### Merge (`mergeNotamExtractionPartials`)

Pure TypeScript — **no LLM**:

- **`notams`**: **`flatMap`** across partials in chunk order.
- **`unformatted_notams`**: append in order; skip duplicates by **trimmed** string (first wins).
- **`unidentified_fields`**: set union.

### Batched runner (`runNotamExtractionOnTextChunks`)

Orchestrates **`splitNotamText`** → **`Promise.allSettled`** over **`runNotamExtractionAgent`** → **`mergeNotamExtractionPartials`**. Logs **`[notam-chunk i/n]`** for rejected chunks.

---

## Persistence and database contracts

### `flights` table (immediate)

**`applyParsedFlightPlanToFlight`** (`lib/notam-analysis-service.ts`) updates:

- Core flight columns: ICAOs, times, **`time_enroute`**, runways, **`route`**, **`aircraft_weight`**, **`status`** (validated against allowed statuses).
- **`flight_metadata`** (JSON) when present on the parsed fields object.
- **`pdf_file_id`** — Anthropic file id of the **original** uploaded plan.
- **`flight_plan_json`** — whatever the parsed fields object carries; the normalizer sets this to **`null`** for the parse pipeline.

### `notam_analyses` table (pending row)

**`markPendingNotamExtraction`**

- Finds latest row for **`flight_id`** with **`analysed_notams IS NULL`**.
- Updates **`raw_notams`** to **`{ _status: "extracting", notams: [] }`** or inserts a new pending row.

**`upsertPendingNotamAnalysis`**

- If both **`notams`** and **`unformatted_notams`** are empty after merge → **deletes** the pending row (if any) and returns **`notamAnalysisId: null`**.
- Otherwise **updates** or **inserts** **`raw_notams`** as **`RawNotamsPayload`**: **`{ notams, unformatted_notams }`**.

**`extractedNotamsToRawPayload`** (`lib/flight-plan/normalize.ts`)

- Maps structured **`null_values`** placeholders to actual **`null`** fields on **`RawNotam`** objects.
- Returns **`null`** only when **both** arrays would be empty.

---

## UI integration and loading states

- **`getNotamAnalysisWorkspaceState`** (`lib/notam-analyses.ts`) reads the pending row and sets **`pending.extracting`** when **`raw_notams._status === "extracting"`**.
- **`NotamAnalysisPanel`** (`components/app/notam-analysis-panel.tsx`) shows a **loading / shimmer** state while **`extracting`** is true and periodically **`router.refresh()`** until the server state updates.
- The parse API returns **`notamAnalysisId`** from **`markPendingNotamExtraction`** so the client can correlate with the pending row even before NOTAM text extraction completes.

---

## Alternative: `runFlightPlanExtractionPipeline` (orchestrator)

**Module:** `lib/flight-plan/orchestrator.ts`

This function implements a **single cohesive extraction** suitable for batch jobs or future routes:

1. Upload original PDF.
2. Same **splitter** + **`splitPdfBySplitterResult`**.
3. Same **`pdf-parse`** → joined **`notamText`**.
4. **`Promise.all`** in parallel:
   - **`runNotamExtractionOnTextChunks`** (chunked NOTAM agents + TS merge).
   - **`runFlightRouteWeatherTableAgent`** on uploaded route/weather table PDF (or fallback route partial).
   - **`runFlightDataExtractionAgent`** on uploaded flight-details PDF (or fallback core partial).
5. Merge flight core + route in code (**`mergeFlightDataPartials`**).
6. **`runSupervisorAgent`** — **Claude Haiku 4.5**, streaming **`finalMessage()`**, **`zodOutputFormat(flightPlanExtractionSchema)`** — merges **`flightDataPartial`** + **`notamPartial`** into a **full** **`FlightPlanExtraction`** (this path **does** use an LLM merge).

The **live parse route does not call** this orchestrator today; it duplicates the split + flight path and uses **TS merge** for NOTAMs instead of the supervisor.

---

## Error handling and observability

| Prefix / tag | Where |
|----------------|-------|
| **`[pdf-splitter-agent]`** | Thrown from **`runPdfSplitterAgent`** on model/parse/schema failures. |
| **`[flight-data-extraction-agent]`** | Flight agent failures. |
| **`[notam-extraction-agent]`** | Single-chunk NOTAM failures. |
| **`[notam-chunk i/n]`** | Logged when a parallel chunk rejects inside **`runNotamExtractionOnTextChunks`**. |
| **`[notam-extraction-chunks]`** | Thrown when **all** chunks fail. |
| **`[notam-extraction-background]`** | Logged in route **`catch`** for detached NOTAM persistence. |
| **`[supervisor-agent]`** | Orchestrator-only merge failures. |

Anthropic **`APIError`** instances from the synchronous portion of the route map to **502** with the provider message.

---

## Source file map

| Concern | Path |
|---------|------|
| HTTP route | `app/api/flights/[flightId]/parse-flight-plan/route.ts` |
| Splitter agent + `pdf-lib` split | `lib/flight-plan/agents/pdf-splitter.ts` |
| Flight data agent | `lib/flight-plan/agents/flight-data-extraction.ts` |
| Route/weather table agent | `lib/flight-plan/agents/flight-route-weather-extraction.ts` |
| Flight merge helper (route + core) | `lib/flight-plan/merge-flight-data.ts` |
| NOTAM text agent | `lib/flight-plan/agents/notam-extraction.ts` |
| Text split + parallel merge | `lib/flight-plan/notam-text-split.ts` |
| Zod / JSON contracts | `lib/flight-plan/schemas.ts` |
| Normalize + NOTAM → DB payload | `lib/flight-plan/normalize.ts` |
| Optional full pipeline + supervisor | `lib/flight-plan/orchestrator.ts` |
| Supervisor agent | `lib/flight-plan/agents/supervisor.ts` |
| PDF text extraction wrapper | `lib/pdf-parse-server.ts` |
| API response types | `lib/flight-plan-parse.ts` |
| Flight / NOTAM persistence helpers | `lib/notam-analysis-service.ts` |
| Workspace read model | `lib/notam-analyses.ts` |
| Raw NOTAM payload parsing | `lib/notams.ts` |
| Next server externals | `next.config.ts` |
| Route tests | `tests/parse-flight-plan-route.test.ts` |
| Split/merge unit tests | `tests/notam-text-split.test.ts` |

---

## Maintenance notes

1. **Chunk size** — change parallel NOTAM fan-out by editing **`DEFAULT_NOTAM_TEXT_CHUNK_SIZE`** in `lib/flight-plan/notam-text-split.ts` (or pass **`chunkSize`** if the runner API is extended).
2. **Splitter prompt vs. multi-group PDFs** — the prompt currently emphasises a **single** NOTAM page group; `splitPdfBySplitterResult` still emits **one PDF per group** if you later allow multiple groups again.
3. **Supervisor vs. route** — if you want the HTTP route to return a fully merged **`FlightPlanExtraction`** in one shot, you could switch to **`runFlightPlanExtractionPipeline`**, at the cost of waiting for NOTAM extraction (or redesigning the response model).
4. **`pdf-parse` upgrades** — if worker issues reappear, verify **`serverExternalPackages`** still includes **`pdf-parse`** and **`pdfjs-dist`**.

---

*Generated from repository source. When behaviour and docs diverge, trust the code.*
