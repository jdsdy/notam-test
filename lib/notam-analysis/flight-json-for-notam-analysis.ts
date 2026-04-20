/** Flight + aircraft context sent to the NOTAM categorisation model (without `notams`). */
export type NotamAnalysisAgentContext = {
  departure_icao: string | null;
  arrival_icao: string | null;
  /** From `aircraft.manufacturer`. */
  aircraft_manufacturer: string | null;
  /** From `aircraft.type` (model designation). */
  aircraft_model: string | null;
  aircraft_weight: number | null;
  /** Meters; from `aircraft.wingspan`. */
  aircraft_wingspan: number | null;
  departure_time: string | null;
  arrival_time: string | null;
  time_enroute: number | null;
  departure_rwy: string | null;
  arrival_rwy: string | null;
  route: string | null;
  flight_metadata: Record<string, unknown>;
};

export type FlightRowForNotamAnalysis = {
  departure_icao: string | null;
  arrival_icao: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  time_enroute: number | null;
  departure_rwy: string | null;
  arrival_rwy: string | null;
  route: string | null;
  aircraft_weight: number | null;
  flight_metadata: Record<string, unknown> | null;
};

export type AircraftForNotamAnalysis = {
  manufacturer: string | null;
  type: string | null;
  wingspan: unknown;
};

function normaliseDbString(value: string | null | undefined): string | null {
  const t = (value ?? "").trim();
  return t.length > 0 ? t : null;
}

function parseWingspanMeters(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Builds the top-level flight/aircraft JSON for the NOTAM analysis agent
 * (caller merges `notams` for the full request body).
 */
export function buildNotamAnalysisAgentContext(args: {
  flight: FlightRowForNotamAnalysis;
  aircraft: AircraftForNotamAnalysis | null;
}): NotamAnalysisAgentContext {
  const { flight, aircraft } = args;
  const meta = flight.flight_metadata;
  const flight_metadata =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? { ...meta }
      : {};

  const aircraft_manufacturer = aircraft
    ? normaliseDbString(aircraft.manufacturer)
    : null;
  const aircraft_model = aircraft ? normaliseDbString(aircraft.type) : null;

  const aircraft_wingspan = aircraft
    ? parseWingspanMeters(aircraft.wingspan)
    : null;

  return {
    departure_icao: flight.departure_icao,
    arrival_icao: flight.arrival_icao,
    aircraft_manufacturer,
    aircraft_model,
    aircraft_weight: flight.aircraft_weight,
    aircraft_wingspan,
    departure_time: flight.departure_time,
    arrival_time: flight.arrival_time,
    time_enroute: flight.time_enroute,
    departure_rwy: flight.departure_rwy,
    arrival_rwy: flight.arrival_rwy,
    route: flight.route,
    flight_metadata,
  };
}
