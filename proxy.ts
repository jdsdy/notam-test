import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";

const APP_PATH_PREFIX = "/app";

function isAppSubdomain(hostname: string): boolean {
  return hostname.startsWith("app.");
}

function shouldBypassRewrite(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export async function proxy(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const normalizedHost = host.toLowerCase();
  const { pathname, search } = request.nextUrl;
  const supabaseResponse = await updateSupabaseSession(request);

  if (!isAppSubdomain(normalizedHost) || shouldBypassRewrite(pathname)) {
    return supabaseResponse;
  }

  if (pathname.startsWith(APP_PATH_PREFIX)) {
    return supabaseResponse;
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname =
    pathname === "/" ? APP_PATH_PREFIX : `${APP_PATH_PREFIX}${pathname}`;
  rewriteUrl.search = search;

  const rewriteResponse = NextResponse.rewrite(rewriteUrl);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;
    rewriteResponse.cookies.set(name, value, options);
  });
  return rewriteResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|webp|svg)).*)"],
};
