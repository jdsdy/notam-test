export function splitHostAndPort(host: string) {
  const [hostname, ...rest] = host.split(":");
  return { hostname, port: rest.length > 0 ? rest.join(":") : "" };
}

function buildHost(hostname: string, port: string) {
  return port ? `${hostname}:${port}` : hostname;
}

export function isAppSubdomain(host: string): boolean {
  const { hostname } = splitHostAndPort(host.toLowerCase());
  return hostname === "app.localhost" || hostname.startsWith("app.");
}

/** Marketing → app entry URL for the current deployment (supports localhost + ports). */
export function buildAppRequestHostFromMarketingHost(host: string): string {
  const { hostname, port } = splitHostAndPort(host.toLowerCase());
  const appHostname =
    hostname === "localhost" ? "app.localhost" : `app.${hostname}`;
  return buildHost(appHostname, port);
}

export function buildAppEntryUrlFromHeaders(headerList: Headers): string {
  const host = headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.toLowerCase().includes("localhost") ? "http" : "https");
  return `${proto}://${buildAppRequestHostFromMarketingHost(host)}`;
}

/** App → marketing entry host for the current deployment. Strips the `app.` prefix. */
export function buildMarketingRequestHostFromAppHost(host: string): string {
  const { hostname, port } = splitHostAndPort(host.toLowerCase());
  const marketingHostname =
    hostname === "app.localhost"
      ? "localhost"
      : hostname.startsWith("app.")
        ? hostname.slice("app.".length)
        : hostname;
  return buildHost(marketingHostname, port);
}

export function buildMarketingEntryUrlFromHeaders(headerList: Headers): string {
  const host = headerList.get("host") ?? "app.localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.toLowerCase().includes("localhost") ? "http" : "https");
  return `${proto}://${buildMarketingRequestHostFromAppHost(host)}`;
}

