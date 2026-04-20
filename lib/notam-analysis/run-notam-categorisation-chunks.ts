import type Anthropic from "@anthropic-ai/sdk";

import type { NotamAnalysisAgentContext } from "@/lib/notam-analysis/flight-json-for-notam-analysis";
import { mergeNotamCategorisationLlmOutputs } from "@/lib/notam-analysis/merge-notam-categorisation-outputs";
import type { NotamCategorisationLlmOutput } from "@/lib/notam-analysis/notam-categorisation-schema";
import { runNotamCategorisationLlm } from "@/lib/notam-analysis/run-notam-categorisation-llm";
import {
  DEFAULT_NOTAM_ANALYSIS_CHUNK_SIZE,
  splitStructuredNotamsForAnalysis,
} from "@/lib/notam-analysis/split-structured-notams";
import type { RawNotam } from "@/lib/notams";

/**
 * Runs the NOTAM categorisation model once per structured-NOTAM chunk in parallel,
 * then merges `{ cat1, cat2, cat3 }` in code (same pattern as NOTAM text extraction).
 */
export async function runNotamCategorisationOnStructuredNotamChunks(args: {
  anthropic: Anthropic;
  agentContext: NotamAnalysisAgentContext;
  notams: RawNotam[];
  chunkSize?: number;
}): Promise<NotamCategorisationLlmOutput> {
  const chunkSize = args.chunkSize ?? DEFAULT_NOTAM_ANALYSIS_CHUNK_SIZE;
  const chunks = splitStructuredNotamsForAnalysis(args.notams, chunkSize);

  if (chunks.length === 0) {
    return { cat1: [], cat2: [], cat3: [] };
  }

  const settled = await Promise.allSettled(
    chunks.map((chunk) =>
      runNotamCategorisationLlm(args.anthropic, {
        agentContext: args.agentContext,
        structuredNotams: { notams: chunk },
      }),
    ),
  );

  const successes: NotamCategorisationLlmOutput[] = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    if (r.status === "fulfilled") {
      successes.push(r.value);
    } else {
      console.error(`[notam-analysis-chunk ${i + 1}/${settled.length}]`, r.reason);
    }
  }

  if (successes.length === 0) {
    throw new Error(
      `[notam-analysis-chunks] All ${settled.length} chunk categorisations failed.`,
    );
  }

  return mergeNotamCategorisationLlmOutputs(successes);
}
