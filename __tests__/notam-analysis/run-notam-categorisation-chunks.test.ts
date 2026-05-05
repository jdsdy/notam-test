import { describe, expect, it, vi } from "vitest";

import { runNotamCategorisationOnStructuredNotamChunks } from "@/lib/notam-analysis/run-notam-categorisation-chunks";
import type Anthropic from "@anthropic-ai/sdk";
import type { RawNotam } from "@/lib/notams";

function makeNotam(id: string): RawNotam {
  return {
    id,
    title: "",
    q: null,
    a: null,
    b: null,
    c: null,
    e: null,
  };
}

describe("runNotamCategorisationOnStructuredNotamChunks", () => {
  it("runs one model call per chunk and merges outputs", async () => {
    let streamCall = 0;
    const anthropic = {
      beta: {
        messages: {
          stream: vi.fn(() => {
            const idx = streamCall++;
            const payload =
              idx === 0
                ? {
                    cat1: [{ i: "N0", s: "c0" }],
                    cat2: [{ i: "N1", s: "c1" }],
                    cat3: [],
                  }
                : {
                    cat1: [],
                    cat2: [],
                    cat3: [{ i: "N2", s: "c2" }],
                  };
            return {
              finalMessage: vi.fn().mockResolvedValue({
                content: [{ type: "text" as const, text: JSON.stringify(payload) }],
              }),
            };
          }),
        },
      },
    } as unknown as Anthropic;

    const notams = [makeNotam("N0"), makeNotam("N1"), makeNotam("N2")];
    const out = await runNotamCategorisationOnStructuredNotamChunks({
      anthropic,
      agentContext: {
        departure_icao: "YSSY",
        arrival_icao: null,
        aircraft_manufacturer: "Gulfstream",
        aircraft_model: "G700",
        aircraft_weight: null,
        aircraft_wingspan: 31.39,
        departure_time: null,
        arrival_time: null,
        time_enroute: null,
        departure_rwy: null,
        arrival_rwy: null,
        route: null,
        flight_metadata: {},
      },
      notams,
      chunkSize: 2,
    });

    expect(anthropic.beta.messages.stream).toHaveBeenCalledTimes(2);
    expect(out.cat1).toEqual([{ i: "N0", s: "c0" }]);
    expect(out.cat2).toEqual([{ i: "N1", s: "c1" }]);
    expect(out.cat3).toEqual([{ i: "N2", s: "c2" }]);
  });

  it("throws when every chunk fails", async () => {
    const anthropic = {
      beta: {
        messages: {
          stream: vi.fn(() => ({
            finalMessage: vi.fn().mockRejectedValue(new Error("boom")),
          })),
        },
      },
    } as unknown as Anthropic;

    await expect(
      runNotamCategorisationOnStructuredNotamChunks({
        anthropic,
        agentContext: {
          departure_icao: null,
          arrival_icao: null,
          aircraft_manufacturer: null,
          aircraft_model: null,
          aircraft_weight: null,
          aircraft_wingspan: null,
          departure_time: null,
          arrival_time: null,
          time_enroute: null,
          departure_rwy: null,
          arrival_rwy: null,
          route: null,
          flight_metadata: {},
        },
        notams: [makeNotam("A")],
        chunkSize: 1,
      }),
    ).rejects.toThrow(/All 1 chunk categorisations failed/);
  });
});
