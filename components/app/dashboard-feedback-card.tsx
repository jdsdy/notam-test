"use client";

import * as React from "react";

import { submitDashboardFeedbackAction } from "@/app/actions/feedback";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OrganisationSummary } from "@/lib/organisations";

export default function DashboardFeedbackCard({
  organisations,
}: {
  organisations: OrganisationSummary[];
}) {
  const [organisationId, setOrganisationId] = React.useState(
    () => organisations[0]?.id ?? "",
  );
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (organisations.length && !organisations.some((o) => o.id === organisationId)) {
      setOrganisationId(organisations[0]?.id ?? "");
    }
  }, [organisations, organisationId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await submitDashboardFeedbackAction({
        organisationId,
        text,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setText("");
      setSuccess(true);
    });
  }

  if (organisations.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
          <CardDescription>
            Join an organisation to send product feedback from the dashboard.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Feedback</CardTitle>
        <CardDescription>
          Share thoughts about Jet Ops or this dashboard. Your message is saved to your
          organisation for the team to review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {organisations.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="feedback-org">Organisation</Label>
              <Select
                value={organisationId}
                onValueChange={(v) => {
                  if (v) setOrganisationId(v);
                }}
              >
                <SelectTrigger id="feedback-org" className="w-full max-w-md">
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organisations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="dashboard-feedback-text">Your feedback</Label>
            <Textarea
              id="dashboard-feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What would you like us to know?"
              rows={4}
              disabled={pending}
              className="min-h-24 resize-y"
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
              <AlertDescription>Your feedback was submitted.</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Submit feedback"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
