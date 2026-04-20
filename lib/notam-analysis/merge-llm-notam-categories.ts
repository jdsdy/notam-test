import type { NotamCategorisationLlmOutput } from "@/lib/notam-analysis/notam-categorisation-schema";
import type { AnalysedNotamsPayload, AnalysedNotam, RawNotamsPayload } from "@/lib/notams";

const UNCATEGORISED_SUMMARY =
  "No model summary was returned for this NOTAM id; confirm relevance manually.";

function buildIdToCategoryMap(
  llm: NotamCategorisationLlmOutput,
): Map<string, { category: 1 | 2 | 3; summary: string }> {
  const map = new Map<string, { category: 1 | 2 | 3; summary: string }>();
  const ordered: Array<[1 | 2 | 3, NotamCategorisationLlmOutput["cat1"]]> = [
    [1, llm.cat1],
    [2, llm.cat2],
    [3, llm.cat3],
  ];
  for (const [category, entries] of ordered) {
    for (const { i, s } of entries) {
      const id = i.trim();
      if (!id || map.has(id)) continue;
      map.set(id, { category, summary: s });
    }
  }
  return map;
}

/**
 * Merges LLM categorisation (cat1–cat3 with `i` / `s`) into structured NOTAM rows.
 * Preserves `unformatted_notams` from the raw payload without sending them to the model.
 */
export function buildAnalysedNotamsFromLlmCategories(
  raw: RawNotamsPayload,
  llm: NotamCategorisationLlmOutput,
): AnalysedNotamsPayload {
  const idMap = buildIdToCategoryMap(llm);

  const notams: AnalysedNotam[] = raw.notams.map((n) => {
    const key = (n.id ?? "").trim();
    const hit = key ? idMap.get(key) : undefined;
    if (hit) {
      return { ...n, category: hit.category, summary: hit.summary };
    }
    return {
      ...n,
      category: 3,
      summary: UNCATEGORISED_SUMMARY,
    };
  });

  return {
    notams,
    unformatted_notams: [...raw.unformatted_notams],
  };
}
