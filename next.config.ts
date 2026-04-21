import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist, which uses a dynamic import to load its
  // worker. Bundling either of these breaks that dynamic import and produces
  // errors like "Setting up fake worker failed". Leaving them external lets
  // Node load them normally at runtime.
  //
  // @napi-rs/canvas is a native addon we use to polyfill DOMMatrix/ImageData
  // for pdfjs-dist in the Node runtime; it must stay external so the .node
  // binary is loaded directly rather than bundled.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
