import type { NotamCategorisationLlmOutput } from "@/lib/notam-analysis/notam-categorisation-schema";

type CatEntry = { i: string; s: string };

/**
 * Merges chunk-level categorisation JSON into one object (no LLM).
 * Duplicate NOTAM ids (same trimmed `i`) keep the first occurrence in scan order:
 * outputs in array order, within each output cat1 then cat2 then cat3.
 */
export function mergeNotamCategorisationLlmOutputs(
  outputs: NotamCategorisationLlmOutput[],
): NotamCategorisationLlmOutput {
  const seen = new Set<string>();
  const cat1: CatEntry[] = [];
  const cat2: CatEntry[] = [];
  const cat3: CatEntry[] = [];

  function pushUnique(target: CatEntry[], entries: CatEntry[]) {
    for (const e of entries) {
      const k = e.i.trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      target.push(e);
    }
  }

  for (const o of outputs) {
    pushUnique(cat1, o.cat1);
    pushUnique(cat2, o.cat2);
    pushUnique(cat3, o.cat3);
  }

  return { cat1, cat2, cat3 };
}
