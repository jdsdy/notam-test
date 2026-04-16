"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createFlightAction } from "@/app/actions/flight";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AircraftRow } from "@/lib/aircraft";
import type { MemberWithProfile } from "@/lib/organisations";

function sortMembersForPic(members: MemberWithProfile[]) {
  return [...members].sort((a, b) => {
    if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
    return a.full_name.localeCompare(b.full_name);
  });
}

export default function CreateFlightDialog({
  organisationId,
  aircraft,
  members,
}: {
  organisationId: string;
  aircraft: AircraftRow[];
  members: MemberWithProfile[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [aircraftId, setAircraftId] = React.useState<string | null>(null);
  const [picId, setPicId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const sortedMembers = React.useMemo(() => sortMembersForPic(members), [members]);

  function reset() {
    setAircraftId(null);
    setPicId(null);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit() {
    setError(null);
    if (!aircraftId) {
      setError("Select an aircraft.");
      return;
    }
    if (!picId) {
      setError("Select the pilot in command.");
      return;
    }

    startTransition(async () => {
      const res = await createFlightAction({
        organisationId,
        aircraftId,
        picId,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      handleOpenChange(false);
      router.push(`/organisations/${organisationId}/flights/${res.flightId}`);
    });
  }

  const canCreate = aircraft.length > 0 && members.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />} disabled={!canCreate}>
        New flight
      </DialogTrigger>
      <DialogContent className="gap-6 sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>New flight</DialogTitle>
          <DialogDescription>
            Choose the aircraft and PIC. You can upload a flight plan on the next
            screen to fill route and timing details.
          </DialogDescription>
        </DialogHeader>

        {!canCreate ? (
          <p className="text-sm text-muted-foreground">
            Add at least one aircraft and one organisation member before creating a
            flight.
          </p>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not create flight</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flight-aircraft">Aircraft</Label>
            <Select
              value={aircraftId}
              onValueChange={(value) => setAircraftId(value)}
            >
              <SelectTrigger id="flight-aircraft" className="w-full min-w-0">
                <SelectValue placeholder="Select aircraft">
                  {(value) => {
                    if (value == null) {
                      return (
                        <span className="text-muted-foreground">Select aircraft</span>
                      );
                    }
                    const a = aircraft.find((row) => row.id === value);
                    if (!a) {
                      return value;
                    }
                    return (
                      <>
                        <span className="font-mono">{a.tail_number}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {a.type}
                        </span>
                      </>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {aircraft.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="font-mono">{a.tail_number}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {a.type}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flight-pic">Pilot in command</Label>
            <Select value={picId} onValueChange={(value) => setPicId(value)}>
              <SelectTrigger id="flight-pic" className="w-full min-w-0">
                <SelectValue placeholder="Select PIC">
                  {(value) => {
                    if (value == null) {
                      return (
                        <span className="text-muted-foreground">Select PIC</span>
                      );
                    }
                    const m = sortedMembers.find((row) => row.user_id === value);
                    if (!m) {
                      return value;
                    }
                    return (
                      <>
                        <span>{m.full_name}</span>
                        {m.is_admin ? (
                          <span className="text-muted-foreground"> · Admin</span>
                        ) : null}
                      </>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sortedMembers.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    <span>{m.full_name}</span>
                    {m.is_admin ? (
                      <span className="text-muted-foreground"> · Admin</span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !canCreate}
          >
            {pending ? "Creating…" : "Create flight"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
