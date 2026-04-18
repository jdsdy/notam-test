import Link from "next/link";
import { notFound } from "next/navigation";

import FlightWorkspace from "@/components/app/flight-workspace";
import { buttonVariants } from "@/components/ui/button";
import { getFlightDetailForUser } from "@/lib/flights";
import { getNotamAnalysisWorkspaceState } from "@/lib/notam-analyses";
import {
  assertOrgAccess,
  getOrganisationName,
} from "@/lib/organisations";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ organisationId: string; flightId: string }>;
};

export default async function FlightPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { organisationId, flightId } = await params;
  const hasAccess = await assertOrgAccess(user.id, organisationId);
  if (!hasAccess) {
    notFound();
  }

  const [name, flight, notamWorkspace] = await Promise.all([
    getOrganisationName(organisationId),
    getFlightDetailForUser(user.id, organisationId, flightId),
    getNotamAnalysisWorkspaceState(user.id, organisationId, flightId),
  ]);

  if (!flight) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6">
      <div className="mb-2 space-y-1">
        <p className="text-xs text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Dashboard
          </Link>
          <span className="px-1">/</span>
          <Link
            href={`/organisations/${organisationId}`}
            className="underline-offset-4 hover:underline"
          >
            {name ?? "Organisation"}
          </Link>
          <span className="px-1">/</span>
          <span>Flight</span>
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              {flight.departure_icao && flight.arrival_icao
                ? `${flight.departure_icao} → ${flight.arrival_icao}`
                : "Flight workspace"}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{flight.tail_number}</span>
              <span> · {flight.aircraft_type}</span>
              <span className="px-1">·</span>
              PIC {flight.pic_name}
            </p>
          </div>
          <Link
            href={`/organisations/${organisationId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to organisation
          </Link>
        </div>
      </div>

      <FlightWorkspace
        organisationId={organisationId}
        flight={flight}
        notamWorkspace={notamWorkspace}
      />
    </main>
  );
}
