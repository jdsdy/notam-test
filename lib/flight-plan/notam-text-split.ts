import type Anthropic from "@anthropic-ai/sdk";

import { runNotamExtractionAgent } from "@/lib/flight-plan/agents/notam-extraction";
import type { NotamExtractionPartial } from "@/lib/flight-plan/schemas";

/** Default number of ICAO NOTAM segments to bundle into one agent call. */
export const DEFAULT_NOTAM_TEXT_CHUNK_SIZE = 10;

/**
 * Split before each ICAO-style NOTAM id line (one letter, four digits, /yy,
 * then NOTAMN / NOTAMR / NOTAMC). Matches start of string or after a newline
 * so the first NOTAM in the block is not missed.
 */
const NOTAM_ICAO_ID_BOUNDARY =
  /(?=(?:^|[\r\n]+)[A-Z]\d{4}\/\d{2}\s+NOTAM[NRC]\b)/g;

/**
 * Breaks raw NOTAM text into segments at ICAO NOTAM boundaries, then groups
 * up to `chunkSize` segments per chunk for parallel extraction.
 */
export function splitNotamText(rawText: string, chunkSize: number): string[] {
  const text = rawText.trim();
  if (!text) return [];

  const individual = text
    .split(NOTAM_ICAO_ID_BOUNDARY)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (individual.length === 0) return [];

  const chunks: string[] = [];
  for (let i = 0; i < individual.length; i += chunkSize) {
    chunks.push(individual.slice(i, i + chunkSize).join("\n"));
  }
  return chunks;
}

/**
 * Merges chunk-level NOTAM extraction JSON into one partial (no LLM).
 * `unformatted_notams` are concatenated with order preserved; exact-duplicate
 * strings (after trim) are skipped. `unidentified_fields` are unioned.
 */
export function mergeNotamExtractionPartials(
  partials: NotamExtractionPartial[],
): NotamExtractionPartial {
  const notams = partials.flatMap((p) => p.extracted_notams.notams);

  const seenUnformatted = new Set<string>();
  const unformatted_notams: string[] = [];
  for (const p of partials) {
    for (const raw of p.extracted_notams.unformatted_notams ?? []) {
      const key = raw.trim();
      if (!key || seenUnformatted.has(key)) continue;
      seenUnformatted.add(key);
      unformatted_notams.push(raw);
    }
  }

  const unidentified_fields = Array.from(
    new Set(partials.flatMap((p) => p.unidentified_fields ?? [])),
  );

  return {
    extracted_notams: { notams, unformatted_notams },
    unidentified_fields,
  };
}

/**
 * Runs the NOTAM extraction agent once per text chunk in parallel, then merges
 * results in code. Chunk agents do not write to the database — callers persist
 * the merged partial only.
 */
export async function runNotamExtractionOnTextChunks(args: {
  anthropic: Anthropic;
  notamText: string;
  chunkSize?: number;
}): Promise<NotamExtractionPartial> {
  const chunkSize = args.chunkSize ?? DEFAULT_NOTAM_TEXT_CHUNK_SIZE;
  const trimmed = args.notamText.trim();

  if (!trimmed) {
    return {
      extracted_notams: { notams: [], unformatted_notams: [] },
      unidentified_fields: ["extracted_notams"],
    };
  }

  const chunks = splitNotamText(trimmed, chunkSize);
  if (chunks.length === 0) {
    return {
      extracted_notams: { notams: [], unformatted_notams: [] },
      unidentified_fields: ["extracted_notams"],
    };
  }

  const settled = await Promise.allSettled(
    chunks.map((chunk) =>
      runNotamExtractionAgent({ anthropic: args.anthropic, notamText: chunk }),
    ),
  );

  const successes: NotamExtractionPartial[] = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    if (r.status === "fulfilled") {
      successes.push(r.value);
    } else {
      console.error(`[notam-chunk ${i + 1}/${settled.length}]`, r.reason);
    }
  }

  if (successes.length === 0) {
    throw new Error(
      `[notam-extraction-chunks] All ${settled.length} chunk extractions failed.`,
    );
  }

  return mergeNotamExtractionPartials(successes);
}
