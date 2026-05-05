import { describe, expect, it } from "vitest";

import { buildNotamAnalysisAgentContext } from "@/lib/notam-analysis/flight-json-for-notam-analysis";

describe("buildNotamAnalysisAgentContext", () => {
  it("maps flight and aircraft to the NOTAM agent JSON shape", () => {
    const json = buildNotamAnalysisAgentContext({
      flight: {
        departure_icao: "YSSY",
        arrival_icao: "YBBN",
        departure_time: "2026-04-25T09:10:00.000Z",
        arrival_time: "2026-04-25T17:10:06.000Z",
        time_enroute: 56,
        departure_rwy: "34L",
        arrival_rwy: "01R",
        route: "DCT",
        aircraft_weight: 67883,
        flight_metadata: {
          cruise_altitude: "FL450",
          total_fuel_required: 9553,
        },
      },
      aircraft: {
        manufacturer: "Gulfstream",
        type: "G700",
        wingspan: 31.39,
      },
    });

    expect(json).toEqual({
      departure_icao: "YSSY",
      arrival_icao: "YBBN",
      aircraft_manufacturer: "Gulfstream",
      aircraft_model: "G700",
      aircraft_weight: 67883,
      aircraft_wingspan: 31.39,
      departure_time: "2026-04-25T09:10:00.000Z",
      arrival_time: "2026-04-25T17:10:06.000Z",
      time_enroute: 56,
      departure_rwy: "34L",
      arrival_rwy: "01R",
      route: "DCT",
      flight_metadata: {
        cruise_altitude: "FL450",
        total_fuel_required: 9553,
      },
    });
  });

  it("uses null manufacturer and model when aircraft row is missing", () => {
    const json = buildNotamAnalysisAgentContext({
      flight: {
        departure_icao: null,
        arrival_icao: null,
        departure_time: null,
        arrival_time: null,
        time_enroute: null,
        departure_rwy: null,
        arrival_rwy: null,
        route: null,
        aircraft_weight: null,
        flight_metadata: null,
      },
      aircraft: null,
    });

    expect(json.aircraft_manufacturer).toBeNull();
    expect(json.aircraft_model).toBeNull();
    expect(json.aircraft_wingspan).toBeNull();
    expect(json.flight_metadata).toEqual({});
  });

  it("parses wingspan from a numeric string", () => {
    const json = buildNotamAnalysisAgentContext({
      flight: {
        departure_icao: null,
        arrival_icao: null,
        departure_time: null,
        arrival_time: null,
        time_enroute: null,
        departure_rwy: null,
        arrival_rwy: null,
        route: null,
        aircraft_weight: null,
        flight_metadata: null,
      },
      aircraft: {
        manufacturer: "Boeing",
        type: "787-9",
        wingspan: "60.1",
      },
    });
    expect(json.aircraft_manufacturer).toBe("Boeing");
    expect(json.aircraft_model).toBe("787-9");
    expect(json.aircraft_wingspan).toBe(60.1);
  });
});
