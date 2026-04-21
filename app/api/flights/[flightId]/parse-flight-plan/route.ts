import { after, NextResponse } from "next/server";
import Anthropic, { toFile } from "@anthropic-ai/sdk";

import type { FlightPlanParseApiResponse } from "@/lib/flight-plan-parse";
import { runFlightDataExtractionAgent } from "@/lib/flight-plan/agents/flight-data-extraction";
import { runFlightRouteWeatherTableAgent } from "@/lib/flight-plan/agents/flight-route-weather-extraction";
import { runNotamExtractionOnTextChunks } from "@/lib/flight-plan/notam-text-split";
import {
  runPdfSplitterAgent,
  splitPdfBySplitterResult,
} from "@/lib/flight-plan/agents/pdf-splitter";
import { mergeFlightDataPartials } from "@/lib/flight-plan/merge-flight-data";
import { buildPersistedFields, extractedNotamsToRawPayload } from "@/lib/flight-plan/normalize";
import {
  type FlightDataExtractionPartial,
  type FlightPlanExtraction,
  type NotamExtractionPartial,
  FLIGHT_DATA_CORE_FALLBACK,
  ROUTE_PARTIAL_WHEN_NO_TABLE_PDF,
} from "@/lib/flight-plan/schemas";
import {
  assertAircraftBelongsToOrganisation,
  assertUserCanAccessFlight,
} from "@/lib/flights";
import {
  applyParsedFlightPlanToFlight,
  markPendingNotamExtraction,
  upsertPendingNotamAnalysis,
} from "@/lib/notam-analysis-service";
import { enforceParseFlightPlanRateLimit } from "@/lib/api-rate-limit";
import { extractPdfText } from "@/lib/pdf-parse-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Force the Node runtime: pdf-parse / pdfjs-dist rely on Node-only APIs and a
// native canvas polyfill, which are unavailable on the Edge runtime.
export const runtime = "nodejs";
// PDF splitting + multiple Anthropic agent calls can comfortably exceed the
// default 60s limit on Vercel's Hobby/Pro defaults.
export const maxDuration = 300;

const FILES_API_BETA = "files-api-2025-04-14";
const FLIGHT_PLAN_UPLOADS_BUCKET = "flight_plan_uploads";

async function persistOriginalFlightPlanPdf(args: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  organisationId: string;
  planPdfUuid: string;
  originalPdfBytes: Uint8Array;
}): Promise<void> {
  const objectPath = `${args.organisationId}/${args.planPdfUuid}.pdf`;
  const { error } = await args.supabase.storage
    .from(FLIGHT_PLAN_UPLOADS_BUCKET)
    .upload(objectPath, args.originalPdfBytes, {
      contentType: "application/pdf",
    });
  if (error) {
    throw new Error(
      `Failed to store flight plan PDF: ${error.message ?? "unknown error"}`,
    );
  }
}

function buildFullExtractionFromFlightData(
  partial: FlightDataExtractionPartial,
): FlightPlanExtraction {
  return {
    ...partial,
    extracted_notams: { notams: [], unformatted_notams: [] },
    unidentified_fields: Array.from(new Set(partial.unidentified_fields ?? [])),
  };
}

function buildFullExtractionFromNotams(
  partial: NotamExtractionPartial,
): FlightPlanExtraction {
  return {
    departure_icao: null,
    arrival_icao: null,
    departure_time: null,
    arrival_time: null,
    time_enroute: null,
    departure_rwy: null,
    arrival_rwy: null,
    route: null,
    aircraft_weight: null,
    flight_plan_json: { primary: [], alternate: [] },
    flight_metadata: null,
    extracted_notams: partial.extracted_notams,
    unidentified_fields: Array.from(new Set(partial.unidentified_fields ?? [])),
  };
}

async function uploadPdfBytes(args: {
  anthropic: Anthropic;
  bytes: Uint8Array;
  label: string;
  uploadedFileIds: string[];
}): Promise<string> {
  const uploaded = await args.anthropic.beta.files.upload({
    file: await toFile(args.bytes, `${crypto.randomUUID()}-${args.label}.pdf`, {
      type: "application/pdf",
    }),
    betas: [FILES_API_BETA],
  });
  args.uploadedFileIds.push(uploaded.id);
  return uploaded.id;
}

async function runDetachedNotamPersistence(args: {
  anthropic: Anthropic;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  flightId: string;
  notamBatchPdfs: Uint8Array[];
}): Promise<void> {
  const { anthropic, supabase, flightId, notamBatchPdfs } = args;

  try {
    if (notamBatchPdfs.length === 0) {
      await upsertPendingNotamAnalysis(supabase, flightId, null);
      return;
    }

    const textChunks = await Promise.all(
      notamBatchPdfs.map((pdfBytes) => extractPdfText(pdfBytes)),
    );
    const notamText = textChunks
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0)
      .join("\n\n");

    const notamPartial: NotamExtractionPartial =
      notamText.length > 0
        ? await runNotamExtractionOnTextChunks({ anthropic, notamText })
        : {
            extracted_notams: { notams: [], unformatted_notams: [] },
            unidentified_fields: ["extracted_notams"],
          };

    const notamExtraction = buildFullExtractionFromNotams(notamPartial);
    const rawPayload = extractedNotamsToRawPayload(notamExtraction);

    await upsertPendingNotamAnalysis(supabase, flightId, rawPayload);
  } catch (error) {
    // Ensure the loading indicator does not remain stuck forever on failures.
    await upsertPendingNotamAnalysis(supabase, flightId, null).catch(
      () => undefined,
    );
    console.error("[notam-extraction-background]", error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ flightId: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false as const, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const rateLimit = await enforceParseFlightPlanRateLimit(user.id);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const formData = await request.formData();
  const organisationId = String(
    formData.get("organisationId") ?? formData.get("organisationID") ?? "",
  ).trim();
  const aircraftId = String(
    formData.get("aircraftId") ?? formData.get("aircraftID") ?? "",
  ).trim();
  const file = formData.get("file");

  if (!organisationId || !aircraftId) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "organisationId and aircraftId are required.",
      },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false as const, error: "A non-empty PDF file is required." },
      { status: 400 },
    );
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json(
      { ok: false as const, error: "Only PDF uploads are supported." },
      { status: 400 },
    );
  }

  const { flightId } = await context.params;
  const access = await assertUserCanAccessFlight(user.id, flightId);
  if (!access) {
    return NextResponse.json(
      { ok: false as const, error: "Forbidden" },
      { status: 403 },
    );
  }

  if (access.organisationId !== organisationId) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "Flight does not belong to the provided organisation.",
      },
      { status: 403 },
    );
  }

  const aircraftBelongsToOrg = await assertAircraftBelongsToOrganisation(
    aircraftId,
    organisationId,
  );
  if (!aircraftBelongsToOrg) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "Aircraft does not belong to the provided organisation.",
      },
      { status: 403 },
    );
  }

  const { data: flight, error: flightErr } = await supabase
    .from("flights")
    .select(
      "organisation_id, aircraft_id, departure_icao, arrival_icao, departure_time, arrival_time, time_enroute, departure_rwy, arrival_rwy, route, aircraft_weight, status, flight_plan_json, flight_metadata, pdf_file_id",
    )
    .eq("id", flightId)
    .maybeSingle();
  if (flightErr || !flight) {
    return NextResponse.json(
      { ok: false as const, error: "Flight not found." },
      { status: 404 },
    );
  }
  if (
    String(flight.organisation_id) !== organisationId ||
    String(flight.aircraft_id) !== aircraftId
  ) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "Provided organisation/aircraft does not match this flight.",
      },
      { status: 400 },
    );
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "ANTHROPIC_API_KEY is not configured.",
      },
      { status: 500 },
    );
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  const uploadedFileIds: string[] = [];

  try {
    const originalPdfBytes = new Uint8Array(await file.arrayBuffer());
    const planPdfUuid = crypto.randomUUID();
    const normalizedPdfFilename = `${planPdfUuid}.pdf`;

    const extractPersistedFields = async (): Promise<{
      fields: ReturnType<typeof buildPersistedFields>["fields"];
      needsManualReview: ReturnType<typeof buildPersistedFields>["needsManualReview"];
      notamBatchPdfs: Uint8Array[];
    }> => {
      const originalUploaded = await anthropic.beta.files.upload({
        file: await toFile(originalPdfBytes, normalizedPdfFilename, {
          type: file.type || "application/pdf",
        }),
        betas: [FILES_API_BETA],
      });
      uploadedFileIds.push(originalUploaded.id);

      const splitterResult = await runPdfSplitterAgent({
        anthropic,
        originalFileId: originalUploaded.id,
        originalPdfBytes,
      });
      const { flightDetailsPdf, routeWeatherTablePdf, notamBatchPdfs } =
        await splitPdfBySplitterResult(originalPdfBytes, splitterResult);

      const routePartialPromise = routeWeatherTablePdf
        ? (async () => {
            const routeTableFileId = await uploadPdfBytes({
              anthropic,
              bytes: routeWeatherTablePdf,
              label: "route-weather-table",
              uploadedFileIds,
            });
            return runFlightRouteWeatherTableAgent({
              anthropic,
              routeTableFileId,
            });
          })()
        : Promise.resolve(ROUTE_PARTIAL_WHEN_NO_TABLE_PDF);

      const corePartialPromise = flightDetailsPdf
        ? (async () => {
            const flightDetailsFileId = await uploadPdfBytes({
              anthropic,
              bytes: flightDetailsPdf,
              label: "flight-details",
              uploadedFileIds,
            });
            return runFlightDataExtractionAgent({
              anthropic,
              flightDataFileId: flightDetailsFileId,
            });
          })()
        : Promise.resolve(FLIGHT_DATA_CORE_FALLBACK);

      const [corePartial, routePartial] = await Promise.all([
        corePartialPromise,
        routePartialPromise,
      ]);

      const flightDataPartial = mergeFlightDataPartials(
        corePartial,
        routePartial,
      );

      const flightExtraction = buildFullExtractionFromFlightData(flightDataPartial);
      const { fields, needsManualReview } = buildPersistedFields(
        flightExtraction,
        planPdfUuid,
      );

      return { fields, needsManualReview, notamBatchPdfs };
    };

    const [storageOutcome, extractionOutcome] = await Promise.allSettled([
      persistOriginalFlightPlanPdf({
        supabase,
        organisationId,
        planPdfUuid,
        originalPdfBytes,
      }),
      extractPersistedFields(),
    ]);

    if (storageOutcome.status === "rejected") {
      throw storageOutcome.reason;
    }
    if (extractionOutcome.status === "rejected") {
      throw extractionOutcome.reason;
    }

    const { fields, needsManualReview, notamBatchPdfs } = extractionOutcome.value;

    const applyResult = await applyParsedFlightPlanToFlight(
      supabase,
      flightId,
      organisationId,
      fields,
    );
    if (!applyResult.ok) {
      return NextResponse.json(
        { ok: false as const, error: applyResult.error },
        { status: 500 },
      );
    }

    const { notamAnalysisId } = await markPendingNotamExtraction(
      supabase,
      flightId,
    );

    // Schedule NOTAM extraction to continue after the response is sent.
    // On Vercel the invocation is suspended once the response flushes unless
    // `after()` (which uses `waitUntil` under the hood) keeps it alive.
    after(async () => {
      await runDetachedNotamPersistence({
        anthropic,
        supabase,
        flightId,
        notamBatchPdfs,
      });
    });

    const body: FlightPlanParseApiResponse = {
      ok: true,
      fields,
      needsManualReview,
      notamAnalysisId,
      notamsIdentified: [],
    };

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        {
          ok: false as const,
          error: `Anthropic request failed: ${error.message}`,
        },
        { status: 502 },
      );
    }

    const reason = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false as const, error: `Failed to parse flight plan: ${reason}` },
      { status: 500 },
    );
  } finally {
    if (uploadedFileIds.length > 0) {
      await Promise.allSettled(
        uploadedFileIds.map((fileId) =>
          anthropic.beta.files
            .delete(fileId, { betas: [FILES_API_BETA] })
            .catch(() => undefined),
        ),
      );
    }
  }
}
