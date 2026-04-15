"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import {
  createAircraftAction,
  type WorkspaceActionState,
} from "@/app/(product)/app/actions";
import {
  AIRCRAFT_MANUFACTURERS,
  getAircraftTypesByManufacturer,
} from "@/lib/aircraft/catalog";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

const INITIAL_STATE: WorkspaceActionState = {};

type OrganisationOption = {
  id: string;
  name: string;
};

type CreateAircraftFormProps = {
  organisations: OrganisationOption[];
};

export function CreateAircraftForm({ organisations }: CreateAircraftFormProps) {
  const [state, action] = useActionState(createAircraftAction, INITIAL_STATE);
  const [manufacturer, setManufacturer] = useState(
    AIRCRAFT_MANUFACTURERS[0] ?? "",
  );

  const availableTypes = useMemo(
    () => getAircraftTypesByManufacturer(manufacturer),
    [manufacturer],
  );
  const [type, setType] = useState(availableTypes[0] ?? "");

  useEffect(() => {
    setType(availableTypes[0] ?? "");
  }, [availableTypes]);

  return (
    <form action={action} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-slate-50">Add aircraft</h2>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Organisation
        </span>
        <select
          required
          name="organisationId"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
          defaultValue={organisations[0]?.id}
        >
          {organisations.map((organisation) => (
            <option key={organisation.id} value={organisation.id}>
              {organisation.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Tail number
        </span>
        <input
          required
          name="tailNumber"
          type="text"
          placeholder="N700GX"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Manufacturer
        </span>
        <select
          required
          name="manufacturer"
          value={manufacturer}
          onChange={(event) => setManufacturer(event.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        >
          {AIRCRAFT_MANUFACTURERS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Type
        </span>
        <select
          required
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        >
          {availableTypes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Seats
        </span>
        <input
          required
          name="seats"
          type="number"
          min={1}
          placeholder="14"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />
      </label>

      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-300">{state.success}</p>
      ) : null}

      <FormSubmitButton label="Add aircraft" />
    </form>
  );
}
