import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AircraftRow = {
  id: string;
  organisation_id: string;
  manufacturer: string;
  type: string;
  tail_number: string;
  seats: number;
  /** Meters; present when `aircraft.wingspan` is set in the database. */
  wingspan?: number | null;
  created_at: string;
};

export async function listAircraftForOrganisation(
  organisationId: string,
): Promise<AircraftRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("aircraft")
    .select(
      "id, organisation_id, manufacturer, type, tail_number, seats, wingspan, created_at",
    )
    .eq("organisation_id", organisationId)
    .order("tail_number", { ascending: true });

  if (error || !data) return [];
  return data as AircraftRow[];
}
