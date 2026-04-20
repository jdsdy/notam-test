"use client";

import * as React from "react";

import { submitNotamFeedbackAction } from "@/app/actions/feedback";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  NOTAM_FEEDBACK_ASPECT_IDS,
  NOTAM_FEEDBACK_ASPECT_LABELS,
  type NotamFeedbackAspectId,
} from "@/lib/feedback";
import type { AnalysedNotam } from "@/lib/notams";
import { cn } from "@/lib/utils";

export default function NotamFeedbackForm({
  organisationId,
  flightId,
  notam,
}: {
  organisationId: string;
  flightId: string;
  notam: AnalysedNotam;
}) {
  const [selected, setSelected] = React.useState<Partial<Record<NotamFeedbackAspectId, boolean>>>(
    () => ({}),
  );
  const [details, setDetails] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setSelected({});
    setDetails("");
    setError(null);
    setSuccess(false);
  }, [notam]);

  function toggleAspect(id: NotamFeedbackAspectId, checked: boolean) {
    setSelected((s) => ({ ...s, [id]: checked }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const aspects = NOTAM_FEEDBACK_ASPECT_IDS.filter((id) => selected[id]);
    startTransition(async () => {
      const res = await submitNotamFeedbackAction({
        organisationId,
        flightId,
        notamId: notam.id,
        aspects,
        text: details,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSelected({});
      setDetails("");
      setSuccess(true);
    });
  }

  return (
    <div className="space-y-4">
      <Separator />
      <div>
        <p className="text-sm font-medium text-foreground">Feedback on this NOTAM</p>
        <p className="text-xs text-muted-foreground">
          Help us improve categorisation, extraction, and summaries.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            What is this feedback in relation to?
          </legend>
          <div className="space-y-2">
            {NOTAM_FEEDBACK_ASPECT_IDS.map((id) => (
              <label
                key={id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm",
                  "hover:bg-muted/35",
                )}
              >
                <Checkbox
                  checked={Boolean(selected[id])}
                  onCheckedChange={(v) => toggleAspect(id, v === true)}
                  disabled={pending}
                  className="mt-0.5"
                  aria-labelledby={`notam-fb-aspect-${id}`}
                />
                <span id={`notam-fb-aspect-${id}`} className="leading-snug">
                  {NOTAM_FEEDBACK_ASPECT_LABELS[id]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="notam-feedback-details">Additional details (optional)</Label>
          <Textarea
            id="notam-feedback-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe the issue in your own words…"
            rows={3}
            disabled={pending}
            className="min-h-20 resize-y"
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not send</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertTitle>Thanks</AlertTitle>
            <AlertDescription>Your NOTAM feedback was submitted.</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Submit NOTAM feedback"}
          </Button>
        </div>
      </form>
    </div>
  );
}
