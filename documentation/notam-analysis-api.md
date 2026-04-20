# NOTAM Analysis API (Claude Opus 4.7)

This document describes the **second** API in the NOTAM pipeline: taking a flight’s **pending structured NOTAMs** and running **Claude** to produce **categorised summaries**, then persisting those results back to the database.

When documentation and code diverge, **trust the code**. All paths referenced below exist in the repository.

---

## What this API does (high level)

1. **Auth + access checks**: requires a signed-in user and validates that the **flight belongs to the organisation** the user provided.
2. **Reads flight + aircraft context**: loads flight planning fields from `flights` and additional aircraft context (`manufacturer`, `type`, `wingspan`) from `aircraft`.
3. **Loads pending raw NOTAM extraction**: selects the latest `notam_analyses` row for the flight where `analysed_notams IS NULL`.
4. **Splits structured NOTAM objects into chunks of 20**: runs one Claude call per chunk (in parallel).
5. **Merges chunk outputs back into one categorisation**: purely in TypeScript (no additional LLM calls).
6. **Enriches each NOTAM**: maps model output `{i, s}` to each original NOTAM by `id`, writing `category` + `summary`.
7. **Persists analysed payload**: writes the final JSON into `notam_analyses.analysed_notams`.

---

## Endpoint

### `POST /api/flights/[flightId]/analyse-notams`

**Route:** `app/api/flights/[flightId]/analyse-notams/route.ts`

#### Required parameters

- **`flightId`**: URL param (`/api/flights/<flightId>/analyse-notams`)
- **`organisationId`**: required string in JSON request body

#### Request body

```json
{
  "organisationId": "org-uuid"
}
```

#### Responses

- **200**

```json
{
  "ok": true,
  "analysisId": "uuid",
  "analysed": {
    "notams": [
      {
        "id": "C4550/25 NOTAMR C4549/25",
        "title": "AERODROME",
        "q": "YMMM/QFAXX/IV/NBO/A/000/999/3357S15111E005",
        "a": "YSSY",
        "b": "2512180156",
        "c": "PERM",
        "d": null,
        "e": "…",
        "f": null,
        "g": null,
        "category": 1,
        "summary": "…"
      }
    ],
    "unformatted_notams": ["…"]
  }
}
```

- **401**: not signed in
- **403**: user cannot access the flight or the flight is not in the provided organisation
- **400**: invalid inputs or no pending extraction row / empty extraction / extraction still running
- **502**: upstream model failure (Anthropic API errors)

---

## Security + access control

### Route-level checks

The route performs two checks before any analysis work:

1. **Signed-in user required** via `getCurrentUser()` (`lib/supabase/server`).
2. **Flight access** via `assertUserCanAccessFlight(user.id, flightId)` (`lib/flights.ts`), then verifies the flight’s organisation matches the request body.

**Code:** `app/api/flights/[flightId]/analyse-notams/route.ts`

### Database RLS (Supabase)

`notam_analyses` enforces RLS policies so only organisation members can select/insert/update/delete analysis rows.

**Schema/policies:** `supabase/migrations/20260416120000_notam_analyses.sql` and `supabase/migrations/20260418120000_notam_analyses_nullable_analysed.sql`

---

## Database reads/writes

All analysis work is orchestrated by:

**Service:** `lib/notam-analysis-service.ts` → `runNotamAnalysisForFlight(supabase, flightId, organisationId, deps?)`

### Reads

1. **Flight row (scoped to organisation)**

```ts
supabase
  .from("flights")
  .select("aircraft_id, departure_icao, arrival_icao, departure_time, arrival_time, time_enroute, departure_rwy, arrival_rwy, route, aircraft_weight, flight_metadata")
  .eq("id", flightId)
  .eq("organisation_id", organisationId)
  .maybeSingle()
```

2. **Aircraft row (scoped to organisation)**

```ts
supabase
  .from("aircraft")
  .select("manufacturer, type, wingspan")
  .eq("id", aircraftId)
  .eq("organisation_id", organisationId)
  .maybeSingle()
```

> `wingspan` is added by migration `supabase/migrations/20260419103000_aircraft_wingspan.sql`.

3. **Pending NOTAM analysis row**

```ts
supabase
  .from("notam_analyses")
  .select("id, raw_notams")
  .eq("flight_id", flightId)
  .is("analysed_notams", null)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle()
```

### Writes

**Final persistence** happens exactly once:

```ts
supabase
  .from("notam_analyses")
  .update({ analysed_notams: analysed })
  .eq("id", pending.id)
  .eq("flight_id", flightId)
```

This updates the *same pending row* that holds `raw_notams`.

---

## Input payloads

There are three key payload shapes in this pipeline:

### 1) Raw NOTAM payload (stored in DB)

The `raw_notams` column stores:

- **`notams`**: structured ICAO-format NOTAMs (`RawNotam[]`)
- **`unformatted_notams`**: raw text NOTAMs that should **not** be analysed (kept for display / future work)

Type + parsing helpers live in `lib/notams.ts`:

- `RawNotam`
- `RawNotamsPayload`
- `parseRawNotamsFromFlightPlanJson(...)`

Shape:

```json
{
  "notams": [{ "id": "…", "title": "…", "q": "…", "a": "…", "b": "…", "c": "…", "d": null, "e": "…", "f": null, "g": null }],
  "unformatted_notams": ["…"]
}
```

### 2) Agent context (flight + aircraft, without NOTAMs)

Built by `buildNotamAnalysisAgentContext` in `lib/notam-analysis/flight-json-for-notam-analysis.ts`.

```json
{
  "departure_icao": "YSSY",
  "arrival_icao": "YBBN",
  "aircraft_manufacturer": "Gulfstream",
  "aircraft_model": "G700",
  "aircraft_weight": 67883,
  "aircraft_wingspan": 31.39,
  "departure_time": "2026-04-25T09:10:00.000Z",
  "arrival_time": "2026-04-25T17:10:06.000Z",
  "time_enroute": 56,
  "departure_rwy": "34L",
  "arrival_rwy": "01R",
  "route": "DCT",
  "flight_metadata": {
    "cruise_altitude": "FL450",
    "total_fuel_required": 9553
  }
}
```

Notes:

- `aircraft_*` fields are **nullable** if the aircraft row is missing.
- `flight_metadata` is always an object; missing/invalid metadata becomes `{}`.
- `aircraft_wingspan` is parsed from `aircraft.wingspan` if it is a number or numeric string.

### 3) Payload sent to each agent call (context + chunk)

Each Claude call receives one JSON object:

```json
{
  "...agent context fields...": "…",
  "notams": [/* up to 20 structured NOTAM objects */]
}
```

This payload is created in `runNotamCategorisationLlm`:

- `lib/notam-analysis/run-notam-categorisation-llm.ts`

Critically:

- **Only structured NOTAMs** are included.
- `unformatted_notams` is never passed to Claude.

---

## Splitting strategy (chunks of 20)

The analysis pipeline uses the same “split → parallel calls → merge in code” pattern as extraction, but operates on **structured NOTAM objects** instead of raw text.

### Split function

- **Default chunk size:** `20`
- **Implementation:** `lib/notam-analysis/split-structured-notams.ts`
  - `DEFAULT_NOTAM_ANALYSIS_CHUNK_SIZE = 20`
  - `splitStructuredNotamsForAnalysis(notams, chunkSize?)`

It partitions the `RawNotam[]` into `RawNotam[][]` chunks:

- `0..19`, `20..39`, etc.

### Chunk runner

**Implementation:** `lib/notam-analysis/run-notam-categorisation-chunks.ts`

Flow:

1. Split into chunks of 20.
2. `Promise.allSettled` over chunks.
3. Keep fulfilled results; log chunk failures.
4. If *all* chunks fail → throw.

---

## Agent call (Claude Opus 4.7)

### Model + request format

**Implementation:** `lib/notam-analysis/run-notam-categorisation-llm.ts`

- **Model:** `claude-opus-4-7`
- **Thinking:** `{ type: "adaptive" }`
- **Structured output:** `zodOutputFormat(notamCategorisationLlmOutputSchema)`
- **Streaming:** `anthropic.beta.messages.stream(...).finalMessage()`

### Output schema

The model must return JSON in this exact shape:

```json
{
  "cat1": [{ "i": "<notam id>", "s": "<summary>" }],
  "cat2": [{ "i": "<notam id>", "s": "<summary>" }],
  "cat3": [{ "i": "<notam id>", "s": "<summary>" }]
}
```

Schema definition:

- `lib/notam-analysis/notam-categorisation-schema.ts`

Where:

- **`i`** must match the original NOTAM `id` string (used for joining back).
- **`s`** is the crew-facing summary.

---

## Merge strategy (two merges, both programmatic)

There are **two** merge steps, both deterministic TypeScript (no LLM).

### 1) Merge chunk categorisation outputs

**Implementation:** `lib/notam-analysis/merge-notam-categorisation-outputs.ts`

Input:

- `NotamCategorisationLlmOutput[]` (one per chunk)

Output:

- a single `NotamCategorisationLlmOutput` with combined `cat1/cat2/cat3`

Duplicate handling:

- Duplicates are detected by **trimmed `i`**.
- The first occurrence in scan order is kept; later duplicates are dropped.

### 2) Merge model results back into NOTAMs (enrich original objects)

**Implementation:** `lib/notam-analysis/merge-llm-notam-categories.ts`

Input:

- `RawNotamsPayload` (from DB)
- `NotamCategorisationLlmOutput` (merged)

Output:

- `AnalysedNotamsPayload` with:
  - `notams`: each original NOTAM plus `{ category, summary }`
  - `unformatted_notams`: carried forward unchanged

Join key:

- Original NOTAM: `n.id` (trimmed)
- Model: `entry.i` (trimmed)

If the model does not return an entry for a given NOTAM id:

- Category defaults to **3**
- Summary defaults to a fixed string:
  - `"No model summary was returned for this NOTAM id; confirm relevance manually."`

---

## UI integration

The UI triggers analysis and displays the stored result:

- **Button + request:** `components/app/notam-analysis-panel.tsx`
  - Sends `POST /api/flights/[flightId]/analyse-notams`
  - Includes JSON body `{ organisationId }`
- **Workspace read model:** `lib/notam-analyses.ts`
  - `getNotamAnalysisWorkspaceState(...)` reads:
    - latest pending row (`analysed_notams IS NULL`)
    - latest complete row (`analysed_notams IS NOT NULL`)
  - Detects extraction-in-progress via `raw_notams._status === "extracting"`

The route also triggers:

- `revalidatePath("/organisations/[organisationId]")`
- `revalidatePath("/organisations/[organisationId]/flights/[flightId]")`

---

## Operational requirements

### Environment

- **`ANTHROPIC_API_KEY`** must be set for production runs.
  - If missing, the service returns an error and the route responds **400** with that message.

### Runtime behaviour notes

- If NOTAM extraction is still running, `raw_notams` may be:

```json
{ "_status": "extracting", "notams": [] }
```

In that state analysis is rejected with a clear message to wait.

---

## Source file map

| Concern | Path |
|--------|------|
| HTTP route | `app/api/flights/[flightId]/analyse-notams/route.ts` |
| Core service orchestration | `lib/notam-analysis-service.ts` |
| Agent context builder | `lib/notam-analysis/flight-json-for-notam-analysis.ts` |
| Split structured NOTAMs (20) | `lib/notam-analysis/split-structured-notams.ts` |
| Chunk runner (parallel calls) | `lib/notam-analysis/run-notam-categorisation-chunks.ts` |
| Single Claude call + schema parse | `lib/notam-analysis/run-notam-categorisation-llm.ts` |
| Output schema | `lib/notam-analysis/notam-categorisation-schema.ts` |
| Merge chunk outputs | `lib/notam-analysis/merge-notam-categorisation-outputs.ts` |
| Merge summaries back into NOTAMs | `lib/notam-analysis/merge-llm-notam-categories.ts` |
| Stored payload types + parsers | `lib/notams.ts` |
| Workspace reader (pending + latest) | `lib/notam-analyses.ts` |
| DB schema / RLS policies | `supabase/migrations/20260416120000_notam_analyses.sql` |
| Allow analysed_notams nullable | `supabase/migrations/20260418120000_notam_analyses_nullable_analysed.sql` |
| Aircraft wingspan column | `supabase/migrations/20260419103000_aircraft_wingspan.sql` |
| UI panel | `components/app/notam-analysis-panel.tsx` |

---

## Tests

Unit tests covering split/merge and orchestration live under:

- `tests/notam-analysis/*`

Key ones:

- `split-structured-notams.test.ts` (chunk size 20 behaviour)
- `merge-notam-categorisation-outputs.test.ts` (chunk merge semantics)
- `run-notam-categorisation-chunks.test.ts` (parallel chunk calls)
- `merge-llm-notam-categories.test.ts` (join back onto raw NOTAMs)
- `notam-analysis-service.test.ts` (service-level happy path, chunking, extraction-busy gate)

---

*Generated from repository source. When behaviour and docs diverge, trust the code.*

