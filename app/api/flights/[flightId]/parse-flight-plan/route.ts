import { NextResponse } from "next/server";

import { buildDummyFlightPlanParseResponse } from "@/lib/flight-plan-parse";
import { assertUserCanAccessFlight } from "@/lib/flights";
import { getCurrentUser } from "@/lib/supabase/server";

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

  return NextResponse.json(buildDummyFlightPlanParseResponse());
}
