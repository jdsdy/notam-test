import Link from "next/link";
import { notFound } from "next/navigation";

import OrgFleetList from "@/components/app/org-fleet-list";
import { buttonVariants } from "@/components/ui/button";
import { listAircraftForOrganisation } from "@/lib/aircraft";
import {
  assertOrgAccess,
  getOrganisationName,
  isOrganisationAdmin,
} from "@/lib/organisations";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ organisationId: string }>;
};

export default async function OrganisationFleetPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { organisationId } = await params;
  const hasAccess = await assertOrgAccess(user.id, organisationId);
  if (!hasAccess) notFound();

  const [name, aircraft, canManage] = await Promise.all([
    getOrganisationName(organisationId),
    listAircraftForOrganisation(organisationId),
    isOrganisationAdmin(user.id, organisationId),
  ]);

  return (
    <main className="space-y-10">
      <header className="rise-in rise-in-1 space-y-4 border-b border-border/50 pb-8">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Dashboard
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href={`/organisations/${organisationId}`}
            className="hover:text-foreground"
          >
            {name ?? "Organisation"}
          </Link>
          <span className="mx-1.5">/</span>
          <span>Fleet</span>
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
              Fleet
            </h1>
            <p className="text-sm text-muted-foreground">
              {aircraft.length} aircraft · Tail numbers link to detail
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

      <section className="rise-in rise-in-2">
        <OrgFleetList
          organisationId={organisationId}
          aircraft={aircraft}
          canManage={canManage}
        />
      </section>
    </main>
  );
}
