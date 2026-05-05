import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { runSupervisorAgent } from "@/lib/flight-plan/agents/supervisor";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("runSupervisorAgent", () => {
  it("waits for the streamed final response before returning", async () => {
    const expected = {
      departure_icao: "KJFK",
      arrival_icao: "KLAX",
      departure_time: "2026-04-18T12:00:00.000Z",
      arrival_time: null,
      time_enroute: 300,
      departure_rwy: "04L",
      arrival_rwy: "25R",
      route: null,
      aircraft_weight: 18000,
      flight_plan_json: {
        primary: [],
        alternate: [],
      },
      flight_metadata: { cruise_altitude: "FL350" },
      extracted_notams: {
        notams: [
          {
            id: "A1/26",
            title: "RWY CLSD",
            q: "Q",
            a: "KJFK",
            b: "2601010000",
            c: "2601012359",
            d: "null",
            e: "Runway closed",
            f: "null",
            g: "null",
            null_values: ["d", "f", "g"],
          },
        ],
        unformatted_notams: [],
      },
      unidentified_fields: ["arrival_time", "route"],
    };

    const deferred = createDeferred<{
      content: Array<{ type: "text"; text: string }>;
    }>();
    const finalMessage = vi.fn().mockImplementation(() => deferred.promise);
    const stream = vi.fn().mockReturnValue({ finalMessage });
    const anthropic = {
      beta: {
        messages: {
          stream,
        },
      },
    } as unknown as Anthropic;

    let settled = false;
    const resultPromise = runSupervisorAgent({
      anthropic,
      flightDataPartial: {
        departure_icao: "KJFK",
        arrival_icao: "KLAX",
        departure_time: "2026-04-18T12:00:00.000Z",
        arrival_time: null,
        time_enroute: 300,
        departure_rwy: "04L",
        arrival_rwy: "25R",
        route: null,
        aircraft_weight: 18000,
        flight_plan_json: { primary: [], alternate: [] },
        flight_metadata: { cruise_altitude: "FL350" },
        unidentified_fields: ["arrival_time", "route"],
      },
      notamPartial: {
        extracted_notams: {
          notams: [
            {
              id: "A1/26",
              title: "RWY CLSD",
              q: "Q",
              a: "KJFK",
              b: "2601010000",
              c: "2601012359",
              d: "null",
              e: "Runway closed",
              f: "null",
              g: "null",
              null_values: ["d", "f", "g"],
            },
          ],
          unformatted_notams: [],
        },
        unidentified_fields: [],
      },
    }).finally(() => {
      settled = true;
    });

    await Promise.resolve();

    expect(stream).toHaveBeenCalledTimes(1);
    expect(finalMessage).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    deferred.resolve({
      content: [{ type: "text", text: JSON.stringify(expected) }],
    });

    await expect(resultPromise).resolves.toEqual(expected);
    expect(settled).toBe(true);
  });
});
