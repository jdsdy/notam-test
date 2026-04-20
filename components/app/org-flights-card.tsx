import Link from "next/link";

import CreateFlightDialog from "@/components/app/create-flight-dialog";
import type { AircraftRow } from "@/lib/aircraft";
import type { FlightSummary } from "@/lib/flights";
import type { MemberWithProfile } from "@/lib/organisations";
import { cn } from "@/lib/utils";

function formatRoute(f: FlightSummary) {
  if (f.departure_icao && f.arrival_icao) {
    return `${f.departure_icao} → ${f.arrival_icao}`;
  }
  if (f.departure_icao) return f.departure_icao;
  if (f.arrival_icao) return f.arrival_icao;
  return "Route TBD";
}

function statusTone(status: string | null) {
  const label = (status ?? "").toLowerCase();
  if (label.includes("complete") || label.includes("closed")) {
    return "bg-[oklch(0.95_0.06_150)] text-[oklch(0.35_0.16_150)]";
  }
  if (label.includes("flight") || label.includes("active")) {
    return "bg-[oklch(0.96_0.06_60)] text-[oklch(0.4_0.16_60)]";
  }
  return "bg-[oklch(0.95_0.02_300)] text-[oklch(0.4_0.05_285)]";
}

export default function OrgFlightsCard({
  organisationId,
  flights,
  aircraft,
  members,
}: {
  organisationId: string;
  flights: FlightSummary[];
  aircraft: AircraftRow[];
  members: MemberWithProfile[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset,0_8px_30px_-24px_color-mix(in_oklch,var(--primary)_30%,transparent)]">
      <header className="flex flex-col items-start justify-between gap-4 border-b border-border/50 px-6 py-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
            Ops
          </p>
          <h2 className="mt-1 font-heading text-2xl tracking-tight text-foreground">
            Flights
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a flight to parse a plan, brief the crew, and triage NOTAMs.
          </p>
        </div>
        <CreateFlightDialog
          organisationId={organisationId}
          aircraft={aircraft}
          members={members}
        />
      </header>

      {flights.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No flights yet. Use <span className="font-medium text-foreground">New flight</span>{" "}
          to start one.
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {flights.map((f, i) => (
            <li key={f.id} className={cn("rise-in", i < 6 && `rise-in-${i + 1}`)}>
              <Link
                href={`/organisations/${organisationId}/flights/${f.id}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-white md:grid-cols-[6rem_1fr_1fr_1fr_auto]"
              >
                <div className="hidden md:block">
                  <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                    Created
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-foreground tabular-nums">
                    {new Date(f.created_at).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground tabular-nums">
                    {new Date(f.created_at).toLocaleTimeString(undefined, {
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="min-w-0 md:col-span-1">
                  <p className="font-heading text-lg tracking-tight">
                    {formatRoute(f)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{f.tail_number}</span>
                    <span className="mx-1">·</span>
                    <span>{f.aircraft_type}</span>
                  </p>
                </div>

                <div className="hidden min-w-0 md:block">
                  <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                    PIC
                  </p>
                  <p className="mt-0.5 truncate text-sm">{f.pic_name}</p>
                </div>

                <div className="hidden md:block">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider",
                      statusTone(f.status),
                    )}
                  >
                    {f.status ?? "Draft"}
                  </span>
                </div>

                <div className="flex items-center justify-end text-muted-foreground">
                  <span
                    aria-hidden
                    className="text-[oklch(0.4_0.14_285)] transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
