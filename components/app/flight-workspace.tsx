"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { updateFlightPlanFieldsFromFormAction } from "@/app/actions/flight";
import FlightFeedbackCard from "@/components/app/flight-feedback-card";
import { TextShimmer } from "@/components/core/text-shimmer";
import NotamFeedbackForm from "@/components/app/notam-feedback-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NotamAnalysisWorkspaceState } from "@/lib/notam-analyses";
import type { FlightDetail } from "@/lib/flights";
import type {
  ExtractFlightPlanApiResponse,
  FlightPlanFieldKey,
  FlightPlanParseApiResponse,
  IdentifyFlightPlanApiResponse,
} from "@/lib/flight-plan-parse";
import type { AnalysedNotam } from "@/lib/notams";
import {
  FLIGHT_STATUS_LABELS,
  FLIGHT_STATUS_VALUES,
  isFlightStatus,
} from "@/lib/flight-status";
import { isoTimestampToUtcField } from "@/lib/flight-time-utc";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Form state helpers                                                        */
/* -------------------------------------------------------------------------- */

function formStateFromFlight(flight: FlightDetail) {
  return {
    departure_icao: flight.departure_icao ?? "",
    arrival_icao: flight.arrival_icao ?? "",
    departure_time: isoTimestampToUtcField(flight.departure_time),
    arrival_time: isoTimestampToUtcField(flight.arrival_time),
    time_enroute:
      flight.time_enroute != null ? String(flight.time_enroute) : "",
    departure_rwy: flight.departure_rwy ?? "",
    arrival_rwy: flight.arrival_rwy ?? "",
    route: flight.route ?? "",
    aircraft_weight:
      flight.aircraft_weight != null ? String(flight.aircraft_weight) : "",
    status: isFlightStatus(flight.status) ? flight.status : "",
    flight_plan_json: flight.flight_plan_json
      ? JSON.stringify(flight.flight_plan_json, null, 2)
      : "",
  };
}

type FormState = ReturnType<typeof formStateFromFlight>;

function applyParseToFormState(
  res: Pick<FlightPlanParseApiResponse, "fields" | "needsManualReview">,
): FormState {
  const f = res.fields;
  return {
    departure_icao: f.departure_icao ?? "",
    arrival_icao: f.arrival_icao ?? "",
    departure_time: f.departure_time
      ? isoTimestampToUtcField(f.departure_time)
      : "",
    arrival_time: f.arrival_time
      ? isoTimestampToUtcField(f.arrival_time)
      : "",
    time_enroute: f.time_enroute != null ? String(f.time_enroute) : "",
    departure_rwy: f.departure_rwy ?? "",
    arrival_rwy: f.arrival_rwy ?? "",
    route: f.route ?? "",
    aircraft_weight:
      f.aircraft_weight != null ? String(f.aircraft_weight) : "",
    status: isFlightStatus(f.status) ? f.status : "",
    flight_plan_json: f.flight_plan_json
      ? JSON.stringify(f.flight_plan_json, null, 2)
      : "",
  };
}

function flightHasAnyData(flight: FlightDetail): boolean {
  return Boolean(
    flight.departure_icao ||
      flight.arrival_icao ||
      flight.departure_time ||
      flight.arrival_time ||
      flight.time_enroute ||
      flight.departure_rwy ||
      flight.arrival_rwy ||
      flight.route ||
      flight.aircraft_weight ||
      flight.status ||
      flight.flight_plan_json,
  );
}

/* -------------------------------------------------------------------------- */
/*  Small UI primitives                                                       */
/* -------------------------------------------------------------------------- */

function SectionFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset,0_8px_30px_-24px_color-mix(in_oklch,var(--primary)_30%,transparent)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  right,
  onToggle,
  collapsed,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  onToggle?: () => void;
  collapsed?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-border/50 px-6 pb-5 pt-6">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-heading text-xl tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className={cn(
            "group grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 bg-white/60 text-muted-foreground transition",
            "hover:border-primary/40 hover:text-foreground",
          )}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              collapsed ? "-rotate-90" : "rotate-0",
            )}
          />
        </button>
      ) : null}
    </div>
  );
}

function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FieldLabel({
  children,
  review,
}: {
  children: React.ReactNode;
  review?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
        {children}
      </label>
      {review ? (
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-amber-700">
          Needs review
        </span>
      ) : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  uppercase,
  review,
  type = "text",
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  uppercase?: boolean;
  review?: boolean;
  type?: "text" | "number";
  describedBy?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel review={review}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={describedBy}
        className={cn(
          "w-full rounded-xl border border-border/70 bg-white/70 px-3 py-2 text-sm text-foreground outline-none transition",
          "placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/15",
          review && "border-amber-500/50 bg-amber-50/60",
          (mono || uppercase) && "font-mono",
          uppercase && "uppercase tracking-wide",
        )}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  mono,
  review,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
  review?: boolean;
  describedBy?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel review={review}>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-describedby={describedBy}
        className={cn(
          "w-full resize-y rounded-xl border border-border/70 bg-white/70 px-3 py-2 text-sm text-foreground outline-none transition",
          "placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/15",
          review && "border-amber-500/50 bg-amber-50/60",
          mono && "font-mono",
        )}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  review,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  review?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel review={review}>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-border/70 bg-white/70 px-3 py-2 text-sm text-foreground outline-none transition",
          "focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/15",
          review && "border-amber-500/50 bg-amber-50/60",
        )}
      >
        <option value="">{placeholder ?? "—"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AlertBanner({
  tone,
  title,
  children,
}: {
  tone: "error" | "info";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-red-300/70 bg-red-50/80 text-red-900"
          : "border-sky-300/60 bg-sky-50/70 text-sky-900",
      )}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-[0.85rem] opacity-90">{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  NOTAM category styling                                                    */
/* -------------------------------------------------------------------------- */

const CATEGORY_META: Record<
  1 | 2 | 3,
  {
    label: string;
    description: string;
    accent: string;
    dot: string;
    badge: string;
    surface: string;
    rail: string;
  }
> = {
  1: {
    label: "Category 1",
    description: "Highest priority — address before flight.",
    accent: "text-red-900",
    dot: "bg-red-500",
    badge: "border-red-400/50 bg-red-100/70 text-red-900",
    surface: "bg-red-50/70 border-red-200/80",
    rail: "bg-red-500",
  },
  2: {
    label: "Category 2",
    description: "Moderate priority — review carefully.",
    accent: "text-amber-900",
    dot: "bg-amber-500",
    badge: "border-amber-400/60 bg-amber-100/70 text-amber-900",
    surface: "bg-amber-50/70 border-amber-200/70",
    rail: "bg-amber-500",
  },
  3: {
    label: "Category 3",
    description: "Advisory — situational awareness only.",
    accent: "text-sky-900",
    dot: "bg-sky-500",
    badge: "border-sky-400/50 bg-sky-100/70 text-sky-900",
    surface: "bg-sky-50/70 border-sky-200/70",
    rail: "bg-sky-500",
  },
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type AiPhase =
  | "idle"
  | "uploading"
  | "identifying"
  | "extracting-parallel"
  | "extracting-notams"
  | "ready"
  | "analysing"
  | "analysed";

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
  const [notamExtractError, setNotamExtractError] = React.useState<string | null>(
    null,
  );
  const [parallelFlightReady, setParallelFlightReady] = React.useState(false);
  const [parallelNotamReady, setParallelNotamReady] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [analyseError, setAnalyseError] = React.useState<string | null>(null);
  const [savePending, startSave] = React.useTransition();

  const [fileName, setFileName] = React.useState<string | null>(null);

  const hasExisting = flightHasAnyData(flight);
  const [infoRevealed, setInfoRevealed] = React.useState<boolean>(hasExisting);
  const [infoCollapsed, setInfoCollapsed] = React.useState<boolean>(false);

  const pendingRawCount = notamWorkspace.pending?.rawNotamCount ?? 0;
  const extractionPending = Boolean(notamWorkspace.pending?.extracting);
  const latestAnalysis = notamWorkspace.latestComplete;
  const analysed = latestAnalysis?.analysed.notams ?? [];

  // Infer an initial AI phase from server state when the page first loads.
  const [phase, setPhase] = React.useState<AiPhase>(() => {
    if (extractionPending) return "extracting-notams";
    if (latestAnalysis) return "analysed";
    if (notamWorkspace.pending && pendingRawCount > 0) return "ready";
    return "idle";
  });

  // Keep phase in sync with server state when not in an active client flow.
  React.useEffect(() => {
    setPhase((current) => {
      if (current === "uploading" || current === "identifying") {
        return current;
      }
      if (
        current === "extracting-parallel" &&
        (!parallelFlightReady || !parallelNotamReady)
      ) {
        return current;
      }
      if (current === "analysing") return current;
      if (extractionPending) return "extracting-notams";
      if (latestAnalysis) return "analysed";
      if (notamWorkspace.pending && pendingRawCount > 0) return "ready";
      if (current === "extracting-notams" && !extractionPending) {
        return pendingRawCount > 0 ? "ready" : "idle";
      }
      return current;
    });
  }, [
    extractionPending,
    latestAnalysis,
    notamWorkspace.pending,
    parallelFlightReady,
    parallelNotamReady,
    pendingRawCount,
  ]);

  // Poll for background NOTAM extraction completion.
  React.useEffect(() => {
    if (!extractionPending) return;
    const id = window.setInterval(() => router.refresh(), 2500);
    return () => window.clearInterval(id);
  }, [extractionPending, router]);

  React.useEffect(() => {
    setForm(formStateFromFlight(flight));
  }, [flight]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  /* -------- AI flow ------------------------------------------------------ */

  async function handleExtract() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setParseError(null);
    setNotamExtractError(null);
    setParallelFlightReady(false);
    setParallelNotamReady(false);
    setPhase("uploading");

    const identifyStepTimer = window.setTimeout(() => {
      setPhase((p) => (p === "uploading" ? "identifying" : p));
    }, 1200);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("aircraftId", flight.aircraft_id);
      fd.append("organisationId", organisationId);

      const identifyRes = await fetch(
        `/api/flights/${flight.id}/parse/identify-flight-plan`,
        { method: "POST", credentials: "same-origin", body: fd },
      );
      const identifyBody = (await identifyRes.json()) as
        | IdentifyFlightPlanApiResponse
        | { ok?: false; error?: string };

      window.clearTimeout(identifyStepTimer);

      if (!identifyRes.ok || !("ok" in identifyBody) || identifyBody.ok !== true) {
        const msg =
          typeof identifyBody === "object" && identifyBody && "error" in identifyBody
            ? String((identifyBody as { error?: string }).error ?? identifyRes.statusText)
            : "Request failed.";
        setParseError(msg);
        setPhase("idle");
        return;
      }

      const extractPayload = {
        organisationId,
        aircraftId: flight.aircraft_id,
        planPdfUuid: identifyBody.planPdfUuid,
        splitterResult: identifyBody.splitterResult,
      };

      setPhase("extracting-parallel");

      const flightReq = fetch(
        `/api/flights/${flight.id}/parse/extract-flight-plan`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(extractPayload),
        },
      ).then(async (res) => ({
        res,
        body: (await res.json()) as
          | ExtractFlightPlanApiResponse
          | { ok?: false; error?: string },
      }));

      const notamReq = fetch(`/api/flights/${flight.id}/parse/extract-notams`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extractPayload),
      }).then(async (res) => ({
        res,
        body: (await res.json()) as
          | { ok: true; notamAnalysisId: string | null }
          | { ok?: false; error?: string },
      }));

      flightReq
        .then(({ res, body }) => {
          if (res.ok && "ok" in body && body.ok === true) {
            setForm(applyParseToFormState(body));
            setNeedsReview(new Set(body.needsManualReview));
            setInfoRevealed(true);
            setInfoCollapsed(false);
            setParallelFlightReady(true);
            router.refresh();
          } else {
            const msg =
              typeof body === "object" && body && "error" in body
                ? String((body as { error?: string }).error ?? res.statusText)
                : "Flight plan extraction failed.";
            setParseError(msg);
            setParallelFlightReady(true);
          }
        })
        .catch(() => {
          setParseError("Network error while extracting flight details.");
          setParallelFlightReady(true);
        });

      notamReq
        .then(({ res, body }) => {
          if (res.ok && "ok" in body && body.ok === true) {
            setNotamExtractError(null);
            setParallelNotamReady(true);
            router.refresh();
          } else {
            const msg =
              typeof body === "object" && body && "error" in body
                ? String((body as { error?: string }).error ?? res.statusText)
                : "NOTAM extraction failed.";
            setNotamExtractError(msg);
            setParallelNotamReady(true);
            router.refresh();
          }
        })
        .catch(() => {
          setNotamExtractError("Network error while extracting NOTAMs.");
          setParallelNotamReady(true);
          router.refresh();
        });

      await Promise.allSettled([flightReq, notamReq]);
    } catch {
      window.clearTimeout(identifyStepTimer);
      setParseError("Network error while parsing the flight plan.");
      setPhase("idle");
    }
  }

  function handleManualEntry() {
    setInfoRevealed(true);
    setInfoCollapsed(false);
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

  async function handleAnalyse() {
    setAnalyseError(null);
    setPhase("analysing");
    try {
      const res = await fetch(`/api/flights/${flight.id}/analyse-notams`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId }),
      });
      const body = (await res.json()) as
        | { ok: true; analysisId: string }
        | { ok?: false; error?: string };
      if (!res.ok || !("ok" in body) || body.ok !== true) {
        const msg =
          typeof body === "object" && body && "error" in body
            ? String((body as { error?: string }).error ?? res.statusText)
            : "Request failed.";
        setAnalyseError(msg);
        setPhase("ready");
        return;
      }
      setPhase("analysed");
      router.refresh();
    } catch {
      setAnalyseError("Network error while requesting analysis.");
      setPhase("ready");
    }
  }

  const review = (key: FlightPlanFieldKey) => needsReview.has(key);
  const hasFile = Boolean(fileName);
  const extracting =
    phase === "uploading" ||
    phase === "identifying" ||
    phase === "extracting-parallel" ||
    phase === "extracting-notams";

  return (
    <div className="space-y-8">
      {/* ------------------------------ AI actions -------------------------- */}
      <section className="rise-in rise-in-1">
        <SectionFrame className="relative">
          <SectionHeader
            eyebrow="AI actions"
            title="Flight plan intake"
            description="Upload a flight plan PDF or enter details manually. Jet Ops extracts fields, pulls NOTAMs, and routes them for review."
            right={
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-mono uppercase tracking-wider",
                  phase === "idle"
                    ? "border-border/60 bg-white/60 text-muted-foreground"
                    : extracting
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : phase === "analysing"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : phase === "analysed"
                          ? "border-emerald-400/50 bg-emerald-50/80 text-emerald-800"
                          : "border-amber-400/60 bg-amber-50/80 text-amber-800",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    phase === "idle"
                      ? "bg-muted-foreground/60"
                      : extracting || phase === "analysing"
                        ? "animate-pulse bg-primary"
                        : phase === "analysed"
                          ? "bg-emerald-500"
                          : "bg-amber-500",
                  )}
                />
                {phase === "idle"
                  ? "Waiting"
                  : phase === "uploading"
                    ? "Uploading"
                    : phase === "identifying"
                      ? "Identifying"
                      : phase === "extracting-parallel"
                        ? "Extracting"
                        : phase === "extracting-notams"
                          ? "Finding NOTAMs"
                          : phase === "ready"
                            ? "NOTAMs ready"
                            : phase === "analysing"
                              ? "Analysing"
                              : "Complete"}
              </span>
            }
          />
          <div className="space-y-5 px-6 py-6">
            {parseError ? (
              <AlertBanner tone="error" title="Flight extraction failed">
                {parseError}
              </AlertBanner>
            ) : null}
            {notamExtractError ? (
              <AlertBanner tone="error" title="NOTAM extraction failed">
                {notamExtractError}
              </AlertBanner>
            ) : null}

            {/* Upload row */}
            <div className="grid gap-3 rounded-2xl border border-dashed border-border/70 bg-white/40 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <label
                htmlFor="flight-plan-pdf"
                className={cn(
                  "group flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-white/70 px-4 py-3 text-sm transition",
                  "hover:border-primary/40 hover:bg-white",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <UploadIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    {fileName ?? "Upload flight plan PDF"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {fileName
                      ? "Click to choose a different file"
                      : "Drag-and-drop supported. PDF only."}
                  </span>
                </span>
                <input
                  ref={fileInputRef}
                  id="flight-plan-pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) =>
                    setFileName(e.target.files?.[0]?.name ?? null)
                  }
                  disabled={extracting || phase === "analysing"}
                />
              </label>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleManualEntry}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "bg-white/70",
                  )}
                  disabled={extracting || phase === "analysing"}
                >
                  Enter manually
                </button>
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={!hasFile || extracting || phase === "analysing"}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "min-w-[112px]",
                  )}
                >
                  {extracting ? "Extracting…" : "Extract"}
                </button>
              </div>
            </div>

            {/* Progress shimmer */}
            <Collapsible open={extracting}>
              <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-white/40 px-4 py-3">
                {phase !== "extracting-parallel" ? <LoaderRing /> : null}
                <div className="min-w-0 flex-1">
                  {phase === "extracting-parallel" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        Extracting flight information and NOTAMs
                      </p>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        {parallelFlightReady ? (
                          <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <span
                            aria-hidden
                            className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                          />
                        )}
                        <span>Flight information</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        {parallelNotamReady ? (
                          <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <span
                            aria-hidden
                            className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                          />
                        )}
                        <span>NOTAM list</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <TextShimmer
                        as="p"
                        duration={2.4}
                        className="text-sm font-medium"
                      >
                        {phase === "uploading"
                          ? "Uploading your PDF"
                          : phase === "identifying"
                            ? "Identifying flight plan sections"
                            : "Extracting NOTAMs"}
                      </TextShimmer>
                      <p className="text-[0.72rem] text-muted-foreground">
                        {phase === "uploading"
                          ? "Streaming bytes to Jet Ops securely."
                          : phase === "identifying"
                            ? "Finding NOTAM blocks, route tables, and flight-detail pages."
                            : "Splitting NOTAMs out of the plan document."}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Collapsible>

            {/* Ready / analysed state */}
            <Collapsible
              open={
                phase === "ready" ||
                phase === "analysing" ||
                phase === "analysed" ||
                (phase === "extracting-parallel" &&
                  parallelNotamReady &&
                  pendingRawCount > 0)
              }
            >
              <div className="grid gap-3 rounded-2xl border border-border/50 bg-white/50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                    NOTAMs identified
                  </p>
                  <p className="mt-1 font-heading text-4xl tabular-nums tracking-tight text-foreground">
                    {pendingRawCount || latestAnalysis?.analysed.notams.length || 0}
                  </p>
                  <p className="mt-1 text-[0.78rem] text-muted-foreground">
                    {phase === "analysed"
                      ? "Analysis complete. Expand categories below to review each NOTAM."
                      : phase === "analysing"
                        ? "NOTAMS are being categorised and analysed."
                        : "Ready for categorisation and analysis."}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  {phase === "analysing" ? (
                    <TextShimmer
                      as="span"
                      duration={2.2}
                      className="text-sm font-medium"
                    >
                      Analysing NOTAMs…
                    </TextShimmer>
                  ) : phase === "analysed" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-50/80 px-3 py-1.5 text-xs font-medium text-emerald-800">
                      <CheckIcon className="h-3.5 w-3.5" />
                      Analysed
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleAnalyse}
                        disabled={pendingRawCount === 0}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        Analyse NOTAMs
                      </button>
                      <p className="max-w-[32ch] text-[0.72rem] font-semibold text-red-600">
                        Confirm all flight information below is correct before analysis
                      </p>
                    </>
                  )}
                </div>
              </div>
              {analyseError ? (
                <div className="mt-3">
                  <AlertBanner tone="error" title="Analysis failed">
                    {analyseError}
                  </AlertBanner>
                </div>
              ) : null}

              {latestAnalysis && analysed.length > 0 ? (
                <NotamSection
                  embedded
                  organisationId={organisationId}
                  flightId={flight.id}
                  analysed={analysed}
                  runAt={latestAnalysis.createdAt}
                />
              ) : null}
            </Collapsible>
          </div>
        </SectionFrame>
      </section>

      {/* ---------------------------- Flight information -------------------- */}
      {infoRevealed ? (
        <section className="rise-in rise-in-2">
          <SectionFrame>
            <SectionHeader
              eyebrow="Flight brief"
              title="Flight information"
              description="Fields from the parser can be edited before saving. Departure and arrival times are Zulu (UTC)."
              onToggle={() => setInfoCollapsed((c) => !c)}
              collapsed={infoCollapsed}
            />
            <Collapsible open={!infoCollapsed}>
              <div className="space-y-6 px-6 py-6">
                {saveError ? (
                  <AlertBanner tone="error" title="Could not save">
                    {saveError}
                  </AlertBanner>
                ) : null}

                {/* Primary timings & weight — same field styling as below */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <TextField
                    label="Departure time (UTC)"
                    value={form.departure_time}
                    onChange={(v) => setField("departure_time", v)}
                    placeholder="2026-04-16T14:30"
                    mono
                    review={review("departure_time")}
                    describedBy="flight-time-utc-hint-top"
                  />
                  <TextField
                    label="Arrival time (UTC)"
                    value={form.arrival_time}
                    onChange={(v) => setField("arrival_time", v)}
                    placeholder="2026-04-16T16:05"
                    mono
                    review={review("arrival_time")}
                    describedBy="flight-time-utc-hint-top"
                  />
                  <TextField
                    label="Time en route (min)"
                    value={form.time_enroute}
                    onChange={(v) => setField("time_enroute", v)}
                    placeholder="95"
                    type="number"
                    review={review("time_enroute")}
                  />
                  <TextField
                    label="Aircraft weight (lb)"
                    value={form.aircraft_weight}
                    onChange={(v) => setField("aircraft_weight", v)}
                    placeholder="18000"
                    type="number"
                    review={review("aircraft_weight")}
                  />
                </div>
                <p
                  id="flight-time-utc-hint-top"
                  className="text-[0.72rem] text-muted-foreground"
                >
                  Use{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    YYYY-MM-DDTHH:mm
                  </code>{" "}
                  — Zulu (UTC).
                </p>

                {/* Departure / Arrival details */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-white/60 p-5">
                    <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                      Departure
                    </p>
                    <h3 className="mt-1 font-heading text-lg tracking-tight">
                      Departure details
                    </h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <TextField
                        label="ICAO"
                        value={form.departure_icao}
                        onChange={(v) => setField("departure_icao", v)}
                        placeholder="KPTK"
                        uppercase
                        review={review("departure_icao")}
                      />
                      <TextField
                        label="Runway"
                        value={form.departure_rwy}
                        onChange={(v) => setField("departure_rwy", v)}
                        placeholder="09L"
                        review={review("departure_rwy")}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-white/60 p-5">
                    <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                      Arrival
                    </p>
                    <h3 className="mt-1 font-heading text-lg tracking-tight">
                      Arrival details
                    </h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <TextField
                        label="ICAO"
                        value={form.arrival_icao}
                        onChange={(v) => setField("arrival_icao", v)}
                        placeholder="KORD"
                        uppercase
                        review={review("arrival_icao")}
                      />
                      <TextField
                        label="Runway"
                        value={form.arrival_rwy}
                        onChange={(v) => setField("arrival_rwy", v)}
                        placeholder="28C"
                        review={review("arrival_rwy")}
                      />
                    </div>
                  </div>
                </div>

                {/* Timing / Route */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-white/60 p-5">
                    <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                      Status
                    </p>
                    <h3 className="mt-1 font-heading text-lg tracking-tight">
                      Flight status
                    </h3>
                    <p className="mt-2 text-[0.72rem] text-muted-foreground">
                      Does not impact NOTAM analysis. For reference only.
                    </p>
                    <div className="mt-4">
                      <SelectField
                        label="Status"
                        value={form.status}
                        onChange={(v) => setField("status", v)}
                        placeholder="Select status"
                        options={FLIGHT_STATUS_VALUES.map((s) => ({
                          value: s,
                          label: FLIGHT_STATUS_LABELS[s],
                        }))}
                        review={review("status")}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-white/60 p-5">
                    <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                      Route
                    </p>
                    <h3 className="mt-1 font-heading text-lg tracking-tight">
                      Flight route
                    </h3>
                    <p className="mt-2 text-[0.72rem] text-muted-foreground">
                      Flight route extraction may be inaccurate. Review extracted route below and adjust as needed.
                    </p>
                    <div className="mt-4">
                      <TextAreaField
                        label="Route string"
                        value={form.route}
                        onChange={(v) => setField("route", v)}
                        placeholder="KPTK DCT PMM DCT ORD"
                        rows={10}
                        mono
                        review={review("route")}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                  <p className="text-xs text-muted-foreground">
                    Changes save to the flight record and sync pending NOTAM
                    rows.
                  </p>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={savePending}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    {savePending ? "Saving…" : "Save flight details"}
                  </button>
                </div>
              </div>
            </Collapsible>
          </SectionFrame>
        </section>
      ) : null}

      {/* ---------------------------- Feedback ----------------------------- */}
      <section className="rise-in rise-in-4">
        <FlightFeedbackCard
          organisationId={organisationId}
          flightId={flight.id}
        />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  NOTAM section (grouped by category, collapsible)                          */
/* -------------------------------------------------------------------------- */

function NotamSection({
  organisationId,
  flightId,
  analysed,
  runAt,
  embedded = false,
}: {
  organisationId: string;
  flightId: string;
  analysed: AnalysedNotam[];
  runAt: string;
  embedded?: boolean;
}) {
  const [detail, setDetail] = React.useState<AnalysedNotam | null>(null);
  const grouped = React.useMemo(() => {
    return ([1, 2, 3] as const).map((cat) => ({
      cat,
      items: analysed.filter((n) => n.category === cat),
    }));
  }, [analysed]);

  const inner = (
    <>
      {embedded ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-border/40 pb-3">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
              NOTAM briefing
            </p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              Categorised results
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Last run{" "}
            <time dateTime={runAt}>
              {new Date(runAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </p>
        </div>
      ) : (
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
              Briefing
            </p>
            <h2 className="mt-1 font-heading text-2xl tracking-tight text-foreground">
              NOTAM analysis
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Last run{" "}
            <time dateTime={runAt}>
              {new Date(runAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </p>
        </header>
      )}

      <div className="space-y-3">
        {grouped.map(({ cat, items }) =>
          items.length > 0 ? (
            <NotamCategoryCard
              key={cat}
              category={cat}
              items={items}
              onOpen={setDetail}
            />
          ) : null,
        )}
      </div>

      <Dialog
        open={detail != null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[min(90vh,800px)] w-full max-w-lg overflow-y-auto sm:max-w-2xl">
          {detail ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <DialogTitle className="pr-8 font-heading text-base">
                    {detail.title ?? "Unknown NOTAM"}
                  </DialogTitle>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-mono uppercase tracking-wider",
                      CATEGORY_META[detail.category].badge,
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        CATEGORY_META[detail.category].dot,
                      )}
                    />
                    Cat {detail.category}
                  </span>
                </div>
                <DialogDescription className="font-mono text-xs">
                  {detail.id ?? "—"} · {detail.a ?? "—"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                    Summary
                  </p>
                  <p className="mt-1 text-foreground">{detail.summary}</p>
                </div>
                <NotamDetailField label="Q line" value={detail.q} />
                <NotamDetailField label="Effective (UTC)" value={detail.b} />
                <NotamDetailField label="Expiry (UTC)" value={detail.c} />
                {detail.d ? (
                  <NotamDetailField label="Schedule" value={detail.d} />
                ) : null}
                <NotamDetailField label="NOTAM text (E)" value={detail.e} />
                {detail.f ? (
                  <NotamDetailField label="Lower limit (F)" value={detail.f} />
                ) : null}
                {detail.g ? (
                  <NotamDetailField label="Upper limit (G)" value={detail.g} />
                ) : null}
              </div>

              <NotamFeedbackForm
                organisationId={organisationId}
                flightId={flightId}
                notam={detail}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return <div className="mt-5 space-y-4">{inner}</div>;
  }

  return (
    <section className="rise-in rise-in-3 space-y-4">{inner}</section>
  );
}

function NotamCategoryCard({
  category,
  items,
  onOpen,
}: {
  category: 1 | 2 | 3;
  items: AnalysedNotam[];
  onOpen: (n: AnalysedNotam) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const meta = CATEGORY_META[category];

  return (
    <SectionFrame
      className={cn("border-0 ring-1 ring-border/60", meta.surface)}
    >
      <div className="relative">
        <span
          className={cn(
            "absolute left-0 top-0 h-full w-1 rounded-l-2xl",
            meta.rail,
          )}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-white/60 font-heading text-sm text-foreground",
              )}
            >
              {category}
            </span>
            <div>
              <p className={cn("font-heading text-base tracking-tight", meta.accent)}>
                {meta.label}
              </p>
              <p className="text-[0.78rem] text-muted-foreground">
                {meta.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-wider",
                meta.badge,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
              {items.length} NOTAM{items.length === 1 ? "" : "s"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-300",
                open ? "rotate-0" : "-rotate-90",
              )}
            />
          </div>
        </button>
        <Collapsible open={open}>
          <ul className="space-y-2 px-5 pb-5">
            {items.map((n, idx) => (
              <li key={`${n.id ?? "unknown"}-${idx}`}>
                <button
                  type="button"
                  onClick={() => onOpen(n)}
                  className={cn(
                    "block w-full rounded-xl border border-white/70 bg-white/70 p-4 text-left transition",
                    "hover:border-primary/30 hover:bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium text-foreground">
                        {n.title ?? "Unknown NOTAM"}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {n.id ?? "—"} · {n.a ?? "—"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {n.summary}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Collapsible>
      </div>
    </SectionFrame>
  );
}

function NotamDetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap font-mono text-xs text-foreground">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2.2}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LoaderRing() {
  return (
    <span
      aria-hidden="true"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10"
    >
      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </span>
  );
}
