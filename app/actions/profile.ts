"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export type ProfileActionState = { error: string | null; ok?: boolean };

export async function updateProfileNameAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to update your profile." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) {
    return { error: "Please enter your name." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email: user.email ?? "",
    },
    { onConflict: "id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null, ok: true };
}
