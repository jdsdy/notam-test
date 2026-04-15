import Link from "next/link";

const valueProps = [
  {
    title: "NOTAM Triage",
    description:
      "Ingest and prioritize critical notices in seconds, not briefing cycles.",
  },
  {
    title: "Operational Context",
    description:
      "Surface the risk level and operational impact pilots actually need.",
  },
  {
    title: "Flight Desk Speed",
    description:
      "Keep dispatch and crew aligned with one concise, auditable view.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <p className="text-sm font-semibold tracking-[0.18em] text-slate-200">
              JETOPS
            </p>
          </div>
          <Link
            href="/auth"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:text-cyan-300"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 md:py-24">
        <section className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              JetOps
            </p>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
              Agentic operations for private aviation teams.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              JetOps is the command surface for repetitive flight desk work.
              This MVP focuses on one thing: rapid NOTAM categorization and
              concise action-oriented summaries.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth"
                className="rounded-md bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Enter JetOps
              </Link>
              <Link
                href="/app"
                className="rounded-md border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
              >
                Open Local App Route
              </Link>
            </div>
          </div>

          <aside className="md:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                MVP Focus
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">
                Upload NOTAM PDF, process via API, and return categorized
                notices by severity from Category 1 to Category 3.
              </p>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {valueProps.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
            >
              <h2 className="text-sm font-semibold tracking-wide text-slate-100">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {item.description}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
