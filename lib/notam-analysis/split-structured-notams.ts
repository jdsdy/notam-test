import type { RawNotam } from "@/lib/notams";

/** Default number of structured NOTAM objects per categorisation agent call. */
export const DEFAULT_NOTAM_ANALYSIS_CHUNK_SIZE = 20;

/**
 * Partitions structured NOTAM rows into fixed-size chunks (same idea as
 * `splitNotamText` + chunking for extraction, but on parsed objects).
 */
export function splitStructuredNotamsForAnalysis(
  notams: RawNotam[],
  chunkSize: number = DEFAULT_NOTAM_ANALYSIS_CHUNK_SIZE,
): RawNotam[][] {
  if (notams.length === 0) return [];
  if (chunkSize < 1) {
    throw new Error("chunkSize must be at least 1.");
  }

  const chunks: RawNotam[][] = [];
  for (let i = 0; i < notams.length; i += chunkSize) {
    chunks.push(notams.slice(i, i + chunkSize));
  }
  return chunks;
}
