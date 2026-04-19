import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist, which uses a dynamic import to load its
  // worker. Bundling either of these breaks that dynamic import and produces
  // errors like "Setting up fake worker failed". Leaving them external lets
  // Node load them normally at runtime.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
