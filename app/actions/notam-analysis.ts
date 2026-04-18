"use server";

import { revalidatePath } from "next/cache";

import { runNotamAnalysisForFlight } from "@/lib/notam-analysis-service";
import { assertUserCanAccessFlight } from "@/lib/flights";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export type RunNotamAnalysisResult =
  | { ok: true; analysisId: string }
  | { ok: false; error: string };

/** Thin server action wrapper — prefer `POST /api/flights/[flightId]/analyse-notams` from the client. */
export async function runNotamAnalysisAction(input: {
  organisationId: string;
  flightId: string;
}): Promise<RunNotamAnalysisResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const access = await assertUserCanAccessFlight(user.id, input.flightId);
  if (!access || access.organisationId !== input.organisationId) {
    return { ok: false, error: "Flight not found or access denied." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await runNotamAnalysisForFlight(supabase, input.flightId);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/organisations/${input.organisationId}`);
  revalidatePath(
    `/organisations/${input.organisationId}/flights/${input.flightId}`,
  );

  return { ok: true, analysisId: result.analysisId };
}
