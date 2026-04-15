"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export type CreateOrgActionState = { error: string | null };

export async function createOrganisationAction(
  _prev: CreateOrgActionState,
  formData: FormData,
): Promise<CreateOrgActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to create an organisation." };
  }

  const organisationName = String(formData.get("organisation_name") ?? "").trim();
  const role = String(formData.get("member_role") ?? "").trim();

  if (!organisationName) {
    return { error: "Organisation name is required." };
  }
  if (!role) {
    return { error: "Your role in the organisation is required." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_organisation_with_admin", {
    p_name: organisationName,
    p_role: role,
  });

  if (error) {
    return { error: error.message };
  }

  const orgId = typeof data === "string" ? data : null;
  if (!orgId) {
    return { error: "Could not create organisation. Try again." };
  }

  revalidatePath("/");
  redirect(`/organisations/${orgId}`);
}
