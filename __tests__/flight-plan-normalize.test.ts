import { describe, expect, it } from "vitest";

import { buildPersistedFields } from "@/lib/flight-plan/normalize";

describe("buildPersistedFields", () => {
  it("persists flight_plan_json as null even when extraction includes route-table data", () => {
    const result = buildPersistedFields(
      {
        departure_icao: "KJFK",
        arrival_icao: "KLAX",
        departure_time: "2026-04-18T12:00:00.000Z",
        arrival_time: null,
        time_enroute: 300,
        departure_rwy: "04L",
        arrival_rwy: "25R",
        route: "KJFK DCT KLAX",
        aircraft_weight: 18000,
        flight_plan_json: {
          primary: [
            {
              name: "KJFK",
              latitude: 40.639751,
              longitude: -73.778925,
              flt: "null",
              tas: 0,
              grs: 0,
              awy: "null",
              "wind/comp": "null",
              mh: 0,
              mcrs: 0,
              null_values: [
                "flt",
                "tas",
                "grs",
                "awy",
                "wind/comp",
                "mh",
                "mcrs",
              ],
            },
          ],
          alternate: [],
        },
        flight_metadata: { cruise_altitude: "FL350" },
        extracted_notams: { notams: [], unformatted_notams: [] },
        unidentified_fields: [],
      },
      "file_original",
    );

    expect(result.fields.flight_plan_json).toBeNull();
  });
});
