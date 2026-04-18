"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { NotamAnalysisWorkspaceState } from "@/lib/notam-analyses";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalysedNotam } from "@/lib/notams";
import { notamCategoryStyles } from "@/lib/notams";
import { cn } from "@/lib/utils";

const CATEGORY_HEADLINE: Record<1 | 2 | 3, string> = {
  1: "Category 1 — highest priority",
  2: "Category 2 — moderate priority",
  3: "Category 3 — advisory / awareness",
};

type Props = {
  flightId: string;
  savedNotamCount: number;
  notamWorkspace: NotamAnalysisWorkspaceState;
};

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="whitespace-pre-wrap font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}

export default function NotamAnalysisPanel({
  flightId,
  savedNotamCount,
  notamWorkspace,
}: Props) {
  const router = useRouter();
  const [analyseError, setAnalyseError] = React.useState<string | null>(null);
  const [detailNotam, setDetailNotam] = React.useState<AnalysedNotam | null>(null);
  const [analyseBusy, startAnalyse] = React.useTransition();

  const pendingRawCount = notamWorkspace.pending?.rawNotamCount ?? 0;
  const canAnalyse = pendingRawCount > 0 && !analyseBusy;
  const latestAnalysis = notamWorkspace.latestComplete;
  const analysed = latestAnalysis?.analysed.notams ?? [];

  function handleRunAnalysis() {
    setAnalyseError(null);
    startAnalyse(async () => {
      const res = await fetch(`/api/flights/${flightId}/analyse-notams`, {
        method: "POST",
        credentials: "same-origin",
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
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>NOTAM analysis</CardTitle>
          <CardDescription>
            After you upload a flight plan, raw NOTAMs are stored in{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              notam_analyses
            </code>{" "}
            until you run analysis. The second API call simulates an AI model, then saves
            categorised results on the same row.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Raw NOTAMs ready for analysis
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {pendingRawCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {notamWorkspace.pending
                  ? "Pending extraction row — edit flight plan JSON and save to sync."
                  : "Upload and parse a flight plan to create a pending extraction, or rely on saved flight plan JSON count below."}{" "}
                <span className="font-medium text-foreground">
                  (saved JSON: {savedNotamCount})
                </span>
              </p>
            </div>
            <Button
              type="button"
              onClick={handleRunAnalysis}
              disabled={!canAnalyse}
              className="shrink-0 sm:self-center"
            >
              {analyseBusy ? "Analysing…" : "Analyse NOTAMs"}
            </Button>
          </div>

          {!notamWorkspace.pending && savedNotamCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Upload and parse a flight plan to extract NOTAMs into the database, then run
              analysis when ready.
            </p>
          ) : null}

          {analyseError ? (
            <Alert variant="destructive">
              <AlertTitle>Analysis failed</AlertTitle>
              <AlertDescription>{analyseError}</AlertDescription>
            </Alert>
          ) : null}

          {analyseBusy ? (
            <div className="space-y-4 rounded-lg border border-dashed border-border bg-card/50 p-4">
              <p className="notam-ai-shimmer text-sm font-medium">
                AI model is categorising NOTAMs and writing plain-language summaries…
              </p>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full max-w-md" />
                <Skeleton className="h-3 w-full max-w-lg" />
                <Skeleton className="h-3 w-4/5 max-w-sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                This is a simulated delay; results are written to the database when complete.
              </p>
            </div>
          ) : null}

          {latestAnalysis && analysed.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Last run{" "}
                <time dateTime={latestAnalysis.createdAt}>
                  {new Date(latestAnalysis.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </p>
              <div className="mb-4 flex flex-wrap gap-2 text-xs">
                <Badge
                  className={cn("border", notamCategoryStyles(1).badgeClass)}
                  variant="outline"
                >
                  Cat 1
                </Badge>
                <Badge
                  className={cn("border", notamCategoryStyles(2).badgeClass)}
                  variant="outline"
                >
                  Cat 2
                </Badge>
                <Badge
                  className={cn("border", notamCategoryStyles(3).badgeClass)}
                  variant="outline"
                >
                  Cat 3
                </Badge>
              </div>

              {([1, 2, 3] as const).map((cat) => {
                const group = analysed.filter((n) => n.category === cat);
                if (!group.length) return null;
                return (
                  <div key={cat} className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {CATEGORY_HEADLINE[cat]}
                    </h3>
                    <ul className="space-y-2">
                      {group.map((n) => {
                        const styles = notamCategoryStyles(n.category);
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => setDetailNotam(n)}
                              className={cn(
                                "w-full rounded-lg border border-border/60 p-3 text-left transition-colors",
                                "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                                styles.cardClass,
                              )}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 space-y-1">
                                  <p className="truncate text-sm font-medium">{n.title}</p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {n.id} · {n.a}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn("shrink-0 border", styles.badgeClass)}
                                >
                                  Cat {n.category}
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">{n.summary}</p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : !analyseBusy &&
            !latestAnalysis &&
            notamWorkspace.pending &&
            pendingRawCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed analysis on file yet for this flight. Run an analysis to fill{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                analysed_notams
              </code>{" "}
              on the pending row.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={detailNotam != null}
        onOpenChange={(open) => {
          if (!open) setDetailNotam(null);
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto sm:max-w-xl">
          {detailNotam ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <DialogTitle className="pr-8 text-base">{detailNotam.title}</DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 border",
                      notamCategoryStyles(detailNotam.category).badgeClass,
                    )}
                  >
                    Category {detailNotam.category}
                  </Badge>
                </div>
                <DialogDescription className="font-mono text-xs">
                  {detailNotam.id} · {detailNotam.a}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Summary
                  </p>
                  <p className="text-foreground">{detailNotam.summary}</p>
                </div>
                <Separator />
                <DetailField label="Q line" value={detailNotam.q} />
                <DetailField label="Effective (UTC)" value={detailNotam.b} />
                <DetailField label="Expiry (UTC)" value={detailNotam.c} />
                {detailNotam.d ? <DetailField label="Schedule" value={detailNotam.d} /> : null}
                <DetailField label="NOTAM text (E)" value={detailNotam.e} />
                {detailNotam.f ? <DetailField label="Lower limit (F)" value={detailNotam.f} /> : null}
                {detailNotam.g ? <DetailField label="Upper limit (G)" value={detailNotam.g} /> : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
