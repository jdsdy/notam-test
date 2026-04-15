"use client";

import * as React from "react";

import { updateProfileNameAction } from "@/app/actions/profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfileNameForm({
  initialName,
  accountEmail,
}: {
  initialName: string;
  accountEmail: string;
}) {
  const [state, formAction, pending] = React.useActionState(
    updateProfileNameAction,
    { error: null as string | null },
  );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update how your name appears to others. Account email:{" "}
          <span className="font-mono text-foreground">{accountEmail}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state.ok && !state.error ? (
            <Alert>
              <AlertTitle>Saved</AlertTitle>
              <AlertDescription>Your name was updated.</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="full_name">Display name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={initialName}
              autoComplete="name"
              required
              maxLength={200}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save name"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
