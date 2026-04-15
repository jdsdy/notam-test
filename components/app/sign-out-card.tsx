"use client";

import * as React from "react";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default function SignOutCard({ email }: { email: string }) {
  const [pending, startTransition] = React.useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const res = await signOut();
      if (res?.ok) {
        window.location.href = "/auth";
      }
    });
  }

  return (
    <div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
      <p className="text-xs text-muted-foreground">Signed in as</p>
      <p className="mt-1 font-mono text-sm text-foreground">{email}</p>
      <h2 className="mt-6 text-balance font-heading text-2xl tracking-tight">
        Success — you are in.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This is the MVP app surface on{" "}
        <span className="font-mono">app.[domain]</span>.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-6"
        disabled={pending}
        onClick={handleSignOut}
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
