import Link from "next/link";

import CreateOrganisationForm from "@/components/app/create-organisation-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NewOrganisationPage() {
  return (
    <main className="space-y-10">
      <header className="rise-in rise-in-1 space-y-4 border-b border-border/50 pb-8">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Dashboard
          </Link>
          <span className="mx-1.5">/</span>
          <span>New organisation</span>
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
              Open a new <span className="italic text-[oklch(0.4_0.14_285)]">workspace</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Organisations hold your fleet, members, and flight records. You
              will be added as an administrator so you can invite the rest of
              the team next.
            </p>
          </div>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "bg-white/60",
            )}
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="rise-in rise-in-2 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <CreateOrganisationForm />

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-white/60 p-6 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset]">
            <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
              What happens next
            </p>
            <h2 className="mt-1 font-heading text-lg tracking-tight">
              A quick setup
            </h2>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
              <Step n={1}>
                <span className="text-foreground">Name your organisation.</span>{" "}
                You can rename it later.
              </Step>
              <Step n={2}>
                <span className="text-foreground">Describe your role.</span>{" "}
                Appears on the members list.
              </Step>
              <Step n={3}>
                <span className="text-foreground">Invite the crew.</span> Add
                pilots, aircraft, and start logging flights.
              </Step>
            </ol>
          </div>
          <div className="rounded-2xl border border-dashed border-border/70 bg-white/40 p-6">
            <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
              Heads up
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              You can belong to multiple organisations. Jet Ops keeps flights,
              fleets, and NOTAM feedback cleanly separated per workspace.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border/70 bg-white/80 font-mono text-[0.68rem] text-foreground">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
