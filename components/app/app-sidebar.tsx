"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { JetOpsMark } from "@/components/brand/jet-ops-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OrganisationSummary } from "@/lib/organisations";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string; email: string };
  organisations: OrganisationSummary[];
};

const COLLAPSE_STORAGE_KEY = "jetops.sidebar.collapsed";

export default function AppSidebar({ user, organisations }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState<boolean>(false);
  const [ready, setReady] = React.useState(false);
  const [pendingSignOut, startSignOut] = React.useTransition();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (raw === "1") setCollapsed(true);
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? "1" : "0");
    document.documentElement.dataset.sidebarCollapsed = collapsed ? "1" : "0";
  }, [collapsed, ready]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleSignOut() {
    startSignOut(async () => {
      const res = await signOut();
      if (res?.ok) {
        window.location.href = "/auth";
      }
    });
  }

  const initials = React.useMemo(() => {
    const n = user.name?.trim();
    if (!n) return user.email.slice(0, 2).toUpperCase();
    const parts = n.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }, [user.name, user.email]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const width = collapsed ? "w-[4.5rem]" : "w-[16.5rem]";

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/60 surface-frost px-4 py-3 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-white/60"
        >
          <BurgerIcon />
        </button>
        <JetOpsMark />
        <Link
          href="/profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[oklch(0.22_0.04_285)] text-xs font-medium text-primary-foreground"
        >
          {initials || "·"}
        </Link>
      </div>

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/40 surface-frost transition-all duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          width,
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Brand row */}
        <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-4">
          {collapsed ? (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[oklch(0.22_0.04_285)] text-primary-foreground ring-1 ring-[oklch(1_0_0_/_0.15)]">
              <span className="font-heading text-lg leading-none">
                J<span className="text-amber-200/90">°</span>
              </span>
            </span>
          ) : (
            <JetOpsMark tagline="Private MVP" />
          )}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-white/60 text-muted-foreground hover:text-foreground md:inline-flex"
          >
            <ChevronIcon direction={collapsed ? "right" : "left"} />
          </button>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-white/60 md:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        {/* User block */}
        <div className={cn("px-3 pb-4", collapsed && "px-2")}>
          <Link
            href="/profile"
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-border/60 hover:bg-white/60",
              collapsed && "justify-center",
            )}
          >
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.88_0.08_30)] to-[oklch(0.78_0.1_305)] text-sm font-medium text-[oklch(0.25_0.05_285)] ring-1 ring-[oklch(0.4_0.14_285_/_0.25)]"
            >
              {initials || "·"}
            </span>
            {!collapsed ? (
              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="block truncate text-sm font-medium leading-tight text-foreground">
                  {user.name || user.email.split("@")[0]}
                </span>
                <span className="block truncate text-[0.72rem] leading-tight text-muted-foreground">
                  {user.email}
                </span>
              </span>
            ) : null}
          </Link>
        </div>

        <div className="mx-3 h-px bg-border/50" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 text-sm">
          <NavItem
            href="/"
            label="Home"
            active={isActive("/")}
            collapsed={collapsed}
            icon={<HomeIcon />}
          />
          <NavItem
            href="/profile"
            label="Profile"
            active={isActive("/profile")}
            collapsed={collapsed}
            icon={<UserIcon />}
          />

          <div className="mt-6 mb-2 flex items-center justify-between px-2">
            {!collapsed ? (
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                Organisations
              </span>
            ) : (
              <span
                aria-hidden
                className="mx-auto h-px w-8 bg-border/70"
              />
            )}
            {!collapsed ? (
              <Link
                href="/organisations/new"
                aria-label="New organisation"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-white/60 text-muted-foreground hover:text-foreground"
              >
                <PlusIcon />
              </Link>
            ) : null}
          </div>

          {organisations.length === 0 ? (
            !collapsed ? (
              <div className="mt-1 rounded-lg border border-dashed border-border/60 bg-white/40 px-3 py-3 text-xs text-muted-foreground">
                No organisations yet.
                <Link
                  href="/organisations/new"
                  className="mt-2 block font-medium text-foreground underline underline-offset-4"
                >
                  Create one
                </Link>
              </div>
            ) : null
          ) : (
            <ul className="space-y-1">
              {organisations.map((org) => (
                <li key={org.id}>
                  <NavItem
                    href={`/organisations/${org.id}`}
                    label={org.name}
                    active={isActive(`/organisations/${org.id}`)}
                    collapsed={collapsed}
                    icon={<OrgDot label={org.name} />}
                  />
                </li>
              ))}
              {collapsed ? (
                <li className="mt-2">
                  <Link
                    href="/organisations/new"
                    aria-label="New organisation"
                    className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground"
                  >
                    <PlusIcon />
                  </Link>
                </li>
              ) : null}
            </ul>
          )}
        </nav>

        <div className="mx-3 h-px bg-border/50" />

        <div className={cn("p-3", collapsed && "p-2")}>
          <Button
            type="button"
            variant="outline"
            onClick={handleSignOut}
            disabled={pendingSignOut}
            className={cn(
              "w-full justify-start gap-2 bg-white/60 text-muted-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <SignOutIcon />
            {!collapsed ? (
              <span>{pendingSignOut ? "Signing out…" : "Sign out"}</span>
            ) : null}
          </Button>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  href,
  label,
  active,
  collapsed,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "h-9 w-full justify-start gap-3 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-white/70 hover:text-foreground",
        active &&
          "bg-white text-foreground ring-1 ring-[oklch(0.55_0.12_285_/_0.25)] shadow-[0_1px_0_color-mix(in_oklch,white_50%,transparent)_inset,0_4px_14px_-8px_color-mix(in_oklch,var(--primary)_40%,transparent)]",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center text-[oklch(0.4_0.14_285)]">
        {icon}
      </span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

function OrgDot({ label }: { label: string }) {
  const ch = label.trim()[0]?.toUpperCase() ?? "·";
  return (
    <span className="grid h-5 w-5 place-items-center rounded-md bg-[oklch(0.95_0.05_305)] text-[0.65rem] font-medium text-[oklch(0.35_0.14_285)]">
      {ch}
    </span>
  );
}

/* ——— Icons (kept inline so we don't pay for lucide-react on the edge) ——— */

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-3.5 4.5-5.2 7.5-5.2s6 1.7 7.5 5.2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BurgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "transition-transform",
        direction === "right" && "rotate-180",
      )}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17 5 12l5-5" />
      <path d="M5 12h12" />
    </svg>
  );
}
