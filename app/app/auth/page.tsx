import { JetOpsMark } from "@/components/brand/jet-ops-mark";
import AuthCard from "@/components/auth/auth-card";
import Link from "next/link";
import { headers } from "next/headers";

import { buildMarketingEntryUrlFromHeaders } from "@/lib/hosts";

export default async function AppAuthPage() {
  const headerList = await headers();
  const marketingUrl = buildMarketingEntryUrlFromHeaders(headerList);

  return (
    <main className="relative flex min-h-[100svh] flex-col">
      <header className="px-6 py-6 md:px-10">
        <JetOpsMark tagline="Private MVP" />
      </header>

      <section className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <aside className="hidden lg:col-span-6 lg:block">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">
                Welcome back · Testing phase
              </p>
              <h1 className="mt-6 font-heading text-5xl leading-[1.05] tracking-tight text-foreground">
                A simpler <span className="italic text-[oklch(0.38_0.16_285)]">experience</span>{" "}
                for pre-flight.
              </h1>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
                Sign in to access the app, plan flights, manage your organisation, and analyse NOTAMs.
              </p>

              <div className="mt-10 grid max-w-md gap-3">
                {[
                  "PDF → flight plan fields in a single upload",
                  "NOTAMs sorted into three priority tiers",
                  "One roster per org, admin-controlled",
                ].map((line) => (
                  <p
                    key={line}
                    className="flex items-start gap-3 rounded-lg border border-border/50 bg-white/60 px-4 py-3 text-sm text-foreground backdrop-blur"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.45rem] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.55_0.15_285)]"
                    />
                    {line}
                  </p>
                ))}
              </div>

              <div className="mt-6">
                <Link
                  href={marketingUrl}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Back to landing page
                </Link>
              </div>
            </aside>

            <div className="lg:col-span-6">
              <div className="halo mx-auto w-full max-w-md">
                <AuthCard />
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  By continuing, you agree this environment is for private testing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 md:px-10">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground">
          © {new Date().getFullYear()} Jet Ops — Not for operational use
        </p>
      </footer>
    </main>
  );
}
