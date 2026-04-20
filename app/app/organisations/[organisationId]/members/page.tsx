import Link from "next/link";
import { notFound } from "next/navigation";

import OrgMembersList from "@/components/app/org-members-list";
import { buttonVariants } from "@/components/ui/button";
import {
  assertOrgAccess,
  getOrganisationName,
  listOrganisationMembers,
} from "@/lib/organisations";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ organisationId: string }>;
};

export default async function OrganisationMembersPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { organisationId } = await params;
  const hasAccess = await assertOrgAccess(user.id, organisationId);
  if (!hasAccess) notFound();

  const [name, members] = await Promise.all([
    getOrganisationName(organisationId),
    listOrganisationMembers(organisationId),
  ]);

  const admins = members.filter((m) => m.is_admin);

  return (
    <main className="space-y-10">
      <header className="rise-in rise-in-1 space-y-4 border-b border-border/50 pb-8">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Dashboard
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href={`/organisations/${organisationId}`}
            className="hover:text-foreground"
          >
            {name ?? "Organisation"}
          </Link>
          <span className="mx-1.5">/</span>
          <span>Members</span>
        </p>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
              Members
            </h1>
            <p className="text-sm text-muted-foreground">
              {members.length} people in this workspace
            </p>
          </div>
          <Link
            href={`/organisations/${organisationId}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "bg-white/60",
            )}
          >
            Back to organisation
          </Link>
        </div>
      </header>

      <section className="rise-in rise-in-2">
        <OrgMembersList members={members} adminCount={admins.length} />
      </section>
    </main>
  );
}
