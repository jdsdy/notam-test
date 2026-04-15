import { getAircraftForOrganisations, getCurrentUser, getOrganisationMemberships } from "@/lib/workspace/data";

export default async function AppOverviewPage() {
  const user = await getCurrentUser();
  const memberships = user ? await getOrganisationMemberships(user.id) : [];
  const aircraft = await getAircraftForOrganisations(
    memberships.map((membership) => membership.organisationId),
  );

  return (
    <section className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
        Operations Dashboard
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">
        JetOps MVP Workspace
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
        Use the sidebar to manage organisations and aircraft, then test the
        NOTAM processing endpoint with a PDF upload.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
            Organisations
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {memberships.length}
          </p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
            Aircraft
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {aircraft.length}
          </p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
            NOTAM Feed
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">Ready</p>
        </article>
      </div>
    </section>
  );
}
