import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  countFlightsForAircraft,
  getAircraftById,
} from "@/lib/flights";
import {
  assertOrgAccess,
  getOrganisationName,
} from "@/lib/organisations";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ organisationId: string; aircraftId: string }>;
};

export default async function AircraftDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { organisationId, aircraftId } = await params;
  const hasAccess = await assertOrgAccess(user.id, organisationId);
  if (!hasAccess) notFound();

  const [aircraft, orgName, flightsCount] = await Promise.all([
    getAircraftById(aircraftId, organisationId),
    getOrganisationName(organisationId),
    countFlightsForAircraft(aircraftId),
  ]);

  if (!aircraft) notFound();

  return (
    <main className="space-y-12">
      <header className="rise-in rise-in-1 space-y-4">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Dashboard
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href={`/organisations/${organisationId}`}
            className="hover:text-foreground"
          >
            {orgName ?? "Organisation"}
          </Link>
          <span className="mx-1.5">/</span>
          <span>Aircraft</span>
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-5xl font-normal tracking-tight text-foreground md:text-6xl">
              <span className="font-mono text-[0.9em]">{aircraft.tail_number}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {aircraft.manufacturer} · {aircraft.type}
            </p>
          </div>
          <Link
            href={`/organisations/${organisationId}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "bg-white/60",
            )}
          >
            Back to organisation
          </Link>
        </div>
      </header>

      <section className="rise-in rise-in-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Flights" value={String(flightsCount)} />
        <Stat label="Seats" value={String(aircraft.seats ?? "—")} />
        <Stat label="Type" value={aircraft.type} />
        <Stat
          label="Wingspan"
          value={
            aircraft.wingspan != null
              ? `${aircraft.wingspan.toFixed(1)} m`
              : "—"
          }
        />
      </section>

      <section className="rise-in rise-in-3 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            eyebrow="Specifications"
            title="Airframe"
            description="Core identifiers Jet Ops uses to cross-reference flights."
          >
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <Field label="Manufacturer" value={aircraft.manufacturer} />
              <Field label="Type" value={aircraft.type} />
              <Field label="Tail number" value={aircraft.tail_number} mono />
              <Field label="Seats" value={String(aircraft.seats ?? "—")} />
              <Field
                label="Added"
                value={new Date(aircraft.created_at).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              />
              <Field label="Organisation" value={orgName ?? "—"} />
            </dl>
          </SectionCard>

          <SectionCard
            eyebrow="Coming soon"
            title="Deeper aircraft profile"
            description="Reserved for detailed airframe data — performance tables, maintenance status, dispatch notes — once wired up."
          >
            <div className="rounded-xl border border-dashed border-border/60 bg-white/40 p-6 text-sm text-muted-foreground">
              Nothing here yet.
            </div>
          </SectionCard>
        </div>

        <SectionCard
          eyebrow="Utilisation"
          title="Flight activity"
          description="How often this tail has been used inside Jet Ops."
        >
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                Total flights
              </p>
              <p className="mt-2 font-heading text-5xl tracking-tight tabular-nums">
                {flightsCount}
              </p>
            </div>
            <Link
              href={`/organisations/${organisationId}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full bg-white/60",
              )}
            >
              View flights
            </Link>
          </div>
        </SectionCard>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-white/70 p-5 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset]",
      )}
    >
      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl tracking-tight tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 p-6 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset,0_8px_30px_-24px_color-mix(in_oklch,var(--primary)_30%,transparent)]">
      <div className="mb-5">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-heading text-xl tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm text-foreground",
          mono && "font-mono tracking-tight",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
