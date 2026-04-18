import "server-only";

import { assertUserCanAccessFlight } from "@/lib/flights";
import {
  parseAnalysedNotamsPayload,
  parseRawNotamsFromFlightPlanJson,
  type LatestNotamAnalysisForClient,
} from "@/lib/notams";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type NotamAnalysisRow = {
  id: string;
  flight_id: string;
  raw_notams: unknown;
  analysed_notams: unknown;
  created_at: string;
};

/** Pending extraction row (upload/parse done; AI not run yet). */
export type PendingNotamAnalysis = {
  id: string;
  createdAt: string;
  rawNotamCount: number;
};

export type NotamAnalysisWorkspaceState = {
  pending: PendingNotamAnalysis | null;
  latestComplete: LatestNotamAnalysisForClient | null;
};

export async function getNotamAnalysisWorkspaceState(
  userId: string,
  organisationId: string,
  flightId: string,
): Promise<NotamAnalysisWorkspaceState> {
  const access = await assertUserCanAccessFlight(userId, flightId);
  if (!access || access.organisationId !== organisationId) {
    return { pending: null, latestComplete: null };
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: pendingRow }, { data: completeRow }] = await Promise.all([
    supabase
      .from("notam_analyses")
      .select("id, raw_notams, created_at")
      .eq("flight_id", flightId)
      .is("analysed_notams", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notam_analyses")
      .select("id, analysed_notams, created_at")
      .eq("flight_id", flightId)
      .not("analysed_notams", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let pending: PendingNotamAnalysis | null = null;
  if (pendingRow) {
    const raw = parseRawNotamsFromFlightPlanJson(
      pendingRow.raw_notams &&
        typeof pendingRow.raw_notams === "object" &&
        !Array.isArray(pendingRow.raw_notams)
        ? (pendingRow.raw_notams as Record<string, unknown>)
        : null,
    );
    const rawNotamCount = raw?.notams.length ?? 0;
    pending = {
      id: pendingRow.id as string,
      createdAt: pendingRow.created_at as string,
      rawNotamCount,
    };
  }

  let latestComplete: LatestNotamAnalysisForClient | null = null;
  if (completeRow) {
    const analysed = parseAnalysedNotamsPayload(completeRow.analysed_notams);
    if (analysed) {
      latestComplete = {
        id: completeRow.id as string,
        createdAt: completeRow.created_at as string,
        analysed,
      };
    }
  }

  return { pending, latestComplete };
}
