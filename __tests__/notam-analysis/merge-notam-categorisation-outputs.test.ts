import { describe, expect, it } from "vitest";

import { mergeNotamCategorisationLlmOutputs } from "@/lib/notam-analysis/merge-notam-categorisation-outputs";
import type { NotamCategorisationLlmOutput } from "@/lib/notam-analysis/notam-categorisation-schema";

describe("mergeNotamCategorisationLlmOutputs", () => {
  it("concatenates categories in chunk order", () => {
    const a: NotamCategorisationLlmOutput = {
      cat1: [{ i: "A/1", s: "a1" }],
      cat2: [{ i: "A/2", s: "a2" }],
      cat3: [],
    };
    const b: NotamCategorisationLlmOutput = {
      cat1: [],
      cat2: [{ i: "B/1", s: "b1" }],
      cat3: [{ i: "B/2", s: "b2" }],
    };
    const m = mergeNotamCategorisationLlmOutputs([a, b]);
    expect(m.cat1).toEqual([{ i: "A/1", s: "a1" }]);
    expect(m.cat2).toEqual([
      { i: "A/2", s: "a2" },
      { i: "B/1", s: "b1" },
    ]);
    expect(m.cat3).toEqual([{ i: "B/2", s: "b2" }]);
  });

  it("drops duplicate ids on later encounters", () => {
    const a: NotamCategorisationLlmOutput = {
      cat1: [{ i: "X/1", s: "first" }],
      cat2: [],
      cat3: [],
    };
    const b: NotamCategorisationLlmOutput = {
      cat1: [{ i: "X/1", s: "ignored" }],
      cat2: [],
      cat3: [],
    };
    const m = mergeNotamCategorisationLlmOutputs([a, b]);
    expect(m.cat1).toEqual([{ i: "X/1", s: "first" }]);
  });

  it("skips a duplicate id that appears again in a later category within the same chunk", () => {
    const o: NotamCategorisationLlmOutput = {
      cat1: [{ i: "D/1", s: "in cat1" }],
      cat2: [{ i: "D/1", s: "dup" }],
      cat3: [],
    };
    const m = mergeNotamCategorisationLlmOutputs([o]);
    expect(m.cat1).toEqual([{ i: "D/1", s: "in cat1" }]);
    expect(m.cat2).toEqual([]);
  });
});
