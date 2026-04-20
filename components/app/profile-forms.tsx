"use client";

import * as React from "react";

import {
  updateProfileEmailAction,
  updateProfileNameAction,
  updateProfilePasswordAction,
} from "@/app/actions/profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ProfileForms({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <NameCard initialName={initialName} />
      <EmailCard initialEmail={initialEmail} />
      <PasswordCard />
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rise-in rise-in-2 overflow-hidden rounded-2xl border border-border/60 bg-white/80 p-6 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset,0_8px_30px_-24px_color-mix(in_oklch,var(--primary)_30%,transparent)]",
        className,
      )}
    >
      <div className="mb-5 space-y-1">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="font-heading text-xl tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </Label>
  );
}

function ResultAlert({
  state,
  savedCopy,
  errorCopy,
}: {
  state: { error: string | null; ok?: boolean };
  savedCopy: string;
  errorCopy: string;
}) {
  if (state.error) {
    return (
      <Alert className="border-[oklch(0.85_0.08_25)] bg-[oklch(0.98_0.02_25)] text-[oklch(0.4_0.18_25)]">
        <AlertTitle>{errorCopy}</AlertTitle>
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.ok) {
    return (
      <Alert className="border-[oklch(0.85_0.07_150)] bg-[oklch(0.97_0.03_150)] text-[oklch(0.35_0.15_150)]">
        <AlertTitle>{savedCopy}</AlertTitle>
      </Alert>
    );
  }
  return null;
}

function NameCard({ initialName }: { initialName: string }) {
  const [state, formAction, pending] = React.useActionState(
    updateProfileNameAction,
    { error: null as string | null },
  );
  return (
    <SectionCard
      eyebrow="Identity"
      title="Display name"
      description="Shown to other members of your organisations."
    >
      <form action={formAction} className="space-y-4">
        <ResultAlert state={state} savedCopy="Saved" errorCopy="Could not save" />
        <div className="space-y-1.5">
          <FieldLabel htmlFor="full_name">Full name</FieldLabel>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={initialName}
            autoComplete="name"
            required
            maxLength={200}
            className="h-10"
          />
        </div>
        <Button type="submit" disabled={pending} className="h-10 shadow-soft">
          {pending ? "Saving…" : "Save name"}
        </Button>
      </form>
    </SectionCard>
  );
}

function EmailCard({ initialEmail }: { initialEmail: string }) {
  const [state, formAction, pending] = React.useActionState(
    updateProfileEmailAction,
    { error: null as string | null },
  );
  return (
    <SectionCard
      eyebrow="Sign-in"
      title="Email address"
      description="You may need to confirm the new address before it takes effect."
    >
      <form action={formAction} className="space-y-4">
        <ResultAlert
          state={state}
          savedCopy="Check your inbox"
          errorCopy="Could not update email"
        />
        <div className="space-y-1.5">
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initialEmail}
            autoComplete="email"
            required
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Current: <span className="font-mono">{initialEmail}</span>
          </p>
        </div>
        <Button type="submit" disabled={pending} className="h-10 shadow-soft">
          {pending ? "Updating…" : "Update email"}
        </Button>
      </form>
    </SectionCard>
  );
}

function PasswordCard() {
  const [state, formAction, pending] = React.useActionState(
    updateProfilePasswordAction,
    { error: null as string | null },
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <SectionCard
      eyebrow="Security"
      title="Password"
      description="Use at least 8 characters. You'll stay signed in on this device."
      className="lg:col-span-2"
    >
      <form ref={formRef} action={formAction} className="space-y-4">
        <ResultAlert
          state={state}
          savedCopy="Password updated"
          errorCopy="Could not update password"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="h-10"
            />
          </div>
        </div>
        <Button type="submit" disabled={pending} className="h-10 shadow-soft">
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </SectionCard>
  );
}
