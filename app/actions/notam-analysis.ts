"use server";

import { revalidatePath } from "next/cache";

import { assertUserCanAccessFlight } from "@/lib/flights";
import {
  buildSimulatedAnalysedNotams,
  parseRawNotamsFromFlightPlanJson,
  type RawNotamsPayload,
} from "@/lib/notams";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export type RunNotamAnalysisResult =
  | { ok: true; analysisId: string }
  | { ok: false; error: string };

const ANALYSIS_DELAY_MS = 2600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
  const { data: flight, error: flightErr } = await supabase
    .from("flights")
    .select("flight_plan_json")
    .eq("id", input.flightId)
    .eq("organisation_id", input.organisationId)
    .maybeSingle();

  if (flightErr || !flight) {
    return { ok: false, error: "Could not load flight." };
  }

  const json = flight.flight_plan_json;
  const normalized =
    json && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : null;

  const rawPayload: RawNotamsPayload | null =
    parseRawNotamsFromFlightPlanJson(normalized);

  if (!rawPayload?.notams.length) {
    return {
      ok: false,
      error:
        "No NOTAMs were found on the saved flight plan. Parse or paste NOTAM JSON, then save flight details.",
    };
  }

  await sleep(ANALYSIS_DELAY_MS);

  const analysed = buildSimulatedAnalysedNotams(rawPayload);
  const analysisId = crypto.randomUUID();

  const { error: insertErr } = await supabase.from("notam_analyses").insert({
    id: analysisId,
    flight_id: input.flightId,
    raw_notams: rawPayload,
    analysed_notams: analysed,
  });

  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  revalidatePath(`/organisations/${input.organisationId}`);
  revalidatePath(
    `/organisations/${input.organisationId}/flights/${input.flightId}`,
  );

  return { ok: true, analysisId };
}
