"use client";

import * as React from "react";

import { createOrganisationAction } from "@/app/actions/organisation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CreateOrganisationForm() {
  const [state, formAction, pending] = React.useActionState(
    createOrganisationAction,
    { error: null as string | null },
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 p-6 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset,0_8px_30px_-24px_color-mix(in_oklch,var(--primary)_30%,transparent)] sm:p-8">
      <header className="mb-6 space-y-1">
        <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
          Details
        </p>
        <h2 className="font-heading text-xl tracking-tight text-foreground">
          Name your organisation
        </h2>
        <p className="text-sm text-muted-foreground">
          You&apos;ll be added as an administrator and can invite members from
          the organisation page.
        </p>
      </header>

      <form action={formAction} className="space-y-5">
        {state.error ? (
          <div className="rounded-xl border border-red-300/70 bg-red-50/80 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Could not create organisation</p>
            <p className="mt-0.5 text-[0.85rem] opacity-90">{state.error}</p>
          </div>
        ) : null}

        <Field
          id="organisation_name"
          label="Organisation name"
          placeholder="Acme Aviation"
          required
          maxLength={200}
        />
        <Field
          id="member_role"
          label="Your role"
          placeholder="Chief pilot, dispatcher, …"
          required
          maxLength={200}
          description="This is shown next to your name on the members list."
        />

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={pending}
            className={cn(buttonVariants({ size: "sm" }), "min-w-[160px]")}
          >
            {pending ? "Creating…" : "Create organisation"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  placeholder,
  description,
  required,
  maxLength,
}: {
  id: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-xl border border-border/70 bg-white/70 px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-white focus:ring-2 focus:ring-primary/15"
      />
      {description ? (
        <p className="text-[0.72rem] text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
