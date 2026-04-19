import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  anthropicCtor: vi.fn(),
  toFile: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  extractPdfText: vi.fn(),

  createSupabaseServerClient: vi.fn(),
  getCurrentUser: vi.fn(),

  assertUserCanAccessFlight: vi.fn(),
  assertAircraftBelongsToOrganisation: vi.fn(),

  applyParsedFlightPlanToFlight: vi.fn(),
  markPendingNotamExtraction: vi.fn(),
  upsertPendingNotamAnalysis: vi.fn(),

  runPdfSplitterAgent: vi.fn(),
  splitPdfBySplitterResult: vi.fn(),
  runNotamExtractionAgent: vi.fn(),
  runFlightDataExtractionAgent: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: Object.assign(mocks.anthropicCtor, {
    APIError: class APIError extends Error {},
  }),
  toFile: mocks.toFile,
}));

vi.mock("@/lib/pdf-parse-server", () => ({
  extractPdfText: mocks.extractPdfText,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/flights", () => ({
  assertUserCanAccessFlight: mocks.assertUserCanAccessFlight,
  assertAircraftBelongsToOrganisation: mocks.assertAircraftBelongsToOrganisation,
}));

vi.mock("@/lib/notam-analysis-service", () => ({
  applyParsedFlightPlanToFlight: mocks.applyParsedFlightPlanToFlight,
  markPendingNotamExtraction: mocks.markPendingNotamExtraction,
  upsertPendingNotamAnalysis: mocks.upsertPendingNotamAnalysis,
}));

vi.mock("@/lib/flight-plan/agents/pdf-splitter", () => ({
  runPdfSplitterAgent: mocks.runPdfSplitterAgent,
  splitPdfBySplitterResult: mocks.splitPdfBySplitterResult,
}));

vi.mock("@/lib/flight-plan/agents/notam-extraction", () => ({
  runNotamExtractionAgent: mocks.runNotamExtractionAgent,
}));

vi.mock("@/lib/flight-plan/agents/flight-data-extraction", () => ({
  runFlightDataExtractionAgent: mocks.runFlightDataExtractionAgent,
}));

import { POST } from "@/app/api/flights/[flightId]/parse-flight-plan/route";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createMultipartRequest(formData: FormData): Request {
  return new Request("http://localhost/api/flights/f-1/parse-flight-plan", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/flights/[flightId]/parse-flight-plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        organisation_id: "org-1",
        aircraft_id: "ac-1",
        departure_icao: "YSSY",
        arrival_icao: "YMML",
        departure_time: "2026-04-18T12:00:00.000Z",
        arrival_time: "2026-04-18T15:00:00.000Z",
        time_enroute: 180,
        departure_rwy: "16R",
        arrival_rwy: "27",
        route: "YSSY DCT YMML",
        aircraft_weight: 18000,
        status: "draft",
        flight_plan_json: null,
        flight_metadata: null,
        pdf_file_id: null,
      },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({
      maybeSingle: mockMaybeSingle,
    });
    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    mocks.anthropicCtor.mockReturnValue({
      beta: {
        files: {
          upload: mocks.uploadFile,
          delete: mocks.deleteFile,
        },
      },
    });

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    });
    mocks.getCurrentUser.mockImplementation(() => {
      throw new Error("Route must validate with supabase.auth.getUser()");
    });
    mocks.assertUserCanAccessFlight.mockResolvedValue({ organisationId: "org-1" });
    mocks.assertAircraftBelongsToOrganisation.mockResolvedValue(true);
    mocks.toFile.mockResolvedValue({ any: "file" });
    mocks.uploadFile
      .mockResolvedValueOnce({ id: "file_original" })
      .mockResolvedValueOnce({ id: "file_flight" });
    mocks.deleteFile.mockResolvedValue({ id: "deleted", type: "file_deleted" });
    mocks.extractPdfText.mockResolvedValue("NOTAM TEXT FROM PDF");

    mocks.runPdfSplitterAgent.mockResolvedValue({
      notamGroups: [
        { pages: [1, 2, 3], notamCount: 2, startId: "A1/26", endId: "B2/26" },
      ],
      windMapPages: [4],
      flightDetailPages: [4, 5, 6],
    });

    mocks.splitPdfBySplitterResult.mockResolvedValue({
      flightDetailsPdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      notamBatchPdfs: [new Uint8Array([0x01, 0x02, 0x03])],
    });

    mocks.runFlightDataExtractionAgent.mockResolvedValue({
      departure_icao: "yssy",
      arrival_icao: "ymml",
      departure_time: "2026-04-18T12:00:00.000Z",
      arrival_time: "2026-04-18T15:00:00.000Z",
      time_enroute: 180,
      departure_rwy: "16R",
      arrival_rwy: "27",
      route: "YSSY DCT YMML",
      aircraft_weight: 18000,
      flight_plan_json: { primary: [], alternate: [] },
      flight_metadata: { cruise_altitude: "FL320" },
      unidentified_fields: ["arrival_rwy"],
    });
    mocks.runNotamExtractionAgent.mockResolvedValue({
      extracted_notams: {
        notams: [
          {
            id: "A1/26",
            title: "RWY CLSD",
            q: "Q) TEST",
            a: "YSSY",
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
    });
    mocks.applyParsedFlightPlanToFlight.mockResolvedValue({ ok: true });
    mocks.markPendingNotamExtraction.mockResolvedValue({
      notamAnalysisId: "na-pending",
    });
    mocks.upsertPendingNotamAnalysis.mockResolvedValue({ notamAnalysisId: "na-1" });
  });

  it("returns 400 when required multipart fields are missing", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "plan.pdf", { type: "application/pdf" }));

    const response = await POST(createMultipartRequest(form), {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      error: expect.stringMatching(/organisation|aircraft/i),
    });
  });

  it("persists flight-data extraction immediately and runs NOTAM extraction from parsed text", async () => {
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("123e4567-e89b-12d3-a456-426614174000");

    const form = new FormData();
    form.set("organisationId", "org-1");
    form.set("aircraftId", "ac-1");
    form.set("file", new File([new Uint8Array([1, 2, 3])], "plan.pdf", { type: "application/pdf" }));

    const response = await POST(createMultipartRequest(form), {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.needsManualReview).toEqual(["arrival_rwy"]);
    expect(body.fields.arrival_time).toBe("2026-04-18T15:00:00.000Z");
    expect(body.fields.route).toBe("YSSY DCT YMML");
    expect(body.fields.departure_icao).toBe("YSSY");
    expect(body.fields.arrival_rwy).toBeNull();
    expect(body.fields.status).toBe("draft");
    expect(body.fields.pdf_file_id).toBe("file_original");
    expect(body.fields.flight_plan_json).toBeNull();
    expect(body.fields.flight_metadata).toEqual({ cruise_altitude: "FL320" });
    expect(body.notamAnalysisId).toBe("na-pending");
    expect(body.notamsIdentified).toEqual([]);

    expect(mocks.uploadFile).toHaveBeenCalledTimes(2);
    expect(mocks.uploadFile).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ betas: ["files-api-2025-04-14"] }),
    );
    expect(mocks.toFile).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      "123e4567-e89b-12d3-a456-426614174000.pdf",
      expect.objectContaining({ type: "application/pdf" }),
    );

    expect(mocks.runPdfSplitterAgent).toHaveBeenCalledWith(
      expect.objectContaining({ originalFileId: "file_original" }),
    );
    expect(mocks.splitPdfBySplitterResult).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({
        notamGroups: expect.arrayContaining([
          expect.objectContaining({ pages: [1, 2, 3] }),
        ]),
        flightDetailPages: [4, 5, 6],
      }),
    );

    expect(mocks.extractPdfText).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(mocks.runNotamExtractionAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        notamText: "NOTAM TEXT FROM PDF",
      }),
    );
    expect(mocks.runFlightDataExtractionAgent).toHaveBeenCalledWith(
      expect.objectContaining({ flightDataFileId: "file_flight" }),
    );
    expect(mocks.applyParsedFlightPlanToFlight).toHaveBeenCalledWith(
      expect.anything(),
      "f-1",
      "org-1",
      expect.objectContaining({
        departure_icao: "YSSY",
        arrival_icao: "YMML",
        arrival_rwy: null,
        status: "draft",
        pdf_file_id: "file_original",
      }),
    );
    expect(mocks.markPendingNotamExtraction).toHaveBeenCalledWith(
      expect.anything(),
      "f-1",
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.upsertPendingNotamAnalysis).toHaveBeenCalledWith(
      expect.anything(),
      "f-1",
      expect.objectContaining({
        notams: expect.arrayContaining([
          expect.objectContaining({ id: "A1/26", d: null, f: null, g: null }),
        ]),
      }),
    );

    expect(mocks.deleteFile).toHaveBeenCalledTimes(2);
    const deletedIds = mocks.deleteFile.mock.calls.map((call) => call[0]).sort();
    expect(deletedIds).toEqual(["file_flight", "file_original"]);
    for (const call of mocks.deleteFile.mock.calls) {
      expect(call[1]).toEqual(
        expect.objectContaining({ betas: ["files-api-2025-04-14"] }),
      );
    }

    randomUuidSpy.mockRestore();
  });

  it("returns the flight-data response without waiting for NOTAM extraction to finish", async () => {
    const deferred = createDeferred<{
      extracted_notams: {
        notams: Array<{
          id: string;
          title: string;
          q: string;
          a: string;
          b: string;
          c: string;
          d: string;
          e: string;
          f: string;
          g: string;
          null_values: string[];
        }>;
        unformatted_notams: string[];
      };
      unidentified_fields: string[];
    }>();
    mocks.runNotamExtractionAgent.mockReturnValueOnce(deferred.promise);

    const form = new FormData();
    form.set("organisationId", "org-1");
    form.set("aircraftId", "ac-1");
    form.set("file", new File([new Uint8Array([1, 2, 3])], "plan.pdf", { type: "application/pdf" }));

    const response = await POST(createMultipartRequest(form), {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.markPendingNotamExtraction).toHaveBeenCalledTimes(1);
    expect(mocks.upsertPendingNotamAnalysis).toHaveBeenCalledTimes(0);

    deferred.resolve({
      extracted_notams: { notams: [], unformatted_notams: [] },
      unidentified_fields: ["extracted_notams"],
    });

    const deadline = Date.now() + 3000;
    while (
      mocks.upsertPendingNotamAnalysis.mock.calls.length === 0 &&
      Date.now() < deadline
    ) {
      await new Promise<void>((r) => setImmediate(r));
    }
    expect(mocks.upsertPendingNotamAnalysis).toHaveBeenCalledTimes(1);
  });

  it("surfaces a splitter failure during the diagnostic flow", async () => {
    mocks.runPdfSplitterAgent.mockRejectedValueOnce(
      new Error("[pdf-splitter-agent] bad segmentation"),
    );

    const form = new FormData();
    form.set("organisationId", "org-1");
    form.set("aircraftId", "ac-1");
    form.set("file", new File([new Uint8Array([1])], "plan.pdf", { type: "application/pdf" }));

    const response = await POST(createMultipartRequest(form), {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      error: expect.stringContaining("pdf-splitter-agent"),
    });
  });

  it("returns 401 when auth user is missing", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const form = new FormData();
    form.set("organisationId", "org-1");
    form.set("aircraftId", "ac-1");
    form.set("file", new File([new Uint8Array([1])], "plan.pdf", { type: "application/pdf" }));

    const response = await POST(createMultipartRequest(form), {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    expect(response.status).toBe(401);
  });
});
