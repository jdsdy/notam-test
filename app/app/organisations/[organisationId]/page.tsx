import Link from "next/link";
import { notFound } from "next/navigation";

import OrgAircraftFleet from "@/components/app/org-aircraft-fleet";
import OrgFlightsCard from "@/components/app/org-flights-card";
import OrgMembersTables from "@/components/app/org-members-tables";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  if (!user) {
    return null;
  }

  const { organisationId } = await params;
  const hasAccess = await assertOrgAccess(user.id, organisationId);
  if (!hasAccess) {
    notFound();
  }

  const [name, members, aircraft, flights, canManageFleet] = await Promise.all([
    getOrganisationName(organisationId),
    listOrganisationMembers(organisationId),
    listAircraftForOrganisation(organisationId),
    listFlightsForOrganisation(organisationId),
    isOrganisationAdmin(user.id, organisationId),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Dashboard
            </Link>
            <span className="px-1">/</span>
            <span>Organisation</span>
          </p>
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {name ?? "Organisation"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Members are grouped by administrator access.
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to dashboard
        </Link>
      </div>

      <OrgAircraftFleet
        organisationId={organisationId}
        aircraft={aircraft}
        canManage={canManageFleet}
      />

      <OrgFlightsCard
        organisationId={organisationId}
        flights={flights}
        aircraft={aircraft}
        members={members}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Names and emails come from user profiles. Administrators are listed
            first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgMembersTables members={members} />
        </CardContent>
      </Card>
    </main>
  );
}
