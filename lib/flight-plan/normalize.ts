import {
  FLIGHT_PLAN_PARSER_UNIDENTIFIED_FIELDS,
  type FlightPlanFieldKey,
  type FlightPlanParsedFields,
  type FlightPlanParserUnidentifiedFieldKey,
} from "@/lib/flight-plan-parse";
import {
  flightPlanJsonSchema,
  flightPlanWaypointSchema,
  type ExtractedNotamNullFieldKey,
  type FlightPlanExtraction,
  type FlightPlanWaypointNullFieldKey,
} from "@/lib/flight-plan/schemas";
import type { RawNotamsPayload } from "@/lib/notams";
import type { z } from "zod";

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeIcao(value: string | null | undefined): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeJsonRecord(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!value || Array.isArray(value)) return null;
  return value;
}

function normalizeWaypoint(
  waypoint: z.infer<typeof flightPlanWaypointSchema>,
): Record<string, unknown> {
  const nulls = new Set<FlightPlanWaypointNullFieldKey>(waypoint.null_values);
  return {
    name: nulls.has("name") ? null : normalizeString(waypoint.name),
    latitude: nulls.has("latitude") ? null : waypoint.latitude,
    longitude: nulls.has("longitude") ? null : waypoint.longitude,
    flt: nulls.has("flt") ? null : normalizeString(waypoint.flt),
    tas: nulls.has("tas") ? null : waypoint.tas,
    grs: nulls.has("grs") ? null : waypoint.grs,
    awy: nulls.has("awy") ? null : normalizeString(waypoint.awy),
    "wind/comp": nulls.has("wind/comp")
      ? null
      : normalizeString(waypoint["wind/comp"]),
    mh: nulls.has("mh") ? null : waypoint.mh,
    mcrs: nulls.has("mcrs") ? null : waypoint.mcrs,
  };
}

export function normalizeFlightPlanJson(
  payload: z.infer<typeof flightPlanJsonSchema>,
): Record<string, unknown> {
  return {
    primary: payload.primary.map((waypoint) => normalizeWaypoint(waypoint)),
    alternate: payload.alternate.map((waypoint) => normalizeWaypoint(waypoint)),
  };
}

function applyManualReviewMask(
  fields: FlightPlanParsedFields,
  needsManualReview: FlightPlanFieldKey[],
): FlightPlanParsedFields {
  const masked = { ...fields };
  for (const field of needsManualReview) {
    switch (field) {
      case "departure_icao":
        masked.departure_icao = null;
        break;
      case "arrival_icao":
        masked.arrival_icao = null;
        break;
      case "departure_time":
        masked.departure_time = null;
        break;
      case "arrival_time":
        masked.arrival_time = null;
        break;
      case "time_enroute":
        masked.time_enroute = null;
        break;
      case "departure_rwy":
        masked.departure_rwy = null;
        break;
      case "arrival_rwy":
        masked.arrival_rwy = null;
        break;
      case "route":
        masked.route = null;
        break;
      case "aircraft_weight":
        masked.aircraft_weight = null;
        break;
      case "flight_plan_json":
        masked.flight_plan_json = null;
        break;
    }
  }
  return masked;
}

export function buildPersistedFields(
  extracted: FlightPlanExtraction,
  /** UUID used as the object name under `{organisation_id}/{uuid}.pdf` in `flight_plan_uploads`. */
  planPdfStorageUuid: string,
): { fields: FlightPlanParsedFields; needsManualReview: FlightPlanFieldKey[] } {
  const needsManualReview: FlightPlanParserUnidentifiedFieldKey[] = [
    ...new Set(
      extracted.unidentified_fields.filter(
        (value): value is FlightPlanParserUnidentifiedFieldKey =>
          (FLIGHT_PLAN_PARSER_UNIDENTIFIED_FIELDS as readonly string[]).includes(
            value,
          ),
      ),
    ),
  ];

  const normalized: FlightPlanParsedFields = {
    departure_icao: normalizeIcao(extracted.departure_icao),
    arrival_icao: normalizeIcao(extracted.arrival_icao),
    departure_time: normalizeString(extracted.departure_time),
    arrival_time: normalizeString(extracted.arrival_time),
    time_enroute: extracted.time_enroute ?? null,
    departure_rwy: normalizeString(extracted.departure_rwy),
    arrival_rwy: normalizeString(extracted.arrival_rwy),
    route: normalizeString(extracted.route),
    aircraft_weight: extracted.aircraft_weight ?? null,
    status: "draft",
    flight_plan_json: null,
    flight_metadata: normalizeJsonRecord(extracted.flight_metadata),
    pdf_file_id: normalizeString(planPdfStorageUuid),
  };

  return {
    fields: applyManualReviewMask(normalized, needsManualReview),
    needsManualReview,
  };
}

export function extractedNotamsToRawPayload(
  extracted: FlightPlanExtraction,
): RawNotamsPayload | null {
  const notams = extracted.extracted_notams.notams.map((notam) => {
    const nulls = new Set<ExtractedNotamNullFieldKey>(notam.null_values);
    return {
      id: nulls.has("id") ? null : normalizeString(notam.id),
      title: nulls.has("title") ? null : normalizeString(notam.title),
      q: nulls.has("q") ? null : normalizeString(notam.q),
      a: nulls.has("a") ? null : normalizeString(notam.a),
      b: nulls.has("b") ? null : normalizeString(notam.b),
      c: nulls.has("c") ? null : normalizeString(notam.c),
      d: nulls.has("d") ? null : normalizeString(notam.d),
      e: nulls.has("e") ? null : normalizeString(notam.e),
      f: nulls.has("f") ? null : normalizeString(notam.f),
      g: nulls.has("g") ? null : normalizeString(notam.g),
    };
  });
  const unformattedNotams = extracted.extracted_notams.unformatted_notams
    .map((value) => normalizeString(value))
    .filter((value): value is string => value != null);

  if (notams.length === 0 && unformattedNotams.length === 0) return null;

  return {
    notams,
    unformatted_notams: unformattedNotams,
  };
}
