import { redirect } from "next/navigation";

import { CreateAircraftForm } from "@/components/workspace/create-aircraft-form";
import {
  getAircraftForOrganisations,
  getCurrentUser,
  getOrganisationMemberships,
} from "@/lib/workspace/data";

export default async function AircraftPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const memberships = await getOrganisationMemberships(user.id);
  const organisationIds = memberships.map((membership) => membership.organisationId);
  const aircraft = await getAircraftForOrganisations(organisationIds);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Aircraft
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">
          Fleet registry
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Add aircraft to the correct organisation and keep a clean operational
          inventory.
        </p>
      </header>

      {memberships.length === 0 ? (
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100">
          Create an organisation before adding aircraft.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[380px_minmax(0,1fr)]">
          <CreateAircraftForm
            organisations={memberships.map((membership) => ({
              id: membership.organisationId,
              name: membership.organisationName,
            }))}
          />

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-slate-50">Current fleet</h2>
            {aircraft.length === 0 ? (
              <p className="mt-4 text-sm text-slate-300">
                No aircraft added yet for your organisations.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {aircraft.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border border-slate-800 bg-slate-950/70 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      {item.tail_number} · {item.manufacturer} {item.type}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Seats: {item.seats} · Organisation: {item.organisationName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
