"use client";

import * as React from "react";

import { submitFlightFeedbackAction } from "@/app/actions/feedback";
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
import { Textarea } from "@/components/ui/textarea";

export default function FlightFeedbackCard({
  organisationId,
  flightId,
}: {
  organisationId: string;
  flightId: string;
}) {
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await submitFlightFeedbackAction({
        organisationId,
        flightId,
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

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Feedback</CardTitle>
        <CardDescription>
          Tell us about this flight workspace, parsing, or anything that felt off.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flight-feedback-text">Your feedback</Label>
            <Textarea
              id="flight-feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What should we improve?"
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
