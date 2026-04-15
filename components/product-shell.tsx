import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/app", label: "Overview" },
  { href: "/app/organisations", label: "Organisations" },
  { href: "/app/aircraft", label: "Aircraft" },
  { href: "/app/notams", label: "NOTAM Processor" },
];

type ProductShellProps = {
  children: ReactNode;
  userEmail?: string;
  userName?: string;
  headerActions?: ReactNode;
};

export function ProductShell({
  children,
  userEmail,
  userName,
  headerActions,
}: ProductShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            <p className="text-sm font-semibold tracking-[0.18em] text-slate-200">
              JETOPS APP
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-slate-400">
              <p>{userName ?? "Operational user"}</p>
              <p>{userEmail ?? "Authentication pending"}</p>
            </div>
            {headerActions}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
