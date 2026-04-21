import Link from "next/link";
import { headers } from "next/headers";

import { JetOpsMark } from "@/components/brand/jet-ops-mark";
import { buttonVariants } from "@/components/ui/button";
import { buildAppEntryUrlFromHeaders } from "@/lib/hosts";
import { cn } from "@/lib/utils";

const FEATURES: Array<{ eyebrow: string; title: string; body: string }> = [
  {
    eyebrow: "01 — Flight plans",
    title: "Upload a plan, get a brief.",
    body: "Drop a PDF and Jet Ops extracts the route, timing, weights and raw NOTAMs — you only review what the parser wasn't sure about.",
  },
  {
    eyebrow: "02 — NOTAM triage",
    title: "The ones that matter, first.",
    body: "NOTAMs are grouped into three priority tiers with plain-language summaries, so you spend the brief on the decisions, not the decoding.",
  },
  {
    eyebrow: "03 — Shared fleet",
    title: "One source of truth per org.",
    body: "Aircraft, members, and flights live inside an organisation. Invite admins to run the roster; everyone else rides along, read-only.",
  },
];

export default async function MarketingHomePage() {
  const headerList = await headers();
  const appUrl = buildAppEntryUrlFromHeaders(headerList);

  return (
    <main className="relative flex min-h-[100svh] flex-col">
      {/* ——— Nav ——— */}
      <header className="sticky top-0 z-40">
        <div className="surface-frost border-b border-border/50">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6 md:px-10">
            <Link href="/" className="group">
              <JetOpsMark tagline="Private MVP" />
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
              <a href="#what" className="hover:text-foreground transition-colors">
                What you get
              </a>
              <a href="#status" className="hover:text-foreground transition-colors">
                Status
              </a>
            </nav>
            <Link
              href={appUrl}
              className={cn(
                buttonVariants({ size: "sm" }),
                "shadow-soft [a]:hover:bg-primary/90",
              )}
            >
              Go to app
              <span aria-hidden className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ——— Hero ——— */}
      <section className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-24 md:px-10 md:pt-32">
        <div className="grid items-start gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="rise-in rise-in-1 font-mono text-[0.72rem] uppercase tracking-[0.22em] text-muted-foreground">
              Flight ops · Private testing · 2026
            </p>
            <h1 className="rise-in rise-in-2 mt-6 font-heading text-5xl leading-[1.02] tracking-tight text-foreground md:text-7xl">
              Brief the{" "}
              <span className="italic text-[oklch(0.38_0.16_285)]">decisions</span>,
              <br className="hidden md:block" /> not the decoding.
            </h1>
            <p className="rise-in rise-in-3 mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-[1.05rem]">
              Jet Ops is a calmer workspace for charter and corporate flight ops.
              Parse plans, triage NOTAMs, and keep your fleet and crew on the same
              page — without the spreadsheet gymnastics.
            </p>

            <div className="rise-in rise-in-4 mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={appUrl}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 px-5 shadow-soft [a]:hover:bg-primary/90",
                )}
              >
                Open the app
                <span aria-hidden className="ml-1">→</span>
              </Link>
              <a
                href="#what"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 border-foreground/10 bg-white/60 px-5 text-foreground backdrop-blur",
                )}
              >
                See what&apos;s inside
              </a>
            </div>

            <p className="rise-in rise-in-5 mt-8 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.15_150)] shadow-[0_0_0_3px_oklch(0.7_0.15_150_/_0.22)]"
              />
              MVP live for invited operators · feedback baked into every page
            </p>
          </div>

          {/* Hero side-panel — abstract flight-plan "specimen" card */}
          <div className="rise-in rise-in-5 lg:col-span-5">
            <div className="halo relative">
              <div className="relative overflow-hidden rounded-2xl surface-frost ring-hairline p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
                    Sample · Flight brief
                  </p>
                  <span className="rounded-full bg-[oklch(0.95_0.05_150)] px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-[oklch(0.4_0.15_150)]">
                    Draft
                  </span>
                </div>

                <div className="mt-6 flex items-end gap-4">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">YSSY</p>
                    <p className="font-heading text-3xl tracking-tight">09:10z</p>
                  </div>
                  <div className="flex-1 pb-2" aria-hidden>
                    <div className="relative h-px bg-gradient-to-r from-foreground/30 via-foreground/10 to-foreground/30">
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background px-2 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                        56 min · DCT
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-muted-foreground">YBBN</p>
                    <p className="font-heading text-3xl tracking-tight">10:06z</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { k: "Aircraft", v: "VH-OPS · G550" },
                    { k: "Weight", v: "67,883 lb" },
                    { k: "NOTAMs", v: "10 parsed" },
                  ].map((cell) => (
                    <div
                      key={cell.k}
                      className="rounded-lg border border-border/60 bg-white/60 p-3"
                    >
                      <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
                        {cell.k}
                      </p>
                      <p className="mt-1 text-sm font-medium">{cell.v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2">
                  {[
                    { t: "RWY 09 CLSD — WIP", c: "1" },
                    { t: "GPS RAIM outage predicted", c: "2" },
                    { t: "ATIS FREQ changed", c: "3" },
                  ].map((n) => (
                    <div
                      key={n.t}
                      className="flex items-center justify-between rounded-md border border-border/50 bg-white/70 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{n.t}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 font-mono text-[0.65rem]",
                          n.c === "1" &&
                            "bg-[oklch(0.95_0.07_25)] text-[oklch(0.45_0.2_25)]",
                          n.c === "2" &&
                            "bg-[oklch(0.96_0.08_75)] text-[oklch(0.45_0.15_75)]",
                          n.c === "3" &&
                            "bg-[oklch(0.95_0.06_240)] text-[oklch(0.4_0.15_240)]",
                        )}
                      >
                        Cat {n.c}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Feature triptych ——— */}
      <section id="what" className="mx-auto w-full max-w-6xl px-6 pb-24 md:px-10">
        <div className="mb-12 flex items-end justify-between gap-6">
          <h2 className="font-heading text-2xl tracking-tight md:text-3xl">
            What lives inside
          </h2>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            v0.1 — MVP
          </span>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl bg-border/50 ring-hairline md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className={cn(
                "group relative bg-white/75 p-7 transition-colors hover:bg-white",
                "rise-in",
                i === 0 && "rise-in-1",
                i === 1 && "rise-in-2",
                i === 2 && "rise-in-3",
              )}
            >
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
                {f.eyebrow}
              </p>
              <h3 className="mt-5 font-heading text-xl tracking-tight text-foreground">
                {f.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ——— Status + CTA ——— */}
      <section id="status" className="mx-auto w-full max-w-6xl px-6 pb-28 md:px-10">
        <div className="rounded-2xl surface-frost ring-hairline px-8 py-10 shadow-soft md:px-12 md:py-14">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
                Invite-only · Testing phase
              </p>
              <h2 className="mt-3 font-heading text-3xl leading-tight tracking-tight md:text-4xl">
                Already holding an account?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in to pick up where you left off.
                Otherwise, email us and we&apos;ll add you to the pilot group.
              </p>
            </div>
            <Link
              href={appUrl}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 px-6 shadow-soft [a]:hover:bg-primary/90",
              )}
            >
              Go to app
              <span aria-hidden className="ml-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ——— Footer ——— */}
      <footer className="mt-auto border-t border-border/50 bg-white/40 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-10 text-sm md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-4">
            <JetOpsMark />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} Jet Ops
            </span>
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em]">
              Not for operational use
            </span>
            <Link
              href={appUrl}
              className="font-mono text-[0.7rem] uppercase tracking-[0.2em] hover:text-foreground"
            >
              app.
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
