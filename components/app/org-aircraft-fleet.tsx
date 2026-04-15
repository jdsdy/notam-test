import AddAircraftWizard from "@/components/app/add-aircraft-wizard";
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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Fleet</CardTitle>
          <CardDescription>
            Aircraft registered to this organisation.
            {!canManage
              ? " You can view the fleet; only administrators can add aircraft."
              : " Add aircraft with manufacturer, type, tail number, and optional seating."}
          </CardDescription>
        </div>
        {canManage ? <AddAircraftWizard organisationId={organisationId} /> : null}
      </CardHeader>
      <CardContent>
        {aircraft.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No aircraft in this fleet yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tail</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Seats</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircraft.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {a.tail_number}
                  </TableCell>
                  <TableCell>{a.manufacturer}</TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.seats}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
