"use client";

import * as React from "react";

import { createOrganisationAction } from "@/app/actions/organisation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateOrganisationForm() {
  const [state, formAction, pending] = React.useActionState(
    createOrganisationAction,
    { error: null as string | null },
  );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Create organisation</CardTitle>
        <CardDescription>
          You will be added as an administrator. You can manage members from the
          organisation page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not create organisation</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="organisation_name">Organisation name</Label>
            <Input
              id="organisation_name"
              name="organisation_name"
              placeholder="Acme Aviation"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member_role">Your role</Label>
            <Input
              id="member_role"
              name="member_role"
              placeholder="Chief pilot, dispatcher, …"
              required
              maxLength={200}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create organisation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
