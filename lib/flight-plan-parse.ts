import { DUMMY_FLIGHT_PLAN_NOTAMS } from "@/lib/notams";

/** Fields that can be filled from a flight plan PDF (excluding ids and timestamps). */
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
  flight_plan_pdf_text: string | null;
  flight_plan_json: Record<string, unknown> | null;
};

export type FlightPlanFieldKey = keyof FlightPlanParsedFields;

export type FlightPlanParseApiResponse = {
  ok: true;
  fields: FlightPlanParsedFields;
  /** Fields the parser could not determine reliably — highlight in the UI. */
  needsManualReview: FlightPlanFieldKey[];
};

export function buildDummyFlightPlanParseResponse(): FlightPlanParseApiResponse {
  const departure = new Date();
  departure.setUTCHours(14, 30, 0, 0);
  const arrival = new Date(departure);
  arrival.setUTCMinutes(arrival.getUTCMinutes() + 95);

  return {
    ok: true,
    fields: {
      departure_icao: "KPTK",
      arrival_icao: "KORD",
      departure_time: departure.toISOString(),
      arrival_time: null,
      time_enroute: null,
      departure_rwy: "09",
      arrival_rwy: null,
      route:
        "KPTK..ROGGE V97 SVM DCT EMMIE DCT KORD — sample route from dummy parser",
      aircraft_weight: 3850,
      status: "filled",
      flight_plan_pdf_text:
        "Dummy OCR text: filed IFR, alternate KCMI, EET 1+35, cruise FL240.",
      flight_plan_json: {
        source: "dummy",
        alternate: "KCMI",
        filedAltitudeFt: 24000,
        notams: DUMMY_FLIGHT_PLAN_NOTAMS,
      },
    },
    needsManualReview: [
      "arrival_time",
      "time_enroute",
      "arrival_rwy",
    ],
  };
}
