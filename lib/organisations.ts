import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrganisationSummary = {
  id: string;
  name: string;
  created_at: string;
};

export type MemberWithProfile = {
  user_id: string;
  role: string;
  is_admin: boolean;
  full_name: string;
  email: string;
};

export async function listMyOrganisations(
  userId: string,
): Promise<OrganisationSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: memberships, error: memError } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", userId);

  if (memError || !memberships?.length) return [];

  const orgIds = [
    ...new Set(memberships.map((m) => m.organisation_id as string)),
  ];

  const { data: orgs, error: orgError } = await supabase
    .from("organisations")
    .select("id, name, created_at")
    .in("id", orgIds)
    .order("name", { ascending: true });

  if (orgError || !orgs) return [];
  return orgs as OrganisationSummary[];
}

export async function assertOrgAccess(
  userId: string,
  organisationId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}

export async function isOrganisationAdmin(
  userId: string,
  organisationId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organisation_members")
    .select("is_admin")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data?.is_admin);
}

export async function getOrganisationName(organisationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", organisationId)
    .maybeSingle();

  return data?.name as string | undefined;
}

export async function listOrganisationMembers(
  organisationId: string,
): Promise<MemberWithProfile[]> {
  const supabase = await createSupabaseServerClient();
  const { data: members, error } = await supabase
    .from("organisation_members")
    .select("user_id, role, is_admin")
    .eq("organisation_id", organisationId);

  if (error || !members?.length) return [];

  const userIds = members.map((m) => m.user_id as string);
  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  if (pError || !profiles) return [];

  const profileById = new Map(
    profiles.map((p) => [p.id as string, p as { name: string; email: string }]),
  );

  return members.map((m) => {
    const p = profileById.get(m.user_id as string);
    return {
      user_id: m.user_id as string,
      role: (m.role as string) ?? "",
      is_admin: Boolean(m.is_admin),
      full_name: p?.name?.trim() || "—",
      email: p?.email?.trim() || "—",
    };
  });
}
