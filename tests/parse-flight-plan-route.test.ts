import { PDFDocument } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  anthropicCtor: vi.fn(),
  toFile: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  extractPdfText: vi.fn(),
  storageUpload: vi.fn(),
  storageDownload: vi.fn(),

  createSupabaseServerClient: vi.fn(),

  assertUserCanAccessFlight: vi.fn(),
  assertAircraftBelongsToOrganisation: vi.fn(),

  applyParsedFlightPlanToFlight: vi.fn(),
  markPendingNotamExtraction: vi.fn(),
  upsertPendingNotamAnalysis: vi.fn(),

  runPdfSplitterAgent: vi.fn(),
  splitPdfBySplitterResult: vi.fn(),
  runNotamExtractionOnTextChunks: vi.fn(),
  runFlightDataExtractionAgent: vi.fn(),
  runFlightRouteWeatherTableAgent: vi.fn(),
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
}));

vi.mock("@/lib/api-rate-limit", () => ({
  enforceParseFlightPlanRateLimit: vi.fn().mockResolvedValue({ ok: true }),
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

vi.mock("@/lib/flight-plan/notam-text-split", () => ({
  runNotamExtractionOnTextChunks: mocks.runNotamExtractionOnTextChunks,
}));

vi.mock("@/lib/flight-plan/agents/flight-data-extraction", () => ({
  runFlightDataExtractionAgent: mocks.runFlightDataExtractionAgent,
}));

vi.mock("@/lib/flight-plan/agents/flight-route-weather-extraction", () => ({
  runFlightRouteWeatherTableAgent: mocks.runFlightRouteWeatherTableAgent,
}));

import { POST as postIdentify } from "@/app/api/flights/[flightId]/parse/identify-flight-plan/route";
import { POST as postExtractFlight } from "@/app/api/flights/[flightId]/parse/extract-flight-plan/route";
import { POST as postExtractNotams } from "@/app/api/flights/[flightId]/parse/extract-notams/route";

const SPLITTER_RESULT = {
  notamGroups: [
    { pages: [1, 2, 3], notamCount: 2, startId: "A1/26", endId: "B2/26" },
  ],
  windMapPages: [] as number[],
  routeWeatherTablePages: [4],
  flightDetailPages: [5, 6],
};

function createMultipartRequest(formData: FormData): Request {
  return new Request("http://localhost/api/flights/f-1/parse/identify-flight-plan", {
    method: "POST",
    body: formData,
  });
}

function mockSupabaseForFlightAccess() {
  const mockMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      organisation_id: "org-1",
      aircraft_id: "ac-1",
    },
    error: null,
  });
  const mockEq = vi.fn().mockReturnValue({
    maybeSingle: mockMaybeSingle,
  });
  const mockSelect = vi.fn().mockReturnValue({
    eq: mockEq,
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
    storage: {
      from: vi.fn().mockReturnValue({
        upload: mocks.storageUpload,
        download: mocks.storageDownload,
      }),
    },
  });
}

describe("POST /api/flights/[flightId]/parse/identify-flight-plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockSupabaseForFlightAccess();

    mocks.anthropicCtor.mockReturnValue({
      beta: {
        files: {
          upload: mocks.uploadFile,
          delete: mocks.deleteFile,
        },
      },
    });

    mocks.storageUpload.mockResolvedValue({
      data: { path: "org-1/mock.pdf" },
      error: null,
    });

    mocks.assertUserCanAccessFlight.mockResolvedValue({ organisationId: "org-1" });
    mocks.assertAircraftBelongsToOrganisation.mockResolvedValue(true);
    mocks.toFile.mockResolvedValue({ any: "file" });
    mocks.uploadFile.mockResolvedValueOnce({ id: "file_original" });
    mocks.deleteFile.mockResolvedValue({ id: "deleted", type: "file_deleted" });

    mocks.runPdfSplitterAgent.mockResolvedValue(SPLITTER_RESULT);
  });

  it("returns 400 when required multipart fields are missing", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "plan.pdf", { type: "application/pdf" }));

    const response = await postIdentify(createMultipartRequest(form), {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      error: expect.stringMatching(/organisation|aircraft/i),
    });
  });

  it("stores the PDF, runs the splitter, and returns planPdfUuid and splitterResult", async () => {
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("123e4567-e89b-12d3-a456-426614174000");

    const emptyPdf = await PDFDocument.create();
    const pdfBytes = new Uint8Array(await emptyPdf.save());

    const form = new FormData();
    form.set("organisationId", "org-1");
    form.set("aircraftId", "ac-1");
    form.set(
      "file",
      new File([pdfBytes], "plan.pdf", { type: "application/pdf" }),
    );

    const response = await postIdentify(createMultipartRequest(form), {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.planPdfUuid).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(body.splitterResult).toEqual(SPLITTER_RESULT);
    expect(typeof body.totalPages).toBe("number");

    expect(mocks.storageUpload).toHaveBeenCalledWith(
      "org-1/123e4567-e89b-12d3-a456-426614174000.pdf",
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: "application/pdf" }),
    );
    expect(mocks.runPdfSplitterAgent).toHaveBeenCalledWith(
      expect.objectContaining({ originalFileId: "file_original" }),
    );
    expect(mocks.deleteFile).toHaveBeenCalledWith(
      "file_original",
      expect.objectContaining({ betas: ["files-api-2025-04-14"] }),
    );

    randomUuidSpy.mockRestore();
  });
});

describe("POST /api/flights/[flightId]/parse/extract-flight-plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockSupabaseForFlightAccess();

    mocks.storageDownload.mockResolvedValue({
      data: {
        arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
      },
      error: null,
    });

    mocks.anthropicCtor.mockReturnValue({
      beta: {
        files: {
          upload: mocks.uploadFile,
          delete: mocks.deleteFile,
        },
      },
    });

    mocks.uploadFile
      .mockResolvedValueOnce({ id: "file_route" })
      .mockResolvedValueOnce({ id: "file_flight" });
    mocks.deleteFile.mockResolvedValue({ id: "deleted", type: "file_deleted" });

    mocks.splitPdfBySplitterResult.mockResolvedValue({
      flightDetailsPdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      routeWeatherTablePdf: new Uint8Array([0x03]),
      notamBatchPdfs: [new Uint8Array([0x01, 0x02, 0x03])],
    });

    mocks.runFlightRouteWeatherTableAgent.mockResolvedValue({
      route: "YSSY DCT YMML",
      unidentified_fields: [],
    });

    mocks.runFlightDataExtractionAgent.mockResolvedValue({
      departure_icao: "yssy",
      arrival_icao: "ymml",
      departure_time: "2026-04-18T12:00:00.000Z",
      arrival_time: "2026-04-18T15:00:00.000Z",
      time_enroute: 180,
      departure_rwy: "16R",
      arrival_rwy: "27",
      aircraft_weight: 18000,
      flight_plan_json: { primary: [], alternate: [] },
      flight_metadata: { cruise_altitude: "FL320" },
      unidentified_fields: ["arrival_rwy"],
    });

    mocks.applyParsedFlightPlanToFlight.mockResolvedValue({ ok: true });

    mocks.assertUserCanAccessFlight.mockResolvedValue({ organisationId: "org-1" });
    mocks.assertAircraftBelongsToOrganisation.mockResolvedValue(true);
    mocks.toFile.mockResolvedValue({ any: "file" });
  });

  it("downloads the stored PDF, extracts flight fields, and applies them to the flight", async () => {
    const req = new Request(
      "http://localhost/api/flights/f-1/parse/extract-flight-plan",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: "org-1",
          aircraftId: "ac-1",
          planPdfUuid: "123e4567-e89b-12d3-a456-426614174000",
          splitterResult: SPLITTER_RESULT,
        }),
      },
    );

    const response = await postExtractFlight(req, {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.needsManualReview).toEqual(["arrival_rwy"]);
    expect(body.fields.departure_icao).toBe("YSSY");
    expect(body.fields.route).toBe("YSSY DCT YMML");
    expect(body.fields.pdf_file_id).toBe("123e4567-e89b-12d3-a456-426614174000");

    expect(mocks.splitPdfBySplitterResult).toHaveBeenCalled();
    expect(mocks.applyParsedFlightPlanToFlight).toHaveBeenCalledWith(
      expect.anything(),
      "f-1",
      "org-1",
      expect.objectContaining({
        departure_icao: "YSSY",
        pdf_file_id: "123e4567-e89b-12d3-a456-426614174000",
      }),
    );
  });
});

describe("POST /api/flights/[flightId]/parse/extract-notams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockSupabaseForFlightAccess();

    mocks.storageDownload.mockResolvedValue({
      data: {
        arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
      },
      error: null,
    });

    mocks.anthropicCtor.mockReturnValue({});

    mocks.splitPdfBySplitterResult.mockResolvedValue({
      flightDetailsPdf: new Uint8Array([0x25]),
      routeWeatherTablePdf: new Uint8Array([0x03]),
      notamBatchPdfs: [new Uint8Array([0x01, 0x02, 0x03])],
    });

    mocks.extractPdfText.mockResolvedValue("NOTAM TEXT FROM PDF");
    mocks.runNotamExtractionOnTextChunks.mockResolvedValue({
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

    mocks.markPendingNotamExtraction.mockResolvedValue({
      notamAnalysisId: "na-pending",
    });
    mocks.upsertPendingNotamAnalysis.mockResolvedValue({ notamAnalysisId: "na-1" });

    mocks.assertUserCanAccessFlight.mockResolvedValue({ organisationId: "org-1" });
    mocks.assertAircraftBelongsToOrganisation.mockResolvedValue(true);
  });

  it("marks extraction pending, extracts NOTAM text, and upserts raw NOTAMs", async () => {
    const req = new Request(
      "http://localhost/api/flights/f-1/parse/extract-notams",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: "org-1",
          aircraftId: "ac-1",
          planPdfUuid: "123e4567-e89b-12d3-a456-426614174000",
          splitterResult: SPLITTER_RESULT,
        }),
      },
    );

    const response = await postExtractNotams(req, {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.notamAnalysisId).toBe("na-1");

    expect(mocks.markPendingNotamExtraction).toHaveBeenCalledWith(
      expect.anything(),
      "f-1",
    );
    expect(mocks.extractPdfText).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(mocks.runNotamExtractionOnTextChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        notamText: "NOTAM TEXT FROM PDF",
      }),
    );
    expect(mocks.upsertPendingNotamAnalysis).toHaveBeenCalledWith(
      expect.anything(),
      "f-1",
      expect.objectContaining({
        notams: expect.arrayContaining([
          expect.objectContaining({ id: "A1/26", d: null, f: null, g: null }),
        ]),
      }),
    );
  });

  it("returns 401 when auth user is missing", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const req = new Request(
      "http://localhost/api/flights/f-1/parse/extract-notams",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisationId: "org-1",
          aircraftId: "ac-1",
          planPdfUuid: "123e4567-e89b-12d3-a456-426614174000",
          splitterResult: SPLITTER_RESULT,
        }),
      },
    );

    const response = await postExtractNotams(req, {
      params: Promise.resolve({ flightId: "f-1" }),
    });

    expect(response.status).toBe(401);
  });
});
