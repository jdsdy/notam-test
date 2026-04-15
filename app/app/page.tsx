import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <main className="min-h-[calc(100vh)] bg-background">
      <div className="mx-auto flex min-h-[calc(100vh)] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="mt-1 font-mono text-sm text-foreground">
            {user.email ?? user.id}
          </p>
          <h2 className="mt-6 text-balance font-heading text-2xl tracking-tight">
            Success — you’re in.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This is the MVP app surface at <span className="font-mono">/app</span>
            .
          </p>
          <form action={signOut} className="mt-6">
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

