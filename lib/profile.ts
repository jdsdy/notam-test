import "server-only";

import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
};

export async function ensureProfile(user: User) {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;

  const fullName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "";

  await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? "",
    full_name: fullName,
  });
}

export async function getProfileForUser(
  userId: string,
): Promise<ProfileRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProfileRow;
}
