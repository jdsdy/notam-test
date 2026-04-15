"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { AuthActionState, signInAction, signUpAction } from "@/app/(marketing)/auth/actions";

const INITIAL_AUTH_STATE: AuthActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-200"
    >
      {pending ? "Working..." : label}
    </button>
  );
}

export function SignInForm() {
  const [state, action] = useActionState(signInAction, INITIAL_AUTH_STATE);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-slate-50">Sign in</h2>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Email
        </span>
        <input
          required
          name="email"
          type="email"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Password
        </span>
        <input
          required
          name="password"
          type="password"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />
      </label>

      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}

      <SubmitButton label="Sign in" />
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, INITIAL_AUTH_STATE);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-slate-50">Create account</h2>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Name
        </span>
        <input
          required
          name="name"
          type="text"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Email
        </span>
        <input
          required
          name="email"
          type="email"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Password
        </span>
        <input
          required
          name="password"
          type="password"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300 transition focus:ring-2"
        />
      </label>

      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-300">{state.success}</p>
      ) : null}

      <SubmitButton label="Create account" />
    </form>
  );
}
