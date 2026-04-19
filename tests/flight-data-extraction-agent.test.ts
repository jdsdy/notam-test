import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { runFlightDataExtractionAgent } from "@/lib/flight-plan/agents/flight-data-extraction";

describe("runFlightDataExtractionAgent", () => {
  it("fills flight_plan_json with empty arrays when the model no longer returns it", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            departure_icao: "KJFK",
            arrival_icao: "KLAX",
            departure_time: "2026-04-18T12:00:00.000Z",
            arrival_time: null,
            time_enroute: 300,
            departure_rwy: "04L",
            arrival_rwy: "25R",
            route: "KJFK DCT KLAX",
            aircraft_weight: 18000,
            flight_metadata: { cruise_altitude: "FL350" },
            unidentified_fields: [],
          }),
        },
      ],
    });

    const anthropic = {
      beta: {
        messages: { create },
      },
    } as unknown as Anthropic;

    const result = await runFlightDataExtractionAgent({
      anthropic,
      flightDataFileId: "file_flight_data",
    });

    expect(result.flight_plan_json).toEqual({ primary: [], alternate: [] });
  });
});
