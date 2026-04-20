"use client";

import * as React from "react";
import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { JetOpsMark } from "@/components/brand/jet-ops-mark";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function AppNavBar({ email }: { email: string }) {
  const [pending, startTransition] = React.useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const res = await signOut();
      if (res?.ok) {
        window.location.href = "/auth";
      }
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 scale-95 origin-left">
          <JetOpsMark />
        </Link>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <nav className="flex flex-1 items-center gap-2 text-sm">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground",
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/organisations/new"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground",
            )}
          >
            New organisation
          </Link>
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
            {email}
          </span>
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          disabled={pending}
          onClick={handleSignOut}
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
