"use client";

import { useActionState } from "react";

import {
  createOrganisationAction,
  type WorkspaceActionState,
} from "@/app/(product)/app/actions";
import { FormSubmitButton } from "@/components/workspace/form-submit-button";

const INITIAL_STATE: WorkspaceActionState = {};

export function CreateOrganisationForm() {
  const [state, action] = useActionState(createOrganisationAction, INITIAL_STATE);

  return (
    <form action={action} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-slate-50">Create organisation</h2>
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Organisation name
        </span>
        <input
          required
          name="name"
          type="text"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
          placeholder="Atlas Flight Operations"
        />
      </label>

      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-300">{state.success}</p>
      ) : null}

      <FormSubmitButton label="Create organisation" />
    </form>
  );
}
