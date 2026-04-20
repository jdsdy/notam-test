import { z } from "zod";

const catEntrySchema = z.object({
  i: z.string(),
  s: z.string(),
});

/** Structured JSON returned by the NOTAM categorisation model. */
export const notamCategorisationLlmOutputSchema = z.object({
  cat1: z.array(catEntrySchema),
  cat2: z.array(catEntrySchema),
  cat3: z.array(catEntrySchema),
});

export type NotamCategorisationLlmOutput = z.infer<
  typeof notamCategorisationLlmOutputSchema
>;
