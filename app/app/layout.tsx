import { headers } from "next/headers";
import { redirect } from "next/navigation";

import AppNavBar from "@/components/app/app-nav-bar";
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

  return (
    <div className="min-h-screen bg-background">
      <AppNavBar email={user.email ?? user.id} />
      {children}
    </div>
  );
}
