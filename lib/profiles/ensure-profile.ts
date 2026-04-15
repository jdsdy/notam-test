import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function ensureProfileForUser(user: User) {
  const supabase = await createSupabaseServerClient();

  const payload = {
    id: user.id,
    email: user.email ?? "",
    display_name:
      (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
      (user.email?.split("@")[0] ?? "JetOps User"),
    role: "user",
  };

  await supabase.from("profiles").upsert(payload);
}
