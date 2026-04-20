import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * JetOps wordmark: capital "J" on a plinth next to the wordmark in sans.
 * next to the rest of the name in the body sans. Used in the sidebar, auth
 * card, and marketing nav so the brand feels coherent across surfaces.
 */
export function JetOpsMark({
  className,
  tagline,
}: {
  className?: string;
  tagline?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[oklch(0.22_0.04_285)] text-primary-foreground shadow-soft ring-1 ring-[oklch(1_0_0_/_0.15)]">
        <span className="font-heading text-lg leading-none tracking-tight">
          J<span className="text-amber-200/90">°</span>
        </span>
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-heading text-[1.05rem] tracking-tight text-foreground">
          Jet<span className="italic text-[oklch(0.4_0.14_285)]"> Ops</span>
        </span>
        {tagline ? (
          <span className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            {tagline}
          </span>
        ) : null}
      </div>
    </div>
  );
}
