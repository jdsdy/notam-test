import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Tables } from "@/lib/types/database";

export type OrganisationMembership = {
  organisationId: string;
  organisationName: string;
  isAdmin: boolean;
};

export type AircraftRecord = Pick<
  Tables<"aircraft">,
  "id" | "organisation_id" | "tail_number" | "manufacturer" | "type" | "seats"
> & {
  organisationName: string;
};

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getOrganisationMemberships(
  userId: string,
): Promise<OrganisationMembership[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organisation_members")
    .select("organisation_id,is_admin,organisations(id,name)")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => {
      const organisation = Array.isArray(row.organisations)
        ? row.organisations[0]
        : row.organisations;

      if (!organisation) {
        return null;
      }

      return {
        organisationId: row.organisation_id,
        organisationName: organisation.name,
        isAdmin: row.is_admin,
      };
    })
    .filter((row): row is OrganisationMembership => Boolean(row));
}

export async function getAircraftForOrganisations(
  organisationIds: string[],
): Promise<AircraftRecord[]> {
  if (organisationIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("aircraft")
    .select("id,organisation_id,tail_number,manufacturer,type,seats,organisations(name)")
    .in("organisation_id", organisationIds)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    organisation_id: row.organisation_id,
    tail_number: row.tail_number,
    manufacturer: row.manufacturer,
    type: row.type,
    seats: row.seats,
    organisationName: Array.isArray(row.organisations)
      ? (row.organisations[0]?.name ?? "Unknown")
      : (row.organisations?.name ?? "Unknown"),
  }));
}
