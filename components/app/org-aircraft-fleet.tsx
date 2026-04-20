import Link from "next/link";

import AddAircraftWizard from "@/components/app/add-aircraft-wizard";
import type { AircraftRow } from "@/lib/aircraft";
import { cn } from "@/lib/utils";

export default function OrgAircraftFleet({
  organisationId,
  aircraft,
  canManage,
}: {
  organisationId: string;
  aircraft: AircraftRow[];
  canManage: boolean;
}) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset,0_8px_30px_-24px_color-mix(in_oklch,var(--primary)_30%,transparent)]">
      <header className="flex items-start justify-between gap-4 border-b border-border/50 px-6 py-5">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
            Fleet
          </p>
          <h2 className="mt-1 font-heading text-xl tracking-tight text-foreground">
            Aircraft
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {aircraft.length} registered ·{" "}
            {canManage ? "Select a row for details" : "Read-only"}
          </p>
        </div>
        {canManage ? <AddAircraftWizard organisationId={organisationId} /> : null}
      </header>

      <div className="flex-1 p-2">
        {aircraft.length === 0 ? (
          <div className="m-4 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/60 bg-white/40 px-6 py-8 text-center text-sm text-muted-foreground">
            No aircraft in this fleet yet.
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {aircraft.map((a, i) => (
              <li
                key={a.id}
                className={cn(
                  "rise-in",
                  i < 6 && `rise-in-${i + 1}`,
                )}
              >
                <Link
                  href={`/organisations/${organisationId}/aircraft/${a.id}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/60"
                >
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-white/80 font-mono text-[0.65rem] font-medium text-foreground"
                  >
                    AC
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-medium text-foreground">
                      {a.tail_number}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.type}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground transition group-hover:text-foreground">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
