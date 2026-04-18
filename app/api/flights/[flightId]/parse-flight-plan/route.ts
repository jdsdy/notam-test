import { NextResponse } from "next/server";

import {
  applyParsedFlightPlanToFlight,
  upsertPendingNotamAnalysis,
} from "@/lib/notam-analysis-service";
import {
  buildDummyFlightPlanParseResponse,
  withParseResponseMeta,
} from "@/lib/flight-plan-parse";
import { assertUserCanAccessFlight } from "@/lib/flights";
import { parseRawNotamsFromFlightPlanJson } from "@/lib/notams";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ flightId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false as const, error: "Unauthorized" },
      { status: 401 },
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

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (file instanceof File && file.size === 0) {
      return NextResponse.json(
        { ok: false as const, error: "Empty file upload." },
        { status: 400 },
      );
    }
  }

  const base = buildDummyFlightPlanParseResponse();
  const supabase = await createSupabaseServerClient();

  const applied = await applyParsedFlightPlanToFlight(
    supabase,
    flightId,
    access.organisationId,
    base.fields,
  );
  if (!applied.ok) {
    return NextResponse.json(
      { ok: false as const, error: applied.error },
      { status: 400 },
    );
  }

  const rawPayload = parseRawNotamsFromFlightPlanJson(base.fields.flight_plan_json);
  const { notamAnalysisId } = await upsertPendingNotamAnalysis(
    supabase,
    flightId,
    rawPayload,
  );

  const notamsIdentified = rawPayload?.notams.length
    ? rawPayload.notams
    : base.notamsIdentified;

  const body = withParseResponseMeta(base, {
    notamAnalysisId,
    notamsIdentified,
  });

  return NextResponse.json(body);
}
