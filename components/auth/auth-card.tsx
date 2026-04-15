"use client";

import * as React from "react";

import { signInWithPassword, signUpWithPassword } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthCard() {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const res =
        mode === "signin"
          ? await signInWithPassword(formData)
          : await signUpWithPassword(formData);

      if (res && !res.ok) setError(res.message);
    });
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl border bg-background shadow-sm">
            <span className="text-sm font-semibold tracking-tight">JO</span>
            <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-border/60" />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-lg tracking-tight">Jet Ops</div>
            <div className="text-xs text-muted-foreground">Private testing</div>
          </div>
        </div>
        <div className="pt-2">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use your email and password to continue.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          {error ? (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form action={onSubmit} className="mt-4 space-y-4">
            <TabsContent value="signin" className="m-0 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="m-0 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Alex Smith"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use at least 8 characters.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating…" : "Create account"}
              </Button>
            </TabsContent>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}

