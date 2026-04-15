"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ensureProfileForUser } from "@/lib/profiles/ensure-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authSignInSchema, authSignUpSchema } from "@/lib/validation/auth";

export type AuthActionState = {
  error?: string;
  success?: string;
};

export async function signInAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = authSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid sign-in input." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/app");
}

export async function signUpAction(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = authSignUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid sign-up input." };
  }

  const supabase = await createSupabaseServerClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: origin ? `${origin}/auth` : undefined,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && data.session) {
    await ensureProfileForUser(data.user);
    redirect("/app");
  }

  return {
    success:
      "Account created. Check your email for verification before signing in.",
  };
}
