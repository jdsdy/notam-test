"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthPasswordResult =
  | { ok: true }
  | { ok: true; pendingEmailConfirmation: true }
  | { ok: false; message: string };

export async function signInWithPassword(
  formData: FormData,
): Promise<AuthPasswordResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
}

export async function signUpWithPassword(
  formData: FormData,
): Promise<AuthPasswordResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    return {
      ok: false as const,
      message: "This email is already registered. Try signing in instead.",
    };
  }

  if (!data.session) {
    return { ok: true as const, pendingEmailConfirmation: true };
  }

  return { ok: true as const };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true as const };
}
