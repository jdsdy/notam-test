import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { SupabaseClient } from "@supabase/supabase-js";

import { runNotamAnalysisForFlight } from "@/lib/notam-analysis-service";

function createMockAnthropic(llm: {
  cat1: { i: string; s: string }[];
  cat2: { i: string; s: string }[];
  cat3: { i: string; s: string }[];
}) {
  return {
    beta: {
      messages: {
        stream: vi.fn().mockReturnValue({
          finalMessage: vi.fn().mockResolvedValue({
            content: [{ type: "text" as const, text: JSON.stringify(llm) }],
          }),
        }),
      },
    },
  };
}

function createSequentialMockAnthropic(
  responses: {
    cat1: { i: string; s: string }[];
    cat2: { i: string; s: string }[];
    cat3: { i: string; s: string }[];
  }[],
) {
  let call = 0;
  return {
    beta: {
      messages: {
        stream: vi.fn(() => {
          const payload =
            responses[call] ?? { cat1: [], cat2: [], cat3: [] };
          call += 1;
          return {
            finalMessage: vi.fn().mockResolvedValue({
              content: [{ type: "text" as const, text: JSON.stringify(payload) }],
            }),
          };
        }),
      },
    },
  };
}

function createSupabaseMock(args: {
  flight: Record<string, unknown> | null;
  pending: { id: string; raw_notams: Record<string, unknown> } | null;
  updateError?: { message: string } | null;
  /** `undefined` = default mock row; `null` = no aircraft row found. */
  aircraftRow?: Record<string, unknown> | null;
}) {
  const updateSpy = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "flights") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: args.flight,
                error: null,
              })),
            })),
          })),
        })),
      };
    }
    if (table === "aircraft") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                if (args.aircraftRow === null) {
                  return { data: null, error: null };
                }
                const data =
                  args.aircraftRow ??
                  ({
                    manufacturer: "Gulfstream",
                    type: "G700",
                    wingspan: 31.39,
                  } as Record<string, unknown>);
                return { data, error: null };
              }),
            })),
          })),
        })),
      };
    }
    if (table === "notam_analyses") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: args.pending,
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        })),
        update: vi.fn(() => {
          updateSpy();
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({
                error: args.updateError ?? null,
              })),
            })),
          };
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  return { supabase: { from } as unknown as SupabaseClient, updateSpy };
}

describe("runNotamAnalysisForFlight", () => {
  it("returns an error when the flight is not in the organisation", async () => {
    const { supabase } = createSupabaseMock({ flight: null, pending: null });
    const anthropic = createMockAnthropic({ cat1: [], cat2: [], cat3: [] });
    const r = await runNotamAnalysisForFlight(
      supabase,
      "flight-1",
      "org-1",
      { anthropic: anthropic as never },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not found/i);
  });

  it("persists merged analysed_notams when flight and pending raw NOTAMs exist", async () => {
    const raw = {
      notams: [
        {
          id: "X/1",
          title: "t",
          q: null,
          a: null,
          b: null,
          c: null,
          e: null,
        },
      ],
      unformatted_notams: ["u1"],
    };
    const { supabase, updateSpy } = createSupabaseMock({
      flight: {
        aircraft_id: "ac-1",
        departure_icao: "KJFK",
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
      pending: { id: "na-1", raw_notams: raw },
    });
    const llm = {
      cat1: [{ i: "X/1", s: "summary here" }],
      cat2: [] as { i: string; s: string }[],
      cat3: [] as { i: string; s: string }[],
    };
    const anthropic = createMockAnthropic(llm);
    const r = await runNotamAnalysisForFlight(
      supabase,
      "flight-1",
      "org-1",
      { anthropic: anthropic as never },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.analysed.notams[0]?.summary).toBe("summary here");
      expect(r.analysed.unformatted_notams).toEqual(["u1"]);
    }
    expect(updateSpy).toHaveBeenCalled();
  });

  it("chunks large NOTAM lists and merges categorisation across parallel model calls", async () => {
    const notams = Array.from({ length: 21 }, (_, i) => ({
      id: `id-${i}`,
      title: "",
      q: null,
      a: null,
      b: null,
      c: null,
      e: null,
    }));
    const raw = { notams, unformatted_notams: [] as string[] };
    const { supabase } = createSupabaseMock({
      flight: {
        aircraft_id: "ac-1",
        departure_icao: "YSSY",
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
      pending: { id: "na-1", raw_notams: raw },
    });
    const chunk0 = {
      cat1: [],
      cat2: [],
      cat3: notams.slice(0, 20).map((n) => ({ i: n.id, s: `s-${n.id}` })),
    };
    const chunk1 = {
      cat1: [],
      cat2: [],
      cat3: [{ i: "id-20", s: "s-id-20" }],
    };
    const anthropic = createSequentialMockAnthropic([chunk0, chunk1]);
    const r = await runNotamAnalysisForFlight(
      supabase,
      "flight-1",
      "org-1",
      { anthropic: anthropic as never },
    );
    expect(r.ok).toBe(true);
    expect(anthropic.beta.messages.stream).toHaveBeenCalledTimes(2);
    if (r.ok) {
      expect(r.analysed.notams).toHaveLength(21);
      expect(r.analysed.notams[0]?.summary).toBe("s-id-0");
      expect(r.analysed.notams[20]?.summary).toBe("s-id-20");
    }
  });

  it("rejects analysis while extraction status is still set on the row", async () => {
    const { supabase } = createSupabaseMock({
      flight: {
        aircraft_id: "ac-1",
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
      pending: {
        id: "na-1",
        raw_notams: { _status: "extracting", notams: [] },
      },
    });
    const anthropic = createMockAnthropic({ cat1: [], cat2: [], cat3: [] });
    const r = await runNotamAnalysisForFlight(
      supabase,
      "flight-1",
      "org-1",
      { anthropic: anthropic as never },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/extraction is still in progress/i);
  });
});
