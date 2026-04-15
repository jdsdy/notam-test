import Link from "next/link";

import { SignInForm, SignUpForm } from "@/components/auth/auth-forms";

export default function AuthEntryPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-slate-100 shadow-xl shadow-slate-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          JetOps Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
          Sign in or create your account
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Access your workspace for organisation and aircraft operations, then
          test NOTAM processing in the product app.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SignInForm />
          <SignUpForm />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
          >
            Back to landing
          </Link>
        </div>
      </div>
    </main>
  );
}
