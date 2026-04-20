"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createAircraftAction } from "@/app/actions/aircraft";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AIRCRAFT_MANUFACTURERS,
  AIRCRAFT_TYPES_BY_MANUFACTURER,
  type AircraftManufacturer,
} from "@/lib/aircraft-catalog";

function initialState() {
  return {
    manufacturer: "" as AircraftManufacturer | "",
    aircraftType: "",
    wingspan: "",
    tailNumber: "",
    seats: "",
  };
}

export default function AddAircraftWizard({
  organisationId,
}: {
  organisationId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState(initialState);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function reset() {
    setState(initialState());
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
    }
  }

  const typesForManufacturer = state.manufacturer
    ? [...AIRCRAFT_TYPES_BY_MANUFACTURER[state.manufacturer as AircraftManufacturer]]
    : [];

  function handleSubmit() {
    setError(null);

    if (!state.manufacturer) {
      setError("Choose a manufacturer.");
      return;
    }
    if (!state.aircraftType) {
      setError("Choose an aircraft type.");
      return;
    }

    const wingspanRaw = state.wingspan.trim();
    const wingspanParsed = Number.parseFloat(wingspanRaw);
    if (
      wingspanRaw === "" ||
      !Number.isFinite(wingspanParsed) ||
      wingspanParsed <= 0
    ) {
      setError("Wingspan is required and must be a positive number (meters).");
      return;
    }

    const tail = state.tailNumber.trim();
    if (!tail) {
      setError("Tail number is required.");
      return;
    }

    const seatsRaw = state.seats.trim();
    const seatsParsed =
      seatsRaw === "" ? 0 : Number.parseInt(seatsRaw, 10);
    if (seatsRaw !== "" && (!Number.isFinite(seatsParsed) || seatsParsed < 0)) {
      setError("Seats must be a whole number of zero or more.");
      return;
    }

    startTransition(async () => {
      const res = await createAircraftAction({
        organisationId,
        manufacturer: state.manufacturer,
        aircraftType: state.aircraftType,
        tailNumber: tail,
        seats: seatsRaw === "" ? 0 : seatsParsed,
        wingspan: wingspanParsed,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>Add aircraft</DialogTrigger>
      <DialogContent className="gap-6 sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add aircraft</DialogTitle>
          <DialogDescription>
            Enter manufacturer, type, wingspan, tail number, and optional seating.
            Types update when you pick a manufacturer.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not add aircraft</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fleet-manufacturer">Manufacturer</Label>
            <Select
              value={state.manufacturer === "" ? null : state.manufacturer}
              onValueChange={(value) => {
                const m = (value ?? "") as AircraftManufacturer | "";
                setState((s) => ({
                  ...s,
                  manufacturer: m,
                  aircraftType: "",
                  wingspan: "",
                }));
              }}
            >
              <SelectTrigger id="fleet-manufacturer" className="w-full min-w-0">
                <SelectValue placeholder="Select manufacturer" />
              </SelectTrigger>
              <SelectContent>
                {AIRCRAFT_MANUFACTURERS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fleet-type">Aircraft type</Label>
            <Select
              value={state.aircraftType === "" ? null : state.aircraftType}
              onValueChange={(value) =>
                setState((s) => ({ ...s, aircraftType: value ?? "" }))
              }
              disabled={!state.manufacturer}
            >
              <SelectTrigger id="fleet-type" className="w-full min-w-0">
                <SelectValue
                  placeholder={
                    state.manufacturer
                      ? "Select type"
                      : "Select a manufacturer first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {typesForManufacturer.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fleet-wingspan">Wingspan (m)</Label>
            <Input
              id="fleet-wingspan"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={state.wingspan}
              onChange={(e) =>
                setState((s) => ({ ...s, wingspan: e.target.value }))
              }
              placeholder={
                state.manufacturer && state.aircraftType
                  ? "e.g. 35.8"
                  : "Select manufacturer and type first"
              }
              disabled={!state.manufacturer || !state.aircraftType}
              aria-required
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fleet-tail">Tail number</Label>
            <Input
              id="fleet-tail"
              value={state.tailNumber}
              onChange={(e) =>
                setState((s) => ({ ...s, tailNumber: e.target.value }))
              }
              placeholder="e.g. N123AB"
              autoComplete="off"
              maxLength={32}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fleet-seats">Seats (optional)</Label>
            <Input
              id="fleet-seats"
              type="number"
              min={0}
              step={1}
              value={state.seats}
              onChange={(e) =>
                setState((s) => ({ ...s, seats: e.target.value }))
              }
              placeholder="Defaults to 0 if empty"
            />
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
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? "Saving…" : "Add aircraft"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
