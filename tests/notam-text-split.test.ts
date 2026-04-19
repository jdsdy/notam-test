import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTAM_TEXT_CHUNK_SIZE,
  mergeNotamExtractionPartials,
  splitNotamText,
} from "@/lib/flight-plan/notam-text-split";

function notamStub(n: number): string {
  const id = `A${String(n).padStart(4, "0")}`;
  return `${id}/26 NOTAMN\nQ) TEST\nA) YSSY`;
}

describe("splitNotamText", () => {
  it("uses DEFAULT_NOTAM_TEXT_CHUNK_SIZE of 20", () => {
    expect(DEFAULT_NOTAM_TEXT_CHUNK_SIZE).toBe(20);
  });

  it("returns a single chunk when no ICAO NOTAM id lines are present", () => {
    const chunks = splitNotamText("NOTAM TEXT FROM PDF", 20);
    expect(chunks).toEqual(["NOTAM TEXT FROM PDF"]);
  });

  it("splits on ICAO NOTAM id lines and groups chunkSize segments per chunk", () => {
    const segments = Array.from({ length: 21 }, (_, i) => notamStub(i + 1));
    const raw = segments.join("\n");
    const chunks = splitNotamText(raw, 20);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain("A0001/26 NOTAMN");
    expect(chunks[0]).toContain("A0020/26 NOTAMN");
    expect(chunks[0]).not.toContain("A0021/26 NOTAMN");
    expect(chunks[1]).toContain("A0021/26 NOTAMN");
  });

  it("trims and returns empty array for blank input", () => {
    expect(splitNotamText("   \n  ", 20)).toEqual([]);
  });
});

describe("mergeNotamExtractionPartials", () => {
  it("concatenates notams and unions metadata without an LLM", () => {
    const merged = mergeNotamExtractionPartials([
      {
        extracted_notams: {
          notams: [
            {
              id: "A1/26",
              title: "T1",
              q: "q",
              a: "a",
              b: "b",
              c: "c",
              d: "null",
              e: "e",
              f: "null",
              g: "null",
              null_values: ["d", "f", "g"],
            },
          ],
          unformatted_notams: ["raw one"],
        },
        unidentified_fields: ["extracted_notams"],
      },
      {
        extracted_notams: {
          notams: [
            {
              id: "A2/26",
              title: "T2",
              q: "q",
              a: "a",
              b: "b",
              c: "c",
              d: "null",
              e: "e",
              f: "null",
              g: "null",
              null_values: ["d", "f", "g"],
            },
          ],
          unformatted_notams: ["raw one", "raw two"],
        },
        unidentified_fields: [],
      },
    ]);

    expect(merged.extracted_notams.notams).toHaveLength(2);
    expect(merged.extracted_notams.unformatted_notams).toEqual(["raw one", "raw two"]);
    expect(merged.unidentified_fields).toEqual(["extracted_notams"]);
  });
});
