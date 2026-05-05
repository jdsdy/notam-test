import { describe, expect, it } from "vitest";

import { buildAnalysedNotamsFromLlmCategories } from "@/lib/notam-analysis/merge-llm-notam-categories";
import type { NotamCategorisationLlmOutput } from "@/lib/notam-analysis/notam-categorisation-schema";
import type { RawNotamsPayload } from "@/lib/notams";

describe("buildAnalysedNotamsFromLlmCategories", () => {
  it("adds category and summary from cat1–cat3 and preserves unformatted_notams", () => {
    const raw: RawNotamsPayload = {
      notams: [
        {
          id: "C123/1",
          title: "T1",
          q: null,
          a: null,
          b: null,
          c: null,
          e: null,
        },
        {
          id: "C123/2",
          title: "T2",
          q: null,
          a: null,
          b: null,
          c: null,
          e: null,
        },
        {
          id: "C123/3",
          title: "T3",
          q: null,
          a: null,
          b: null,
          c: null,
          e: null,
        },
      ],
      unformatted_notams: ["RAW A", "RAW B"],
    };

    const llm: NotamCategorisationLlmOutput = {
      cat1: [{ i: "C123/1", s: "SUMMARY 1" }],
      cat2: [{ i: "C123/2", s: "SUMMARY 2" }],
      cat3: [{ i: "C123/3", s: "SUMMARY 3" }],
    };

    const out = buildAnalysedNotamsFromLlmCategories(raw, llm);

    expect(out.unformatted_notams).toEqual(["RAW A", "RAW B"]);
    expect(out.notams).toHaveLength(3);
    expect(out.notams[0]).toMatchObject({
      id: "C123/1",
      category: 1,
      summary: "SUMMARY 1",
    });
    expect(out.notams[1]).toMatchObject({
      id: "C123/2",
      category: 2,
      summary: "SUMMARY 2",
    });
    expect(out.notams[2]).toMatchObject({
      id: "C123/3",
      category: 3,
      summary: "SUMMARY 3",
    });
  });

  it("prefers the first category when the same id appears in multiple lists", () => {
    const raw: RawNotamsPayload = {
      notams: [
        {
          id: "X/1",
          title: "",
          q: null,
          a: null,
          b: null,
          c: null,
          e: null,
        },
      ],
      unformatted_notams: [],
    };
    const llm: NotamCategorisationLlmOutput = {
      cat1: [{ i: "X/1", s: "from cat1" }],
      cat2: [{ i: "X/1", s: "from cat2" }],
      cat3: [],
    };
    const out = buildAnalysedNotamsFromLlmCategories(raw, llm);
    expect(out.notams[0]?.category).toBe(1);
    expect(out.notams[0]?.summary).toBe("from cat1");
  });

  it("assigns category 3 and a fixed message when the model omits a notam id", () => {
    const raw: RawNotamsPayload = {
      notams: [
        {
          id: "ONLY/1",
          title: "",
          q: null,
          a: null,
          b: null,
          c: null,
          e: null,
        },
      ],
      unformatted_notams: [],
    };
    const llm: NotamCategorisationLlmOutput = {
      cat1: [],
      cat2: [],
      cat3: [],
    };
    const out = buildAnalysedNotamsFromLlmCategories(raw, llm);
    expect(out.notams[0]?.category).toBe(3);
    expect(out.notams[0]?.summary).toContain("No model");
  });
});
