import { NextResponse } from "next/server";
import Anthropic, { toFile } from "@anthropic-ai/sdk";

import { runFlightDataExtractionAgent } from "@/lib/flight-plan/agents/flight-data-extraction";
import { runFlightRouteWeatherTableAgent } from "@/lib/flight-plan/agents/flight-route-weather-extraction";
import { splitPdfBySplitterResult } from "@/lib/flight-plan/agents/pdf-splitter";
import { mergeFlightDataPartials } from "@/lib/flight-plan/merge-flight-data";
import { buildPersistedFields } from "@/lib/flight-plan/normalize";
import {
  FILES_API_BETA,
  downloadStoredFlightPlanPdf,
  ensureParseFlightAccess,
  parseExtractFlightPlanJsonBody,
} from "@/lib/flight-plan/parse-flight-plan-api";
import {
  type FlightDataExtractionPartial,
  type FlightPlanExtraction,
  FLIGHT_DATA_CORE_FALLBACK,
  ROUTE_PARTIAL_WHEN_NO_TABLE_PDF,
} from "@/lib/flight-plan/schemas";
import type { ExtractFlightPlanApiResponse } from "@/lib/flight-plan-parse";
import { applyParsedFlightPlanToFlight } from "@/lib/notam-analysis-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function buildFullExtractionFromFlightData(
  partial: FlightDataExtractionPartial,
): FlightPlanExtraction {
  return {
    ...partial,
    extracted_notams: { notams: [], unformatted_notams: [] },
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "JSON body required." },
      { status: 400 },
    );
  }

  const parsed = parseExtractFlightPlanJsonBody(json);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false as const, error: parsed.error },
      { status: 400 },
    );
  }

  const { organisationId, aircraftId, planPdfUuid, splitterResult } =
    parsed.body;
  const { flightId } = await context.params;

  const access = await ensureParseFlightAccess({
    supabase,
    userId: user.id,
    flightId,
    organisationId,
    aircraftId,
  });
  if (!access.ok) {
    return access.response;
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
    const stored = await downloadStoredFlightPlanPdf({
      supabase,
      organisationId,
      planPdfUuid,
    });
    if (!stored.ok) {
      return NextResponse.json(
        { ok: false as const, error: stored.error },
        { status: 404 },
      );
    }

    const originalPdfBytes = stored.bytes;

    const { flightDetailsPdf, routeWeatherTablePdf } =
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

    const flightDataPartial = mergeFlightDataPartials(corePartial, routePartial);
    const flightExtraction = buildFullExtractionFromFlightData(flightDataPartial);
    const { fields, needsManualReview } = buildPersistedFields(
      flightExtraction,
      planPdfUuid,
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

    const body: ExtractFlightPlanApiResponse = {
      ok: true,
      fields,
      needsManualReview,
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
      {
        ok: false as const,
        error: `Failed to extract flight plan: ${reason}`,
      },
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
