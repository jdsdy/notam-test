"use server";

import { revalidatePath } from "next/cache";

import {
  assertAircraftBelongsToOrganisation,
  assertPicIsMemberOfOrganisation,
  assertUserCanAccessFlight,
} from "@/lib/flights";
import { assertOrgAccess } from "@/lib/organisations";
import type { FlightPlanParsedFields } from "@/lib/flight-plan-parse";
import { isFlightStatus } from "@/lib/flight-status";
import { parseUtcFieldToIso } from "@/lib/flight-time-utc";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export type CreateFlightResult = { error: string } | { flightId: string };

export async function createFlightAction(input: {
  organisationId: string;
  aircraftId: string;
  picId: string;
}): Promise<CreateFlightResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const canAccessOrg = await assertOrgAccess(user.id, input.organisationId);
  if (!canAccessOrg) {
    return { error: "You do not have access to this organisation." };
  }

  const [aircraftOk, picOk] = await Promise.all([
    assertAircraftBelongsToOrganisation(input.aircraftId, input.organisationId),
    assertPicIsMemberOfOrganisation(input.picId, input.organisationId),
  ]);

  if (!aircraftOk) {
    return { error: "That aircraft is not in this organisation’s fleet." };
  }
  if (!picOk) {
    return { error: "The selected PIC must be a member of this organisation." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("flights")
    .insert({
      organisation_id: input.organisationId,
      aircraft_id: input.aircraftId,
      pic_id: input.picId,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { error: error?.message ?? "Could not create flight." };
  }

  const flightId = data.id as string;
  revalidatePath(`/organisations/${input.organisationId}`);
  return { flightId };
}

function parseOptionalInt(value: string): number | null {
  const t = value.trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export type UpdateFlightPlanFieldsResult = { error: string | null };

export async function updateFlightPlanFieldsAction(input: {
  organisationId: string;
  flightId: string;
  fields: FlightPlanParsedFields;
}): Promise<UpdateFlightPlanFieldsResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const access = await assertUserCanAccessFlight(user.id, input.flightId);
  if (!access || access.organisationId !== input.organisationId) {
    return { error: "Flight not found or access denied." };
  }

  const statusVal = input.fields.status?.trim() || null;
  if (statusVal && !isFlightStatus(statusVal)) {
    return {
      error:
        "Status must be one of: draft, filled, in-progress, complete, cancelled.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("flights")
    .update({
      departure_icao: input.fields.departure_icao?.trim() || null,
      arrival_icao: input.fields.arrival_icao?.trim() || null,
      departure_time: input.fields.departure_time,
      arrival_time: input.fields.arrival_time,
      time_enroute: input.fields.time_enroute,
      departure_rwy: input.fields.departure_rwy?.trim() || null,
      arrival_rwy: input.fields.arrival_rwy?.trim() || null,
      route: input.fields.route?.trim() || null,
      aircraft_weight: input.fields.aircraft_weight,
      status: statusVal,
      flight_plan_pdf_text: input.fields.flight_plan_pdf_text?.trim() || null,
      flight_plan_json: input.fields.flight_plan_json,
    })
    .eq("id", input.flightId)
    .eq("organisation_id", input.organisationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/organisations/${input.organisationId}`);
  revalidatePath(`/organisations/${input.organisationId}/flights/${input.flightId}`);
  return { error: null };
}

/** Accepts raw form strings and coerces to DB-friendly values. */
export async function updateFlightPlanFieldsFromFormAction(input: {
  organisationId: string;
  flightId: string;
  departure_icao: string;
  arrival_icao: string;
  departure_time: string;
  arrival_time: string;
  time_enroute: string;
  departure_rwy: string;
  arrival_rwy: string;
  route: string;
  aircraft_weight: string;
  status: string;
  flight_plan_pdf_text: string;
  flight_plan_json: string;
}): Promise<UpdateFlightPlanFieldsResult> {
  let flight_plan_json: Record<string, unknown> | null = null;
  const rawJson = input.flight_plan_json.trim();
  if (rawJson) {
    try {
      const parsed: unknown = JSON.parse(rawJson);
      flight_plan_json =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;
    } catch {
      return { error: "Flight plan JSON must be valid JSON or empty." };
    }
  }

  const fields: FlightPlanParsedFields = {
    departure_icao: input.departure_icao.trim() || null,
    arrival_icao: input.arrival_icao.trim() || null,
    departure_time: parseUtcFieldToIso(input.departure_time),
    arrival_time: parseUtcFieldToIso(input.arrival_time),
    time_enroute: parseOptionalInt(input.time_enroute),
    departure_rwy: input.departure_rwy.trim() || null,
    arrival_rwy: input.arrival_rwy.trim() || null,
    route: input.route.trim() || null,
    aircraft_weight: parseOptionalInt(input.aircraft_weight),
    status: input.status.trim() || null,
    flight_plan_pdf_text: input.flight_plan_pdf_text.trim() || null,
    flight_plan_json,
  };

  return updateFlightPlanFieldsAction({
    organisationId: input.organisationId,
    flightId: input.flightId,
    fields,
  });
}
