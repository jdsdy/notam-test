import { beforeEach, describe, expect, it, vi } from "vitest";

import { runNotamCategorisationLlm } from "@/lib/notam-analysis/run-notam-categorisation-llm";
import type Anthropic from "@anthropic-ai/sdk";

describe("runNotamCategorisationLlm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses structured output from the streamed model response", async () => {
    const payload = {
      cat1: [{ i: "N1/1", s: "one" }],
      cat2: [{ i: "N2/1", s: "two" }],
      cat3: [],
    };

    const finalMessage = vi.fn().mockResolvedValue({
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    });

    const stream = { finalMessage };
    const anthropic = {
      beta: {
        messages: {
          stream: vi.fn().mockReturnValue(stream),
        },
      },
    } as unknown as Anthropic;

    const out = await runNotamCategorisationLlm(anthropic, {
      agentContext: {
        departure_icao: "KJFK",
        arrival_icao: "KLAX",
        aircraft_manufacturer: "Gulfstream",
        aircraft_model: "G700",
        aircraft_weight: 18000,
        aircraft_wingspan: 31.39,
        departure_time: "2026-04-18T12:00:00.000Z",
        arrival_time: "2026-04-18T17:00:00.000Z",
        time_enroute: 247,
        departure_rwy: "04L",
        arrival_rwy: "25R",
        route: "KJFK DCT",
        flight_metadata: {},
      },
      structuredNotams: {
        notams: [
          {
            id: "N1/1",
            title: "",
            q: "",
            a: "",
            b: "",
            c: "",
            e: "",
          },
        ],
      },
    });

    expect(anthropic.beta.messages.stream).toHaveBeenCalledTimes(1);
    const call = vi.mocked(anthropic.beta.messages.stream).mock.calls[0]?.[0];
    expect(call?.model).toBe("claude-opus-4-7");
    expect(call?.thinking).toEqual({ type: "adaptive" });
    const user = call?.messages?.[0];
    expect(user?.role).toBe("user");
    const text = (user?.content as { type: string; text?: string }[])?.find(
      (b) => b.type === "text",
    )?.text;
    expect(text).toMatch(/single JSON object/i);
    const jsonPart = text?.split("\n\n")[1];
    expect(jsonPart).toBeTruthy();
    const parsed = JSON.parse(jsonPart!) as Record<string, unknown>;
    expect(parsed.departure_icao).toBe("KJFK");
    expect(parsed.aircraft_manufacturer).toBe("Gulfstream");
    expect(parsed.aircraft_model).toBe("G700");
    expect(parsed.aircraft_wingspan).toBe(31.39);
    expect(parsed.notams).toHaveLength(1);
    expect(parsed).not.toHaveProperty("unformatted_notams");

    expect(out).toEqual(payload);
  });
});
