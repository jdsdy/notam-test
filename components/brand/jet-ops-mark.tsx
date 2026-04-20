import Image from "next/image";

import logo from "@/assets/jetops_logo.png";
import { cn } from "@/lib/utils";

/** Square mark only — used where the full wordmark is too wide (e.g. collapsed sidebar). */
export function JetOpsLogoIcon({
  className,
  size = 36,
}: {
  className?: string;
  /** Display size in CSS pixels (image is 500×500). */
  size?: number;
}) {
  return (
    <Image
      src={logo}
      alt="Jet Ops"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      priority={false}
    />
  );
}

/**
 * Jet Ops brand mark: logo image + wordmark and optional tagline.
 * Used in the sidebar, auth header, marketing nav, and footer.
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
      <JetOpsLogoIcon size={36} className="h-9 w-9" />
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
