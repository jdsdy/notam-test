"use client";

import * as React from "react";

import {
  signInWithPassword,
  signUpWithPassword,
} from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function isAuthMode(value: string): value is "signin" | "signup" {
  return value === "signin" || value === "signup";
}

const SIGNUP_DISABLED_MESSAGE =
  "Account creation is currently not possible as JetOps is in a private invite-only testing phase. If you should have access, please contact your JetOps representative";

export default function AuthCard() {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res =
        mode === "signin"
          ? await signInWithPassword(formData)
          : await signUpWithPassword(formData);

      if (!res) {
        setError("Something went wrong. Try again.");
        return;
      }

      if (res.ok) {
        if ("pendingEmailConfirmation" in res && res.pendingEmailConfirmation) {
          setInfo("Check your email to confirm your account, then sign in.");
          return;
        }
        window.location.href = "/";
        return;
      }

      setError(res.message);
    });
  }

  return (
    <div className="surface-frost relative overflow-hidden rounded-2xl ring-hairline shadow-soft">
      <div className="px-7 pt-8">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
          {mode === "signin" ? "Returning" : "New here"}
        </p>
        <h2 className="mt-2 font-heading text-3xl tracking-tight text-foreground">
          {mode === "signin" ? "Welcome back." : "Create an account."}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Use the email and password from your invite."
            : "You must be on the testing invite list for sign-up to work."}
        </p>
      </div>

      <div className="px-7 py-6">
        <ModeSwitch
          mode={mode}
          onChange={(nextMode) => {
            setMode(nextMode);
            setError(null);
            setInfo(null);
          }}
        />

        {error ? (
          <Alert className="mt-5 border-[oklch(0.85_0.08_25)] bg-[oklch(0.98_0.02_25)] text-[oklch(0.4_0.18_25)]">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {info ? (
          <Alert className="mt-5 border-[oklch(0.85_0.07_150)] bg-[oklch(0.97_0.03_150)] text-[oklch(0.35_0.15_150)]">
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        ) : null}

        {mode === "signup" ? (
          <div className="mt-5 rounded-xl border border-border/60 bg-white/70 p-4 text-sm leading-relaxed text-foreground backdrop-blur">
            {SIGNUP_DISABLED_MESSAGE}
          </div>
        ) : (
          <form action={onSubmit} className="mt-5 space-y-4">
            <Field label="Email" id={`${mode}-email`}>
              <Input
                id={`${mode}-email`}
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
              />
            </Field>

            <Field label="Password" id={`${mode}-password`}>
              <Input
                id={`${mode}-password`}
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Button
              type="submit"
              className="mt-2 h-10 w-full shadow-soft [a]:hover:bg-primary/90"
              disabled={pending}
            >
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: "signin" | "signup";
  onChange: (m: "signin" | "signup") => void;
}) {
  return (
    <div
      role="tablist"
      className="relative grid grid-cols-2 rounded-xl bg-[oklch(0.95_0.02_300)] p-1 text-sm"
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm ring-1 ring-foreground/5 transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          mode === "signin" ? "translate-x-0" : "translate-x-[calc(100%+0.25rem)]",
        )}
        style={{ left: "0.25rem" }}
      />
      <button
        type="button"
        role="tab"
        aria-selected={mode === "signin"}
        onClick={() => {
          if (isAuthMode("signin")) onChange("signin");
        }}
        className={cn(
          "relative z-10 rounded-lg px-3 py-1.5 font-medium transition-colors",
          mode === "signin"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Sign in
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "signup"}
        onClick={() => {
          if (isAuthMode("signup")) onChange("signup");
        }}
        className={cn(
          "relative z-10 rounded-lg px-3 py-1.5 font-medium transition-colors",
          mode === "signup"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Create account
      </button>
    </div>
  );
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
