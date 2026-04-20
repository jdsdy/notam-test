import type { MemberWithProfile } from "@/lib/organisations";
import { cn } from "@/lib/utils";

function initialsOf(name: string, email: string) {
  const n = name.trim();
  if (n && n !== "—") {
    const parts = n.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }
  return email.slice(0, 2).toUpperCase();
}

export default function OrgMembersList({
  members,
  adminCount,
}: {
  members: MemberWithProfile[];
  adminCount: number;
}) {
  const sorted = [...members].sort((a, b) => {
    if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-white/80 shadow-[0_1px_0_color-mix(in_oklch,white_40%,transparent)_inset,0_8px_30px_-24px_color-mix(in_oklch,var(--primary)_30%,transparent)]">
      <header className="flex items-start justify-between gap-4 border-b border-border/50 px-6 py-5">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
            Crew
          </p>
          <h2 className="mt-1 font-heading text-xl tracking-tight text-foreground">
            Members
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {adminCount} administrator{adminCount === 1 ? "" : "s"} · {members.length - adminCount}{" "}
            other{members.length - adminCount === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div className="flex-1 p-2">
        {members.length === 0 ? (
          <div className="m-4 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/60 bg-white/40 px-6 py-8 text-center text-sm text-muted-foreground">
            No members in this organisation.
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {sorted.map((m, i) => (
              <li
                key={m.user_id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rise-in",
                  i < 6 && `rise-in-${i + 1}`,
                )}
              >
                <span
                  aria-hidden
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.9_0.07_30)] to-[oklch(0.85_0.08_305)] text-[0.7rem] font-medium text-[oklch(0.3_0.14_285)] ring-1 ring-[oklch(0.5_0.14_285_/_0.15)]"
                >
                  {initialsOf(m.full_name, m.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.full_name}
                  </p>
                  <p className="truncate font-mono text-[0.7rem] text-muted-foreground">
                    {m.email}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {m.is_admin ? (
                    <span className="rounded-full border border-[oklch(0.85_0.1_285)] bg-[oklch(0.96_0.04_285)] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-[oklch(0.35_0.14_285)]">
                      Admin
                    </span>
                  ) : null}
                  {m.role ? (
                    <span className="text-[0.7rem] text-muted-foreground">
                      {m.role}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
