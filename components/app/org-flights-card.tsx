import Link from "next/link";

import CreateFlightDialog from "@/components/app/create-flight-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  return "—";
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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Flights</CardTitle>
          <CardDescription>
            Create a flight to capture aircraft, PIC, and flight plan details, then
            analyse NOTAMs for that trip.
          </CardDescription>
        </div>
        <CreateFlightDialog
          organisationId={organisationId}
          aircraft={aircraft}
          members={members}
        />
      </CardHeader>
      <CardContent>
        {flights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No flights yet. Use &quot;New flight&quot; to start one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flights.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {new Date(f.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-medium">{f.tail_number}</span>
                    <span className="text-muted-foreground"> · {f.aircraft_type}</span>
                  </TableCell>
                  <TableCell>{f.pic_name}</TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal">
                    {formatRoute(f)}
                  </TableCell>
                  <TableCell>{f.status ?? "—"}</TableCell>
                  <TableCell className="text-end">
                    <Link
                      href={`/organisations/${organisationId}/flights/${f.id}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
