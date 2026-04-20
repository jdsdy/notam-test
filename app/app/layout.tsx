import { headers } from "next/headers";
import { redirect } from "next/navigation";

import AppSidebar from "@/components/app/app-sidebar";
import { listMyOrganisations } from "@/lib/organisations";
import { ensureProfile, getProfileForUser } from "@/lib/profile";
import { getCurrentUser } from "@/lib/supabase/server";

const ORIGINAL_PATH_HEADER = "x-original-pathname";

function readOriginalPathname(headerList: Headers) {
  return (
    headerList.get(`x-middleware-request-${ORIGINAL_PATH_HEADER}`) ??
    headerList.get(ORIGINAL_PATH_HEADER)
  );
}

function isPublicAppPath(originalPathname: string | null) {
  if (!originalPathname) return false;
  return originalPathname === "/auth";
}

export default async function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headerList = await headers();
  const originalPathname = readOriginalPathname(headerList);
  const user = await getCurrentUser();

  if (isPublicAppPath(originalPathname)) {
    if (user) {
      redirect("/");
    }
    return children;
  }

  if (!user) {
    redirect("/auth");
  }

  await ensureProfile(user);

  const [profile, organisations] = await Promise.all([
    getProfileForUser(user.id),
    listMyOrganisations(user.id),
  ]);

  const displayName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "") ||
    "";

  return (
    <div className="relative min-h-screen">
      <AppSidebar
        user={{
          name: displayName,
          email: user.email ?? user.id,
        }}
        organisations={organisations}
      />
      <div className="md:pl-[16.5rem] transition-[padding] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] [html[data-sidebar-collapsed='1']_&]:md:pl-[4.5rem]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
