import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { FlightPlanParsedFields } from "@/lib/flight-plan-parse";
import { isFlightStatus } from "@/lib/flight-status";
import { buildNotamAnalysisAgentContext } from "@/lib/notam-analysis/flight-json-for-notam-analysis";
import { buildAnalysedNotamsFromLlmCategories } from "@/lib/notam-analysis/merge-llm-notam-categories";
import { runNotamCategorisationOnStructuredNotamChunks } from "@/lib/notam-analysis/run-notam-categorisation-chunks";
import {
  parseRawNotamsFromFlightPlanJson,
  type AnalysedNotamsPayload,
  type RawNotamsPayload,
} from "@/lib/notams";

const RAW_NOTAMS_EXTRACTION_STATUS_KEY = "_status";
const RAW_NOTAMS_EXTRACTION_STATUS_EXTRACTING = "extracting";

export type ApplyParsedFlightPlanResult =
  | { ok: true }
  | { ok: false; error: string };

/** Writes parser output to `flights` (same columns as manual save). */
export async function applyParsedFlightPlanToFlight(
  supabase: SupabaseClient,
  flightId: string,
  organisationId: string,
  fields: FlightPlanParsedFields,
): Promise<ApplyParsedFlightPlanResult> {
  const statusVal = fields.status?.trim() || null;
  if (statusVal && !isFlightStatus(statusVal)) {
    return {
      ok: false,
      error:
        "Status must be one of: draft, filled, in-progress, complete, cancelled.",
    };
  }

  const updatePayload: Record<string, unknown> = {
    departure_icao: fields.departure_icao?.trim() || null,
    arrival_icao: fields.arrival_icao?.trim() || null,
    departure_time: fields.departure_time,
    arrival_time: fields.arrival_time,
    time_enroute: fields.time_enroute,
    departure_rwy: fields.departure_rwy?.trim() || null,
    arrival_rwy: fields.arrival_rwy?.trim() || null,
    route: fields.route?.trim() || null,
    aircraft_weight: fields.aircraft_weight,
    status: statusVal,
    flight_plan_json: fields.flight_plan_json,
  };

  if ("flight_metadata" in fields) {
    updatePayload.flight_metadata = fields.flight_metadata ?? null;
  }
  if ("pdf_file_id" in fields) {
    updatePayload.pdf_file_id = fields.pdf_file_id?.trim() || null;
  }

  const { error } = await supabase
    .from("flights")
    .update(updatePayload)
    .eq("id", flightId)
    .eq("organisation_id", organisationId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Stores raw NOTAMs in `notam_analyses` with no AI output yet.
 * Reuses the pending row for this flight when one exists; otherwise inserts.
 */
export async function upsertPendingNotamAnalysis(
  supabase: SupabaseClient,
  flightId: string,
  rawPayload: RawNotamsPayload | null,
): Promise<{ notamAnalysisId: string | null }> {
  const { data: pending } = await supabase
    .from("notam_analyses")
    .select("id")
    .eq("flight_id", flightId)
    .is("analysed_notams", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasFormattedNotams = (rawPayload?.notams.length ?? 0) > 0;
  const hasUnformattedNotams = (rawPayload?.unformatted_notams.length ?? 0) > 0;
  if (!hasFormattedNotams && !hasUnformattedNotams) {
    if (pending?.id) {
      await supabase.from("notam_analyses").delete().eq("id", pending.id as string);
    }
    return { notamAnalysisId: null };
  }

  if (pending?.id) {
    const { error } = await supabase
      .from("notam_analyses")
      .update({ raw_notams: rawPayload })
      .eq("id", pending.id as string);
    if (error) {
      return { notamAnalysisId: null };
    }
    return { notamAnalysisId: pending.id as string };
  }

  const id = crypto.randomUUID();
  const { error: insertErr } = await supabase.from("notam_analyses").insert({
    id,
    flight_id: flightId,
    raw_notams: rawPayload,
    analysed_notams: null,
  });
  if (insertErr) {
    return { notamAnalysisId: null };
  }
  return { notamAnalysisId: id };
}

/**
 * Marks the latest pending NOTAM row for this flight as "extracting", or
 * creates one if it does not exist yet. Used to drive UI loading state while
 * background NOTAM extraction is still running.
 */
export async function markPendingNotamExtraction(
  supabase: SupabaseClient,
  flightId: string,
): Promise<{ notamAnalysisId: string | null }> {
  const extractionMarker = {
    [RAW_NOTAMS_EXTRACTION_STATUS_KEY]: RAW_NOTAMS_EXTRACTION_STATUS_EXTRACTING,
    notams: [],
  };

  const { data: pending } = await supabase
    .from("notam_analyses")
    .select("id")
    .eq("flight_id", flightId)
    .is("analysed_notams", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending?.id) {
    const { error } = await supabase
      .from("notam_analyses")
      .update({ raw_notams: extractionMarker })
      .eq("id", pending.id as string);
    if (error) {
      return { notamAnalysisId: null };
    }
    return { notamAnalysisId: pending.id as string };
  }

  const id = crypto.randomUUID();
  const { error: insertErr } = await supabase.from("notam_analyses").insert({
    id,
    flight_id: flightId,
    raw_notams: extractionMarker,
    analysed_notams: null,
  });
  if (insertErr) {
    return { notamAnalysisId: null };
  }

  return { notamAnalysisId: id };
}

/** Keeps pending extraction in sync when the user edits saved flight plan JSON. */
export async function syncPendingNotamAnalysisRawFromFlightJson(
  supabase: SupabaseClient,
  flightId: string,
  flightPlanJson: Record<string, unknown> | null,
): Promise<void> {
  const { data: pending } = await supabase
    .from("notam_analyses")
    .select("id")
    .eq("flight_id", flightId)
    .is("analysed_notams", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending?.id) return;

  const rawPayload = parseRawNotamsFromFlightPlanJson(flightPlanJson);
  if (!rawPayload?.notams.length) {
    await supabase.from("notam_analyses").delete().eq("id", pending.id as string);
    return;
  }

  await supabase
    .from("notam_analyses")
    .update({ raw_notams: rawPayload })
    .eq("id", pending.id as string);
}

export type RunNotamAnalysisServiceResult =
  | { ok: true; analysisId: string; analysed: AnalysedNotamsPayload }
  | { ok: false; error: string };

export type RunNotamAnalysisForFlightDeps = {
  /** Injected in tests; defaults to a new client using `ANTHROPIC_API_KEY`. */
  anthropic?: Anthropic;
};

/**
 * Loads the flight (scoped to organisation), pending `raw_notams`, runs Claude
 * categorisation on structured NOTAMs only, merges summaries, persists `analysed_notams`.
 */
export async function runNotamAnalysisForFlight(
  supabase: SupabaseClient,
  flightId: string,
  organisationId: string,
  deps?: RunNotamAnalysisForFlightDeps,
): Promise<RunNotamAnalysisServiceResult> {
  const { data: flight, error: flightErr } = await supabase
    .from("flights")
    .select(
      "aircraft_id, departure_icao, arrival_icao, departure_time, arrival_time, time_enroute, departure_rwy, arrival_rwy, route, aircraft_weight, flight_metadata",
    )
    .eq("id", flightId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (flightErr || !flight) {
    return {
      ok: false,
      error: "Flight not found for this organisation.",
    };
  }

  const aircraftId = flight.aircraft_id as string | null | undefined;
  const { data: aircraftRow } =
    aircraftId != null && aircraftId !== ""
      ? await supabase
          .from("aircraft")
          .select("manufacturer, type, wingspan")
          .eq("id", aircraftId)
          .eq("organisation_id", organisationId)
          .maybeSingle()
      : { data: null };

  const aircraft =
    aircraftRow &&
    typeof aircraftRow === "object" &&
    !Array.isArray(aircraftRow)
      ? {
          manufacturer: (aircraftRow.manufacturer as string | null) ?? null,
          type: (aircraftRow.type as string | null) ?? null,
          wingspan: aircraftRow.wingspan,
        }
      : null;

  const { data: pending, error: loadErr } = await supabase
    .from("notam_analyses")
    .select("id, raw_notams")
    .eq("flight_id", flightId)
    .is("analysed_notams", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loadErr || !pending) {
    return {
      ok: false,
      error:
        "No pending NOTAM extraction found. Upload and parse a flight plan first.",
    };
  }

  const rawSource =
    pending.raw_notams &&
    typeof pending.raw_notams === "object" &&
    !Array.isArray(pending.raw_notams)
      ? (pending.raw_notams as Record<string, unknown>)
      : null;

  if (
    rawSource?.[RAW_NOTAMS_EXTRACTION_STATUS_KEY] ===
    RAW_NOTAMS_EXTRACTION_STATUS_EXTRACTING
  ) {
    return {
      ok: false,
      error:
        "NOTAM extraction is still in progress. Wait for extraction to finish before analysing.",
    };
  }

  const rawPayload = parseRawNotamsFromFlightPlanJson(rawSource);
  if (!rawPayload?.notams.length) {
    return {
      ok: false,
      error: "Pending NOTAM extraction is empty. Edit flight plan JSON and save.",
    };
  }

  let anthropic = deps?.anthropic;
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "ANTHROPIC_API_KEY is not configured.",
      };
    }
    anthropic = new Anthropic({ apiKey });
  }

  const agentContext = buildNotamAnalysisAgentContext({
    flight: {
      departure_icao: (flight.departure_icao as string | null) ?? null,
      arrival_icao: (flight.arrival_icao as string | null) ?? null,
      departure_time: (flight.departure_time as string | null) ?? null,
      arrival_time: (flight.arrival_time as string | null) ?? null,
      time_enroute: (flight.time_enroute as number | null) ?? null,
      departure_rwy: (flight.departure_rwy as string | null) ?? null,
      arrival_rwy: (flight.arrival_rwy as string | null) ?? null,
      route: (flight.route as string | null) ?? null,
      aircraft_weight: (flight.aircraft_weight as number | null) ?? null,
      flight_metadata:
        flight.flight_metadata &&
        typeof flight.flight_metadata === "object" &&
        !Array.isArray(flight.flight_metadata)
          ? (flight.flight_metadata as Record<string, unknown>)
          : null,
    },
    aircraft,
  });

  let llmOut;
  try {
    llmOut = await runNotamCategorisationOnStructuredNotamChunks({
      anthropic,
      agentContext,
      notams: rawPayload.notams,
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return {
        ok: false,
        error: `Anthropic request failed: ${error.message}`,
      };
    }
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `NOTAM analysis failed: ${reason}`,
    };
  }

  const analysed = buildAnalysedNotamsFromLlmCategories(rawPayload, llmOut);

  const { error: updateErr } = await supabase
    .from("notam_analyses")
    .update({ analysed_notams: analysed })
    .eq("id", pending.id as string)
    .eq("flight_id", flightId);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  return {
    ok: true,
    analysisId: pending.id as string,
    analysed,
  };
}
