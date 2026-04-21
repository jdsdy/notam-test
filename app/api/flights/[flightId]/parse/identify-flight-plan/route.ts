import { NextResponse } from "next/server";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";

import { enforceParseFlightPlanRateLimit } from "@/lib/api-rate-limit";
import { runPdfSplitterAgent } from "@/lib/flight-plan/agents/pdf-splitter";
import {
  FILES_API_BETA,
  ensureParseFlightAccess,
  persistOriginalFlightPlanPdf,
} from "@/lib/flight-plan/parse-flight-plan-api";
import type { IdentifyFlightPlanApiResponse } from "@/lib/flight-plan-parse";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    const originalPdfBytes = new Uint8Array(await file.arrayBuffer());
    const planPdfUuid = crypto.randomUUID();
    const normalizedPdfFilename = `${planPdfUuid}.pdf`;

    const doc = await PDFDocument.load(originalPdfBytes);
    const totalPages = doc.getPageCount();

    const originalUploaded = await anthropic.beta.files.upload({
      file: await toFile(originalPdfBytes, normalizedPdfFilename, {
        type: file.type || "application/pdf",
      }),
      betas: [FILES_API_BETA],
    });
    uploadedFileIds.push(originalUploaded.id);

    const [, splitterResult] = await Promise.all([
      persistOriginalFlightPlanPdf({
        supabase,
        organisationId,
        planPdfUuid,
        originalPdfBytes,
      }),
      runPdfSplitterAgent({
        anthropic,
        originalFileId: originalUploaded.id,
        originalPdfBytes,
      }),
    ]);

    const body: IdentifyFlightPlanApiResponse = {
      ok: true,
      planPdfUuid,
      splitterResult,
      totalPages,
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
        error: `Failed to identify flight plan: ${reason}`,
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
