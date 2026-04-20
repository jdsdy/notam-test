import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OrgMembersSummaryCard({
  organisationId,
  memberCount,
  adminCount,
}: {
  organisationId: string;
  memberCount: number;
  adminCount: number;
}) {
  const href = `/organisations/${organisationId}/members`;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset,0_8px_30px_-24px_color-mix(in_oklch,var(--primary)_30%,transparent)]">
      <header className="border-b border-border/50 px-6 py-5">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
          Crew
        </p>
        <h2 className="mt-1 font-heading text-xl tracking-tight text-foreground">
          Members
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          View everyone in this organisation on the members page.
        </p>
      </header>

      <Link
        href={href}
        className="group flex flex-1 flex-col justify-between gap-6 p-6 transition-colors hover:bg-white/50"
      >
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
            Total members
          </p>
          <p className="mt-2 font-heading text-5xl tabular-nums tracking-tight text-foreground">
            {memberCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {adminCount} administrator{adminCount === 1 ? "" : "s"} ·{" "}
            {memberCount - adminCount} other
            {memberCount - adminCount === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-none w-fit bg-white/70 group-hover:border-primary/40 group-hover:text-foreground",
          )}
        >
          View members
        </span>
      </Link>
    </section>
  );
}
