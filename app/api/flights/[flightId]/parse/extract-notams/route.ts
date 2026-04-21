import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { splitPdfBySplitterResult } from "@/lib/flight-plan/agents/pdf-splitter";
import { extractedNotamsToRawPayload } from "@/lib/flight-plan/normalize";
import { runNotamExtractionOnTextChunks } from "@/lib/flight-plan/notam-text-split";
import {
  downloadStoredFlightPlanPdf,
  ensureParseFlightAccess,
  parseExtractFlightPlanJsonBody,
} from "@/lib/flight-plan/parse-flight-plan-api";
import {
  type FlightPlanExtraction,
  type NotamExtractionPartial,
} from "@/lib/flight-plan/schemas";
import type { ExtractNotamsFromPlanApiResponse } from "@/lib/flight-plan-parse";
import {
  markPendingNotamExtraction,
  upsertPendingNotamAnalysis,
} from "@/lib/notam-analysis-service";
import { extractPdfText } from "@/lib/pdf-parse-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  try {
    await markPendingNotamExtraction(supabase, flightId);

    const stored = await downloadStoredFlightPlanPdf({
      supabase,
      organisationId,
      planPdfUuid,
    });
    if (!stored.ok) {
      await upsertPendingNotamAnalysis(supabase, flightId, null).catch(
        () => undefined,
      );
      return NextResponse.json(
        { ok: false as const, error: stored.error },
        { status: 404 },
      );
    }

    const { notamBatchPdfs } = await splitPdfBySplitterResult(
      stored.bytes,
      splitterResult,
    );

    if (notamBatchPdfs.length === 0) {
      await upsertPendingNotamAnalysis(supabase, flightId, null);
      const body: ExtractNotamsFromPlanApiResponse = {
        ok: true,
        notamAnalysisId: null,
      };
      return NextResponse.json(body);
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

    const { notamAnalysisId } = await upsertPendingNotamAnalysis(
      supabase,
      flightId,
      rawPayload,
    );

    const body: ExtractNotamsFromPlanApiResponse = {
      ok: true,
      notamAnalysisId,
    };

    return NextResponse.json(body);
  } catch (error) {
    await upsertPendingNotamAnalysis(supabase, flightId, null).catch(
      () => undefined,
    );

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
    console.error("[extract-notams]", error);
    return NextResponse.json(
      {
        ok: false as const,
        error: `Failed to extract NOTAMs: ${reason}`,
      },
      { status: 500 },
    );
  }
}
