import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(product)/app/actions";
import { ProductShell } from "@/components/product-shell";
import { ensureProfileForUser } from "@/lib/profiles/ensure-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await ensureProfileForUser(user);

  return (
    <ProductShell
      userEmail={user.email}
      userName={
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
        user.email
      }
      headerActions={
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-slate-500"
          >
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </ProductShell>
  );
}
