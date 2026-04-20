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
  if (!user) return null;

  const { organisationId, flightId } = await params;
  const hasAccess = await assertOrgAccess(user.id, organisationId);
  if (!hasAccess) notFound();

  const [name, flight, notamWorkspace] = await Promise.all([
    getOrganisationName(organisationId),
    getFlightDetailForUser(user.id, organisationId, flightId),
    getNotamAnalysisWorkspaceState(user.id, organisationId, flightId),
  ]);

  if (!flight) notFound();

  const title =
    flight.departure_icao && flight.arrival_icao
      ? `${flight.departure_icao} → ${flight.arrival_icao}`
      : "Flight brief";

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
          <span>Flight</span>
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{flight.tail_number}</span>
              <span className="mx-1.5">·</span>
              {flight.aircraft_type}
              <span className="mx-1.5">·</span>
              PIC {flight.pic_name}
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

      <FlightWorkspace
        organisationId={organisationId}
        flight={flight}
        notamWorkspace={notamWorkspace}
      />
    </main>
  );
}
