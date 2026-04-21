import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { enforceAnalyseNotamsRateLimit } from "@/lib/api-rate-limit";
import { runNotamAnalysisForFlight } from "@/lib/notam-analysis-service";
import { assertUserCanAccessFlight } from "@/lib/flights";
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

  const rateLimit = await enforceAnalyseNotamsRateLimit(user.id);
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const organisationId =
    body &&
    typeof body === "object" &&
    "organisationId" in body &&
    typeof (body as { organisationId: unknown }).organisationId === "string"
      ? (body as { organisationId: string }).organisationId.trim()
      : "";

  if (!organisationId) {
    return NextResponse.json(
      { ok: false as const, error: "organisationId is required in the JSON body." },
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
      { ok: false as const, error: "Forbidden" },
      { status: 403 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const result = await runNotamAnalysisForFlight(supabase, flightId, organisationId);

  if (!result.ok) {
    const upstream =
      result.error.startsWith("Anthropic request failed") ||
      result.error.startsWith("NOTAM analysis failed");
    return NextResponse.json(
      { ok: false as const, error: result.error },
      { status: upstream ? 502 : 400 },
    );
  }

  revalidatePath(`/organisations/${organisationId}`);
  revalidatePath(`/organisations/${organisationId}/flights/${flightId}`);

  return NextResponse.json({
    ok: true as const,
    analysisId: result.analysisId,
    analysed: result.analysed,
  });
}
