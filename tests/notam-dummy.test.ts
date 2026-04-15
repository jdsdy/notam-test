import { describe, expect, it } from "vitest";

import { buildDummyNotamResponse } from "@/lib/notams/dummy";

describe("dummy NOTAM response", () => {
  it("returns exactly three severity buckets", () => {
    const response = buildDummyNotamResponse("briefing.pdf");

    expect(response.categories.map((item) => item.category)).toEqual([
      "Category 1",
      "Category 2",
      "Category 3",
    ]);
  });

  it("includes expanded detail payload for each NOTAM item", () => {
    const response = buildDummyNotamResponse("briefing.pdf");
    const notam = response.categories.flatMap((item) => item.items)[0];

    expect(notam.summary.length).toBeGreaterThan(10);
    expect(notam.detail.operationalImpact.length).toBeGreaterThan(10);
    expect(notam.sourceDocument).toBe("briefing.pdf");
  });
});
