import Link from "next/link";
import { headers } from "next/headers";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildAppEntryUrlFromHeaders } from "@/lib/hosts";

export default async function MarketingHomePage() {
  const headerList = await headers();
  const appUrl = buildAppEntryUrlFromHeaders(headerList);

  return (
    <main className="min-h-[calc(100vh)] bg-background">
      <div className="relative mx-auto grid min-h-[calc(100vh)] max-w-6xl grid-cols-1 items-center px-6 py-12 md:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_20%,oklch(0.985_0_0)_0%,transparent_55%),radial-gradient(75%_60%_at_80%_40%,oklch(0.97_0_0)_0%,transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <h1 className="text-2xl font-heading tracking-tight text-foreground">
              Jet Ops
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Marketing site for the Jet Ops MVP. Sign in lives on the app
              subdomain.
            </p>
            <Link
              href={appUrl}
              className={cn(buttonVariants(), "mt-6 inline-flex w-full")}
            >
              Go to App
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
