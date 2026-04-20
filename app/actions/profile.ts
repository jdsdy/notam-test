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
  revalidatePath("/profile");
  return { error: null, ok: true };
}

export async function updateProfileEmailAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Please enter an email." };
  }
  if (email === user.email) {
    return { error: "That is already your current email." };
  }

  const supabase = await createSupabaseServerClient();
  const { error: authError } = await supabase.auth.updateUser({ email });
  if (authError) {
    return { error: authError.message };
  }

  // Mirror the change on the profiles row so list queries see it immediately.
  await supabase
    .from("profiles")
    .update({ email })
    .eq("id", user.id);

  revalidatePath("/profile");
  return { error: null, ok: true };
}

export async function updateProfilePasswordAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  return { error: null, ok: true };
}
