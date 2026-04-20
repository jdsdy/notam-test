"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateFlightPlanFieldsFromFormAction } from "@/app/actions/flight";
import NotamAnalysisPanel from "@/components/app/notam-analysis-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { NotamAnalysisWorkspaceState } from "@/lib/notam-analyses";
import type { FlightDetail } from "@/lib/flights";
import type { FlightPlanFieldKey, FlightPlanParseApiResponse } from "@/lib/flight-plan-parse";
import { countNotamsInFlightPlanJson } from "@/lib/notams";
import {
  FLIGHT_STATUS_LABELS,
  FLIGHT_STATUS_VALUES,
  isFlightStatus,
} from "@/lib/flight-status";
import { isoTimestampToUtcField } from "@/lib/flight-time-utc";
import { cn } from "@/lib/utils";

function formStateFromFlight(flight: FlightDetail) {
  return {
    departure_icao: flight.departure_icao ?? "",
    arrival_icao: flight.arrival_icao ?? "",
    departure_time: isoTimestampToUtcField(flight.departure_time),
    arrival_time: isoTimestampToUtcField(flight.arrival_time),
    time_enroute: flight.time_enroute != null ? String(flight.time_enroute) : "",
    departure_rwy: flight.departure_rwy ?? "",
    arrival_rwy: flight.arrival_rwy ?? "",
    route: flight.route ?? "",
    aircraft_weight: flight.aircraft_weight != null ? String(flight.aircraft_weight) : "",
    status: isFlightStatus(flight.status) ? flight.status : "",
    flight_plan_json: flight.flight_plan_json
      ? JSON.stringify(flight.flight_plan_json, null, 2)
      : "",
  };
}

type FormState = ReturnType<typeof formStateFromFlight>;

function applyParseToFormState(res: FlightPlanParseApiResponse): FormState {
  const f = res.fields;
  return {
    departure_icao: f.departure_icao ?? "",
    arrival_icao: f.arrival_icao ?? "",
    departure_time: f.departure_time ? isoTimestampToUtcField(f.departure_time) : "",
    arrival_time: f.arrival_time ? isoTimestampToUtcField(f.arrival_time) : "",
    time_enroute: f.time_enroute != null ? String(f.time_enroute) : "",
    departure_rwy: f.departure_rwy ?? "",
    arrival_rwy: f.arrival_rwy ?? "",
    route: f.route ?? "",
    aircraft_weight: f.aircraft_weight != null ? String(f.aircraft_weight) : "",
    status: isFlightStatus(f.status) ? f.status : "",
    flight_plan_json: f.flight_plan_json
      ? JSON.stringify(f.flight_plan_json, null, 2)
      : "",
  };
}

function FieldBlock({
  label,
  needsReview,
  children,
}: {
  label: string;
  needsReview: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-3",
        needsReview
          ? "border-amber-500/70 bg-amber-500/[0.07] dark:border-amber-400/50 dark:bg-amber-400/[0.06]"
          : "border-border/60 bg-card",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-foreground">{label}</Label>
        {needsReview ? (
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Could not determine — please confirm
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function FlightWorkspace({
  organisationId,
  flight,
  notamWorkspace,
}: {
  organisationId: string;
  flight: FlightDetail;
  notamWorkspace: NotamAnalysisWorkspaceState;
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [form, setForm] = React.useState(() => formStateFromFlight(flight));
  const [needsReview, setNeedsReview] = React.useState<Set<FlightPlanFieldKey>>(
    () => new Set(),
  );
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [parsePending, setParsePending] = React.useState(false);
  const [savePending, startSave] = React.useTransition();

  React.useEffect(() => {
    setForm(formStateFromFlight(flight));
  }, [flight]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function handleParseFlightPlanUpload() {
    setParseError(null);
    setParsePending(true);
    try {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setParseError("Please select a PDF file before parsing.");
        return;
      }

      const init: RequestInit = {
        method: "POST",
        credentials: "same-origin",
      };
      const fd = new FormData();
      fd.append("file", file);
      fd.append("aircraftId", flight.aircraft_id);
      fd.append("organisationId", organisationId);
      init.body = fd;

      const res = await fetch(`/api/flights/${flight.id}/parse-flight-plan`, init);
      const body = (await res.json()) as FlightPlanParseApiResponse | { ok?: false; error?: string };

      if (!res.ok || !("ok" in body) || body.ok !== true) {
        const msg =
          typeof body === "object" && body && "error" in body
            ? String((body as { error?: string }).error ?? res.statusText)
            : "Request failed.";
        setParseError(msg);
        return;
      }

      setForm(applyParseToFormState(body));
      setNeedsReview(new Set(body.needsManualReview));
      router.refresh();
    } catch {
      setParseError("Network error while parsing the flight plan.");
    } finally {
      setParsePending(false);
    }
  }

  function handleSave() {
    setSaveError(null);
    startSave(async () => {
      const result = await updateFlightPlanFieldsFromFormAction({
        organisationId,
        flightId: flight.id,
        ...form,
      });
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setNeedsReview(new Set());
      router.refresh();
    });
  }

  const review = (key: FlightPlanFieldKey) => needsReview.has(key);

  return (
    <div className="space-y-8">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Flight plan</CardTitle>
          <CardDescription>
            Upload a flight plan PDF to extract fields and seed NOTAM analysis.
            Any uncertain fields are highlighted for manual review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {parseError ? (
            <Alert variant="destructive">
              <AlertTitle>Parse failed</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleParseFlightPlanUpload}
              disabled={parsePending}
            >
              {parsePending ? "Parsing…" : "Upload and parse"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Flight details</CardTitle>
          <CardDescription>
            Values from the flight plan parser can be edited before saving. Fields
            the parser could not resolve are highlighted. Departure and arrival
            times are <span className="font-medium text-foreground">Zulu (UTC)</span>
            , not local time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {saveError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          ) : null}

          <p id="flight-time-utc-hint" className="text-xs text-muted-foreground">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono">YYYY-MM-DDTHH:mm</code>{" "}
            or <code className="rounded bg-muted px-1 py-0.5 font-mono">YYYY-MM-DD HH:mm</code>{" "}
            with no offset — interpreted as Zulu (UTC). You may also paste full ISO
            strings ending in <code className="font-mono">Z</code> or with an offset.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldBlock label="Departure ICAO" needsReview={review("departure_icao")}>
              <Input
                value={form.departure_icao}
                onChange={(e) => setField("departure_icao", e.target.value)}
                placeholder="e.g. KPTK"
                className="font-mono uppercase"
              />
            </FieldBlock>
            <FieldBlock label="Arrival ICAO" needsReview={review("arrival_icao")}>
              <Input
                value={form.arrival_icao}
                onChange={(e) => setField("arrival_icao", e.target.value)}
                placeholder="e.g. KORD"
                className="font-mono uppercase"
              />
            </FieldBlock>
            <FieldBlock
              label="Departure time (Zulu UTC)"
              needsReview={review("departure_time")}
            >
              <Input
                value={form.departure_time}
                onChange={(e) => setField("departure_time", e.target.value)}
                placeholder="2026-04-16T14:30"
                className="font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="flight-time-utc-hint"
              />
            </FieldBlock>
            <FieldBlock
              label="Arrival time (Zulu UTC)"
              needsReview={review("arrival_time")}
            >
              <Input
                value={form.arrival_time}
                onChange={(e) => setField("arrival_time", e.target.value)}
                placeholder="2026-04-16T16:05"
                className="font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="flight-time-utc-hint"
              />
            </FieldBlock>
            <FieldBlock
              label="Time en route (minutes)"
              needsReview={review("time_enroute")}
            >
              <Input
                type="number"
                min={0}
                step={1}
                value={form.time_enroute}
                onChange={(e) => setField("time_enroute", e.target.value)}
                placeholder="e.g. 95"
              />
            </FieldBlock>
            <FieldBlock label="Departure runway" needsReview={review("departure_rwy")}>
              <Input
                value={form.departure_rwy}
                onChange={(e) => setField("departure_rwy", e.target.value)}
                placeholder="e.g. 09"
              />
            </FieldBlock>
            <FieldBlock label="Arrival runway" needsReview={review("arrival_rwy")}>
              <Input
                value={form.arrival_rwy}
                onChange={(e) => setField("arrival_rwy", e.target.value)}
                placeholder="e.g. 28C"
              />
            </FieldBlock>
            <FieldBlock label="Aircraft weight (lb)" needsReview={review("aircraft_weight")}>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.aircraft_weight}
                onChange={(e) => setField("aircraft_weight", e.target.value)}
              />
            </FieldBlock>
            <FieldBlock label="Status" needsReview={review("status")}>
              <Select
                value={form.status === "" ? null : form.status}
                onValueChange={(value) => setField("status", value ?? "")}
              >
                <SelectTrigger id="flight-status" className="w-full min-w-0">
                  <SelectValue placeholder="Select status">
                    {(value) => {
                      if (value == null || value === "") {
                        return (
                          <span className="text-muted-foreground">Select status</span>
                        );
                      }
                      if (isFlightStatus(value)) {
                        return FLIGHT_STATUS_LABELS[value];
                      }
                      return value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FLIGHT_STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {FLIGHT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldBlock>
          </div>

          <FieldBlock label="Route" needsReview={review("route")}>
            <textarea
              value={form.route}
              onChange={(e) => setField("route", e.target.value)}
              rows={4}
              className={cn(
                "field-sizing-content min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
                "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "dark:bg-input/30",
              )}
              placeholder="Route string from the flight plan"
            />
          </FieldBlock>

          <FieldBlock label="Flight plan JSON" needsReview={review("flight_plan_json")}>
            <textarea
              value={form.flight_plan_json}
              onChange={(e) => setField("flight_plan_json", e.target.value)}
              rows={8}
              className={cn(
                "field-sizing-content min-h-40 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none",
                "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "dark:bg-input/30",
              )}
              spellCheck={false}
            />
          </FieldBlock>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={savePending}>
              {savePending ? "Saving…" : "Save flight details"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <NotamAnalysisPanel
        organisationId={organisationId}
        flightId={flight.id}
        savedNotamCount={countNotamsInFlightPlanJson(flight.flight_plan_json)}
        notamWorkspace={notamWorkspace}
      />
    </div>
  );
}
