import { NotamProcessor } from "@/components/workspace/notam-processor";

export default function NotamsPage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          NOTAM Processor
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
          Categorize and summarize briefing notices
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          This MVP endpoint returns deterministic dummy data to validate the UI
          flow. Each NOTAM item is grouped into Category 1, Category 2, or
          Category 3 and can be expanded for detail.
        </p>
      </header>

      <NotamProcessor />
    </section>
  );
}
