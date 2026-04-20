import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PDFDocument } from "pdf-lib";

import {
  splitterResultSchema,
  type SplitterResult,
} from "@/lib/flight-plan/schemas";

const FILES_API_BETA = "files-api-2025-04-14";
const SPLITTER_MODEL = "claude-opus-4-7";

const SYSTEM_PROMPT = `
You are a PDF segmentation agent for flight-plan PDFs. Your only job is to classify every page of the document and produce a structured plan describing how the PDF should be split for downstream extraction. You must not extract NOTAM content, flight values, waypoints, or any other data.

The PDF contains these kinds of content:
1. NOTAM entries (Notices to Airmen). Each NOTAM is a self-contained block that begins with a title in bold, all-capital letters (for example "AERODROME", "UNMANNED AIRCRAFT WILL TAKE PLACE", "RWY CLOSED"). Directly below the title is a NOTAM identifier line such as "A1234/26" or "C4550/25 NOTAMR C4549/25". Each NOTAM also contains some combination of Q), A), B), C), D), E), F) and G) fields.
2. Wind / weather charts. Pages that contain only graphical wind or weather charts and no other substantive flight text.
3. Route / weather breakdown table. A **compact** table that usually sits **below** a larger flight-route table on the same or following page(s). It has **waypoints in the left column** and **wind or weather data in columns to the right**. List those page numbers in "routeWeatherTablePages". This slice is extracted separately for the route string. Do not get confused between this table and the larger route table above it. The larger route table has more columns and the correct route weather table is more compact.
4. Flight detail content. Everything else relevant to the flight — departure/arrival info, aircraft information, aircraft weight, the large route/waypoint tables, performance tables, fuel planning, etc. **Exclude** pages you listed in routeWeatherTablePages or windMapPages.

Classification rules:
- Identify every NOTAM entry in the document.
- For this flow, put ALL NOTAM pages into a single NOTAM group. The group must contain every page that belongs to the NOTAM section and no other pages.
- For that single NOTAM group, report: the 1-indexed page numbers ("pages"), how many complete NOTAMs sit inside the whole NOTAM section ("notamCount"), the identifier of the first NOTAM in the section ("startId"), and the identifier of the last NOTAM in the section ("endId"). Identifiers must be taken verbatim from the NOTAM id line.
- NOTAMS are laid out in 2 vertical columns on each page, from top left to bottom right. A NOTAM that bisects a page may begin at the bottom right and continue at the top left of the next page.
- Identify every page that contains only graphical wind or weather charts in "windMapPages".
- Identify every page where the **compact** route/weather breakdown table (waypoints left, wind data right) appears in "routeWeatherTablePages".
- List remaining flight-relevant pages in "flightDetailPages" (you may omit pages already assigned to NOTAMs, wind maps, or the route/weather table — the server will reconcile coverage).

All page numbers are 1-indexed.

Output contract:
Return ONLY a raw JSON object — no preamble, no postamble, no markdown fences, no commentary. Example shape:

{
  "notamGroups": [
    { "pages": [1, 2, 3], "notamCount": 3, "startId": "A1234/26", "endId": "C4550/25 NOTAMR C4549/25" }
  ],
  "windMapPages": [4, 5],
  "routeWeatherTablePages": [6],
  "flightDetailPages": [7, 8, 9]
}
`;

function dedupeSortedPositive(values: number[], totalPages: number): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of values) {
    const page = Math.floor(raw);
    if (!Number.isFinite(page) || page < 1 || page > totalPages) continue;
    if (seen.has(page)) continue;
    seen.add(page);
    out.push(page);
  }
  return out.sort((a, b) => a - b);
}

function clampSplitterResult(
  result: SplitterResult,
  totalPages: number,
): SplitterResult {
  const notamGroups = result.notamGroups
    .map((group) => ({
      ...group,
      pages: dedupeSortedPositive(group.pages, totalPages),
    }))
    .filter((group) => group.pages.length > 0);

  const notamSet = new Set(notamGroups.flatMap((group) => group.pages));

  const allPages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const nonNotamPages = allPages.filter((page) => !notamSet.has(page));

  const routeWeatherTablePages = dedupeSortedPositive(
    result.routeWeatherTablePages,
    totalPages,
  ).filter((page) => nonNotamPages.includes(page));

  const routeSet = new Set(routeWeatherTablePages);
  const afterRoute = nonNotamPages.filter((page) => !routeSet.has(page));

  const windMapPages = dedupeSortedPositive(result.windMapPages, totalPages).filter(
    (page) => afterRoute.includes(page),
  );

  const windSet = new Set(windMapPages);
  const flightDetailPages = afterRoute.filter((page) => !windSet.has(page));

  return {
    notamGroups,
    windMapPages,
    routeWeatherTablePages,
    flightDetailPages,
  };
}

/**
 * PDF splitter agent. Receives the uploaded original PDF's file_id (and its
 * raw bytes, used only to report the page count to the model) and asks
 * claude-haiku to classify every page into NOTAM groups, wind-map pages,
 * route/weather table pages, or flight-detail pages.
 *
 * Returns the validated SplitterResult. The orchestrator is responsible for
 * physically splitting the PDF (via splitPdfBySplitterResult) and uploading
 * the resulting parts.
 */
export async function runPdfSplitterAgent(args: {
  anthropic: Anthropic;
  originalFileId: string;
  originalPdfBytes: Uint8Array;
}): Promise<SplitterResult> {
  const { anthropic, originalFileId, originalPdfBytes } = args;

  try {
    const source = await PDFDocument.load(originalPdfBytes);
    const totalPages = source.getPageCount();

    const response = await anthropic.beta.messages.create({
      model: SPLITTER_MODEL,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      thinking: { type: "disabled" },
      output_config: {
        format: zodOutputFormat(splitterResultSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This PDF has ${totalPages} pages (1-indexed). Classify every page and return the segmentation plan as raw JSON only.`,
            },
            {
              type: "document",
              source: { type: "file", file_id: originalFileId },
            },
          ],
        },
      ],
      betas: [FILES_API_BETA],
    });

    const outputText = response.content
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? block.text : ""))
      .join("\n")
      .trim();
    if (!outputText) {
      throw new Error("Splitter model returned no text output.");
    }

    console.log("Splitter agent responded: ", outputText)

    const parsed = splitterResultSchema.safeParse(JSON.parse(outputText));
    if (!parsed.success) {
      throw new Error(
        `Splitter output failed schema validation: ${parsed.error.message}`,
      );
    }

    return clampSplitterResult(parsed.data, totalPages);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`[pdf-splitter-agent] ${reason}`);
  }
}

async function buildPdfFromOneBasedPages(
  source: PDFDocument,
  oneBasedPages: number[],
): Promise<Uint8Array | null> {
  if (oneBasedPages.length === 0) return null;
  const zeroBased = oneBasedPages.map((page) => page - 1);
  const target = await PDFDocument.create();
  const copied = await target.copyPages(source, zeroBased);
  for (const page of copied) target.addPage(page);
  return await target.save();
}

/**
 * Physically splits the source PDF using explicit 1-indexed page arrays from
 * the splitter plan (converted to 0-indexed before being handed to pdf-lib).
 *
 * Wind-map and route/weather-table pages are excluded from flightDetailsPdf by
 * omission from flightDetailPages in the clamped splitter result.
 */
export async function splitPdfBySplitterResult(
  originalPdfBytes: Uint8Array,
  result: SplitterResult,
): Promise<{
  flightDetailsPdf: Uint8Array | null;
  routeWeatherTablePdf: Uint8Array | null;
  notamBatchPdfs: Uint8Array[];
}> {
  const source = await PDFDocument.load(originalPdfBytes);

  const flightDetailsPdf = await buildPdfFromOneBasedPages(
    source,
    result.flightDetailPages,
  );

  const routeWeatherTablePdf = await buildPdfFromOneBasedPages(
    source,
    result.routeWeatherTablePages,
  );

  const notamBatchPdfs: Uint8Array[] = [];
  for (const group of result.notamGroups) {
    const buffer = await buildPdfFromOneBasedPages(source, group.pages);
    if (buffer) notamBatchPdfs.push(buffer);
  }

  return { flightDetailsPdf, routeWeatherTablePdf, notamBatchPdfs };
}
