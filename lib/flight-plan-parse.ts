import type { SplitterResult } from "@/lib/flight-plan/schemas";
import type { RawNotam } from "@/lib/notams";

/** Fields extracted from a flight plan PDF and persisted to `flights`. */
export type FlightPlanParsedFields = {
  departure_icao: string | null;
  arrival_icao: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  time_enroute: number | null;
  departure_rwy: string | null;
  arrival_rwy: string | null;
  route: string | null;
  aircraft_weight: number | null;
  status: string | null;
  flight_plan_json: Record<string, unknown> | null;
  /** Supplemental extraction notes useful for NOTAM analysis and operator context. */
  flight_metadata?: Record<string, unknown> | null;
  /** UUID for the uploaded flight plan PDF in Supabase Storage (`flight_plan_uploads`). */
  pdf_file_id?: string | null;
};

/** Fields the parser may list in `unidentified_fields` (excludes pilot-set `status`). */
export const FLIGHT_PLAN_PARSER_UNIDENTIFIED_FIELDS = [
  "departure_icao",
  "arrival_icao",
  "departure_time",
  "arrival_time",
  "time_enroute",
  "departure_rwy",
  "arrival_rwy",
  "route",
  "aircraft_weight",
  "flight_plan_json",
] as const;

export type FlightPlanParserUnidentifiedFieldKey =
  (typeof FLIGHT_PLAN_PARSER_UNIDENTIFIED_FIELDS)[number];

/** Fields that map to editable form inputs in the flight workspace (includes manual status). */
export const FLIGHT_PLAN_REVIEWABLE_FIELDS = [
  ...FLIGHT_PLAN_PARSER_UNIDENTIFIED_FIELDS,
  "status",
] as const;

export type FlightPlanFieldKey = (typeof FLIGHT_PLAN_REVIEWABLE_FIELDS)[number];

export type FlightPlanParseApiResponse = {
  ok: true;
  fields: FlightPlanParsedFields;
  /** Fields the parser could not determine reliably — highlight in the UI. */
  needsManualReview: FlightPlanFieldKey[];
  /** DB row for this extraction (`notam_analyses`) when NOTAMs were stored. */
  notamAnalysisId: string | null;
  /** Same NOTAM list as in `fields.flight_plan_json` — convenient for UI badges without re-parsing. */
  notamsIdentified: RawNotam[];
};

/** Response from `POST /api/flights/[flightId]/parse/identify-flight-plan`. */
export type IdentifyFlightPlanApiResponse = {
  ok: true;
  planPdfUuid: string;
  splitterResult: SplitterResult;
  totalPages: number;
};

/** Response from `POST /api/flights/[flightId]/parse/extract-flight-plan`. */
export type ExtractFlightPlanApiResponse = {
  ok: true;
  fields: FlightPlanParsedFields;
  needsManualReview: FlightPlanFieldKey[];
};

/** Response from `POST /api/flights/[flightId]/parse/extract-notams`. */
export type ExtractNotamsFromPlanApiResponse = {
  ok: true;
  notamAnalysisId: string | null;
};

/** Fills API response metadata after persistence (IDs come from the database). */
export function withParseResponseMeta(
  base: FlightPlanParseApiResponse,
  meta: { notamAnalysisId: string | null; notamsIdentified: RawNotam[] },
): FlightPlanParseApiResponse {
  return {
    ...base,
    notamAnalysisId: meta.notamAnalysisId,
    notamsIdentified: meta.notamsIdentified,
  };
}
