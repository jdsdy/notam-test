import { type NextRequest, NextResponse } from "next/server";

import {
  buildAppRequestHostFromMarketingHost,
  isAppSubdomain,
} from "@/lib/hosts";

const ORIGINAL_PATH_HEADER = "x-original-pathname";

function shouldSkipProxy(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  if (
    /\.(?:ico|png|jpg|jpeg|gif|webp|svg|avif|css|js|map|txt|xml|json|woff2?|ttf|otf)$/i.test(
      pathname,
    )
  ) {
    return true;
  }
  return false;
}

function normalizeBrowserPath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isNamespacedAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  if (shouldSkipProxy(pathname)) {
    return NextResponse.next();
  }

  const onAppHost = isAppSubdomain(host);

  if (!onAppHost && isNamespacedAppPath(pathname)) {
    const target = new URL(request.url);
    target.host = buildAppRequestHostFromMarketingHost(host);
    const suffix =
      pathname === "/app"
        ? "/"
        : pathname.startsWith("/app/")
          ? pathname.slice("/app".length) || "/"
          : "/";
    target.pathname = suffix.startsWith("/") ? suffix : `/${suffix}`;
    return NextResponse.redirect(target);
  }

  if (!onAppHost) {
    return NextResponse.next();
  }

  if (isNamespacedAppPath(pathname)) {
    const syntheticOriginal =
      pathname === "/app" ? "/" : pathname.slice("/app".length) || "/";
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(
      ORIGINAL_PATH_HEADER,
      normalizeBrowserPath(syntheticOriginal),
    );
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const destinationPath =
    pathname === "/" || pathname === "" ? "/app" : `/app${pathname}`;

  const url = request.nextUrl.clone();
  url.pathname = destinationPath;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ORIGINAL_PATH_HEADER, normalizeBrowserPath(pathname));

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
