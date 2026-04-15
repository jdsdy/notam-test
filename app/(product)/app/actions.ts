"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { aircraftInputSchema } from "@/lib/validation/aircraft";
import { organisationInputSchema } from "@/lib/validation/organisation";

export type WorkspaceActionState = {
  error?: string;
  success?: string;
};

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export async function createOrganisationAction(
  _: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const parsed = organisationInputSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid organisation name." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: organisation, error: organisationError } = await supabase
    .from("organisations")
    .insert({ name: parsed.data.name })
    .select("id,name")
    .single();

  if (organisationError || !organisation) {
    return {
      error:
        organisationError?.message ??
        "Unable to create organisation with your current permissions.",
    };
  }

  const { error: memberError } = await supabase.from("organisation_members").insert({
    organisation_id: organisation.id,
    user_id: user.id,
    is_admin: true,
  });

  if (memberError) {
    return {
      error: memberError.message,
    };
  }

  revalidatePath("/app/organisations");
  revalidatePath("/app/aircraft");

  return {
    success: `Organisation "${organisation.name}" created.`,
  };
}

export async function createAircraftAction(
  _: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const parsed = aircraftInputSchema.safeParse({
    organisationId: formData.get("organisationId"),
    tailNumber: formData.get("tailNumber"),
    manufacturer: formData.get("manufacturer"),
    type: formData.get("type"),
    seats: formData.get("seats"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid aircraft input." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", parsed.data.organisationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return {
      error: "You do not have access to the selected organisation.",
    };
  }

  const { error } = await supabase.from("aircraft").insert({
    organisation_id: parsed.data.organisationId,
    tail_number: parsed.data.tailNumber,
    manufacturer: parsed.data.manufacturer,
    type: parsed.data.type,
    seats: parsed.data.seats,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/aircraft");
  revalidatePath("/app/notams");

  return {
    success: `Aircraft ${parsed.data.tailNumber} added.`,
  };
}
