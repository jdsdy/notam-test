import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTAM_ANALYSIS_CHUNK_SIZE,
  splitStructuredNotamsForAnalysis,
} from "@/lib/notam-analysis/split-structured-notams";
import type { RawNotam } from "@/lib/notams";

function makeNotam(id: string): RawNotam {
  return {
    id,
    title: "",
    q: null,
    a: null,
    b: null,
    c: null,
    e: null,
  };
}

describe("splitStructuredNotamsForAnalysis", () => {
  it("uses DEFAULT_NOTAM_ANALYSIS_CHUNK_SIZE of 20", () => {
    expect(DEFAULT_NOTAM_ANALYSIS_CHUNK_SIZE).toBe(20);
  });

  it("returns empty array for empty input", () => {
    expect(splitStructuredNotamsForAnalysis([])).toEqual([]);
  });

  it("groups up to chunkSize NOTAMs per chunk", () => {
    const notams = Array.from({ length: 21 }, (_, i) => makeNotam(`N${i}`));
    const chunks = splitStructuredNotamsForAnalysis(notams, 20);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(20);
    expect(chunks[1]).toHaveLength(1);
    expect(chunks[0]?.[0]?.id).toBe("N0");
    expect(chunks[1]?.[0]?.id).toBe("N20");
  });

  it("throws when chunkSize is below 1", () => {
    expect(() => splitStructuredNotamsForAnalysis([makeNotam("a")], 0)).toThrow(
      /chunkSize/,
    );
  });
});
