import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { runNotamAnalysisForFlight } from "@/lib/notam-analysis-service";
import { assertUserCanAccessFlight } from "@/lib/flights";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
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

  const supabase = await createSupabaseServerClient();
  const result = await runNotamAnalysisForFlight(supabase, flightId);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false as const, error: result.error },
      { status: 400 },
    );
  }

  revalidatePath(`/organisations/${access.organisationId}`);
  revalidatePath(`/organisations/${access.organisationId}/flights/${flightId}`);

  return NextResponse.json({
    ok: true as const,
    analysisId: result.analysisId,
    analysed: result.analysed,
  });
}
