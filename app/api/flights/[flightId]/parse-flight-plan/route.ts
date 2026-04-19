import { NextResponse } from "next/server";
import Anthropic, { toFile } from "@anthropic-ai/sdk";

import type { FlightPlanParseApiResponse } from "@/lib/flight-plan-parse";
import { runFlightDataExtractionAgent } from "@/lib/flight-plan/agents/flight-data-extraction";
import { runNotamExtractionOnTextChunks } from "@/lib/flight-plan/notam-text-split";
import {
  runPdfSplitterAgent,
  splitPdfBySplitterResult,
} from "@/lib/flight-plan/agents/pdf-splitter";
import { buildPersistedFields, extractedNotamsToRawPayload } from "@/lib/flight-plan/normalize";
import type {
  FlightDataExtractionPartial,
  FlightPlanExtraction,
  NotamExtractionPartial,
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
import { extractPdfText } from "@/lib/pdf-parse-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const FILES_API_BETA = "files-api-2025-04-14";

const FLIGHT_DATA_FALLBACK_PARTIAL: FlightDataExtractionPartial = {
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
  unidentified_fields: [
    "departure_icao",
    "arrival_icao",
    "departure_time",
    "arrival_time",
    "time_enroute",
    "departure_rwy",
    "arrival_rwy",
    "route",
    "aircraft_weight",
    "flight_plan_json",
  ],
};

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
    const normalizedPdfFilename = `${crypto.randomUUID()}.pdf`;

    const originalUploaded = await anthropic.beta.files.upload({
      file: await toFile(file, normalizedPdfFilename, {
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
    const { flightDetailsPdf, notamBatchPdfs } = await splitPdfBySplitterResult(
      originalPdfBytes,
      splitterResult,
    );

    const flightDataPartial = flightDetailsPdf
      ? await (async () => {
          const flightDetailsFileId = await uploadPdfBytes({
            anthropic,
            bytes: flightDetailsPdf,
            label: "flight-details",
            uploadedFileIds,
          });
          return await runFlightDataExtractionAgent({
            anthropic,
            flightDataFileId: flightDetailsFileId,
          });
        })()
      : FLIGHT_DATA_FALLBACK_PARTIAL;

    const flightExtraction = buildFullExtractionFromFlightData(flightDataPartial);
    const { fields, needsManualReview } = buildPersistedFields(
      flightExtraction,
      originalUploaded.id,
    );

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

    void runDetachedNotamPersistence({
      anthropic,
      supabase,
      flightId,
      notamBatchPdfs,
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
