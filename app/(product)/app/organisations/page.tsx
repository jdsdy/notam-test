import { redirect } from "next/navigation";

import { CreateOrganisationForm } from "@/components/workspace/create-organisation-form";
import {
  getCurrentUser,
  getOrganisationMemberships,
} from "@/lib/workspace/data";

export default async function OrganisationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const memberships = await getOrganisationMemberships(user.id);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Organisations
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
          Manage operating entities
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Create organisations and assign aircraft under each operating company.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-[360px_minmax(0,1fr)]">
        <CreateOrganisationForm />

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-slate-50">
            Your organisations
          </h2>

          {memberships.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">
              No organisations yet. Create your first organisation to begin.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {memberships.map((membership) => (
                <li
                  key={membership.organisationId}
                  className="rounded-md border border-slate-800 bg-slate-950/70 p-3"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {membership.organisationName}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Access level: {membership.isAdmin ? "Admin" : "Member"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
