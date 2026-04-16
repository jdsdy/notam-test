import "server-only";

import { assertUserCanAccessFlight } from "@/lib/flights";
import {
  parseAnalysedNotamsPayload,
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

export async function getLatestNotamAnalysisForFlight(
  userId: string,
  organisationId: string,
  flightId: string,
): Promise<LatestNotamAnalysisForClient | null> {
  const access = await assertUserCanAccessFlight(userId, flightId);
  if (!access || access.organisationId !== organisationId) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notam_analyses")
    .select("id, flight_id, raw_notams, analysed_notams, created_at")
    .eq("flight_id", flightId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as NotamAnalysisRow;
  const analysed = parseAnalysedNotamsPayload(row.analysed_notams);
  if (!analysed) return null;

  return {
    id: row.id,
    createdAt: row.created_at,
    analysed,
  };
}
