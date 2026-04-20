"use server";

import { revalidatePath } from "next/cache";

import { isValidManufacturerAndType } from "@/lib/aircraft-catalog";
import { isOrganisationAdmin } from "@/lib/organisations";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export type CreateAircraftResult = { error: string | null };

export async function createAircraftAction(input: {
  organisationId: string;
  manufacturer: string;
  aircraftType: string;
  tailNumber: string;
  seats: number;
  wingspan: number;
}): Promise<CreateAircraftResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const isAdmin = await isOrganisationAdmin(user.id, input.organisationId);
  if (!isAdmin) {
    return { error: "Only organisation administrators can add aircraft." };
  }

  const tail = input.tailNumber.trim();
  if (!tail) {
    return { error: "Tail number is required." };
  }

  if (!isValidManufacturerAndType(input.manufacturer, input.aircraftType)) {
    return { error: "Invalid manufacturer or aircraft type." };
  }

  const seats =
    Number.isFinite(input.seats) && input.seats >= 0
      ? Math.floor(input.seats)
      : 0;

  if (
    !Number.isFinite(input.wingspan) ||
    input.wingspan <= 0
  ) {
    return { error: "Wingspan must be a positive number (meters)." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("aircraft").insert({
    organisation_id: input.organisationId,
    manufacturer: input.manufacturer,
    type: input.aircraftType,
    tail_number: tail,
    seats,
    wingspan: input.wingspan,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/organisations/${input.organisationId}`);
  return { error: null };
}
