import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  listRecentFlightsForUser,
  type UserRecentFlight,
} from "@/lib/flights";
import { listMyOrganisations } from "@/lib/organisations";
import { getProfileForUser } from "@/lib/profile";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function formatRoute(f: UserRecentFlight) {
  if (f.departure_icao && f.arrival_icao) {
    return `${f.departure_icao} → ${f.arrival_icao}`;
  }
  if (f.departure_icao) return f.departure_icao;
  if (f.arrival_icao) return f.arrival_icao;
  return "Route TBD";
}

export default async function AppHomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [profile, organisations, recent] = await Promise.all([
    getProfileForUser(user.id),
    listMyOrganisations(user.id),
    listRecentFlightsForUser(user.id, 6),
  ]);

  const displayName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "") ||
    user.email?.split("@")[0] ||
    "Operator";

  const firstName = displayName.split(/\s+/)[0];

  return (
    <main className="space-y-16">
      <header className="rise-in rise-in-1 space-y-2">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          {greeting()} · {new Date().toLocaleDateString(undefined, { dateStyle: "full" })}
        </p>
        <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <section className="rise-in rise-in-2 space-y-6">
        <SectionHeading
          eyebrow="Workspaces"
          title={`Where are you briefing today, ${firstName}?`}
          action={
            <Link
              href="/organisations/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "shadow-soft [a]:hover:bg-primary/90",
              )}
            >
              New organisation
            </Link>
          }
        />

        {organisations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-white/50 p-10 text-center">
            <p className="font-heading text-xl tracking-tight">
              You haven&apos;t joined an organisation yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create one to become its admin, or wait for an invite.
            </p>
            <Link
              href="/organisations/new"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-6 shadow-soft [a]:hover:bg-primary/90",
              )}
            >
              Create organisation
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organisations.map((org, i) => {
              const flightsHere = recent.filter(
                (r) => r.organisation_id === org.id,
              );
              return (
                <Link
                  key={org.id}
                  href={`/organisations/${org.id}`}
                  className={cn(
                    "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-white/80 p-6 transition-all duration-300",
                    "hover:-translate-y-0.5 hover:border-[oklch(0.6_0.1_285_/_0.5)] hover:bg-white hover:shadow-soft",
                    "rise-in",
                    i < 6 && `rise-in-${i + 1}`,
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.93_0.08_30)] to-[oklch(0.86_0.1_305)] font-heading text-lg text-[oklch(0.3_0.14_285)] ring-1 ring-[oklch(0.4_0.14_285_/_0.15)]"
                        aria-hidden
                      >
                        {org.name.trim()[0]?.toUpperCase() ?? "O"}
                      </span>
                      <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
                        Org
                      </span>
                    </div>
                    <h3 className="mt-5 font-heading text-xl tracking-tight text-foreground">
                      {org.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {flightsHere.length > 0
                        ? `${flightsHere.length} recent flight${flightsHere.length === 1 ? "" : "s"}`
                        : "No recent flights"}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Open dashboard</span>
                    <span
                      aria-hidden
                      className="inline-block text-[oklch(0.4_0.14_285)] transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="rise-in rise-in-3 space-y-6">
        <SectionHeading
          eyebrow="Recent"
          title="Your recent flights"
          description="Across every organisation you belong to."
        />

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-white/40 p-10 text-center text-sm text-muted-foreground">
            Nothing yet — once an organisation creates a flight, it shows up here.
          </div>
        ) : (
          <ul className="grid gap-3">
            {recent.map((f, i) => (
              <li
                key={f.id}
                className={cn(
                  "rise-in",
                  i < 6 && `rise-in-${i + 1}`,
                )}
              >
                <Link
                  href={`/organisations/${f.organisation_id}/flights/${f.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 rounded-2xl border border-border/60 bg-white/80 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[oklch(0.6_0.1_285_/_0.5)] hover:bg-white hover:shadow-soft sm:grid-cols-[auto_1fr_1fr_auto]"
                >
                  <span className="hidden flex-col items-center font-mono text-xs text-muted-foreground sm:flex">
                    <span className="font-heading text-xl text-foreground">
                      {new Date(f.created_at).toLocaleDateString(undefined, {
                        day: "2-digit",
                      })}
                    </span>
                    <span className="uppercase tracking-widest">
                      {new Date(f.created_at).toLocaleDateString(undefined, {
                        month: "short",
                      })}
                    </span>
                  </span>

                  <div className="min-w-0 space-y-1">
                    <p className="font-heading text-lg tracking-tight">
                      {formatRoute(f)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{f.tail_number}</span>
                      <span> · {f.aircraft_type}</span>
                      <span> · PIC {f.pic_name}</span>
                    </p>
                  </div>

                  <div className="hidden min-w-0 flex-col items-start justify-center sm:flex">
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
                      Organisation
                    </span>
                    <span className="truncate text-sm font-medium">
                      {f.organisation_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <StatusDot status={f.status} />
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
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div className="space-y-1">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="font-heading text-2xl tracking-tight text-foreground md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function StatusDot({ status }: { status: string | null }) {
  const label = (status ?? "draft").toLowerCase();
  const tone = label.includes("complete") || label.includes("closed")
    ? "bg-[oklch(0.7_0.14_150)]"
    : label.includes("flight") || label.includes("active")
      ? "bg-[oklch(0.7_0.16_50)]"
      : "bg-[oklch(0.65_0.04_285)]";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", tone)} />
      {status ?? "Draft"}
    </span>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
