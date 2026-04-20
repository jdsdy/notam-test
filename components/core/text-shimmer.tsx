"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TextShimmerProps = {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  /** Animation duration in seconds. */
  duration?: number;
  /** Horizontal spread of the highlight (1–3). */
  spread?: number;
};

/**
 * TextShimmer — matches the motion-primitives import API:
 *   import { TextShimmer } from "@/components/core/text-shimmer";
 *
 * Implemented as a pure CSS animation so it stays dependency-free while
 * respecting prefers-reduced-motion.
 */
export function TextShimmer({
  children,
  as: Component = "span",
  className,
  duration = 2.4,
  spread = 2,
}: TextShimmerProps) {
  const style = React.useMemo(
    () =>
      ({
        "--shimmer-duration": `${duration}s`,
        "--shimmer-spread": `${Math.max(1, Math.min(spread, 4))}`,
      }) as React.CSSProperties,
    [duration, spread],
  );

  return (
    <Component
      className={cn(
        "relative inline-block bg-clip-text text-transparent",
        "bg-[length:calc(var(--shimmer-spread)*100%)_auto] [animation-duration:var(--shimmer-duration)]",
        "bg-[linear-gradient(110deg,var(--shimmer-base)_0%,var(--shimmer-base)_40%,var(--shimmer-highlight)_50%,var(--shimmer-base)_60%,var(--shimmer-base)_100%)]",
        "[animation-name:text-shimmer-slide] [animation-iteration-count:infinite] [animation-timing-function:linear]",
        "motion-reduce:animate-none motion-reduce:text-[color:var(--shimmer-base)] motion-reduce:bg-none motion-reduce:bg-clip-border motion-reduce:[-webkit-text-fill-color:currentColor]",
        "[--shimmer-base:color-mix(in_oklch,var(--muted-foreground)_85%,transparent)]",
        "[--shimmer-highlight:var(--foreground)]",
        className,
      )}
      style={style}
    >
      {children}
    </Component>
  );
}

export default TextShimmer;
