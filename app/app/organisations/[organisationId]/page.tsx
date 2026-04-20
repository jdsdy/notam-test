import Link from "next/link";
import { notFound } from "next/navigation";

import OrgFlightsCard from "@/components/app/org-flights-card";
import OrgFleetSummaryCard from "@/components/app/org-fleet-summary-card";
import OrgMembersSummaryCard from "@/components/app/org-members-summary-card";
import { buttonVariants } from "@/components/ui/button";
import { listAircraftForOrganisation } from "@/lib/aircraft";
import { listFlightsForOrganisation } from "@/lib/flights";
import {
  assertOrgAccess,
  getOrganisationName,
  isOrganisationAdmin,
  listOrganisationMembers,
} from "@/lib/organisations";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ organisationId: string }>;
};

export default async function OrganisationManagePage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { organisationId } = await params;
  const hasAccess = await assertOrgAccess(user.id, organisationId);
  if (!hasAccess) notFound();

  const [name, members, aircraft, flights, canManageFleet] = await Promise.all([
    getOrganisationName(organisationId),
    listOrganisationMembers(organisationId),
    listAircraftForOrganisation(organisationId),
    listFlightsForOrganisation(organisationId),
    isOrganisationAdmin(user.id, organisationId),
  ]);

  const admins = members.filter((m) => m.is_admin);

  return (
    <main className="space-y-12">
      <header className="rise-in rise-in-1 flex flex-col gap-6 border-b border-border/50 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Dashboard
            </Link>
            <span className="mx-1.5">/</span>
            <span>Organisation</span>
          </p>
          <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
            {name ?? "Organisation"}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/70 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.12_285)]" />
              {members.length} member{members.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/70 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.13_40)]" />
              {aircraft.length} aircraft
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/70 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.6_0.12_150)]" />
              {flights.length} flight{flights.length === 1 ? "" : "s"}
            </span>
            {canManageFleet ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.85_0.1_285)] bg-[oklch(0.97_0.04_285)] px-2.5 py-1 text-[oklch(0.35_0.14_285)]">
                Admin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/70 px-2.5 py-1">
                Member
              </span>
            )}
          </div>
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
      </header>

      <section className="rise-in rise-in-2 grid gap-6 lg:grid-cols-2">
        <OrgFleetSummaryCard organisationId={organisationId} count={aircraft.length} />
        <OrgMembersSummaryCard
          organisationId={organisationId}
          memberCount={members.length}
          adminCount={admins.length}
        />
      </section>

      <section className="rise-in rise-in-3">
        <OrgFlightsCard
          organisationId={organisationId}
          flights={flights}
          aircraft={aircraft}
          members={members}
        />
      </section>
    </main>
  );
}
