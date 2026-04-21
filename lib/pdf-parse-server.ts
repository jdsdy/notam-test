// pdf-parse → pdfjs-dist@5 needs browser globals (DOMMatrix, ImageData, Path2D)
// at module evaluation time. In Node, pdfjs-dist tries to polyfill them via a
// dynamic `require("@napi-rs/canvas")` wrapped in try/catch. On Vercel's build
// tracer, that dynamic require is not always detected, so the native canvas
// binary gets omitted from the deployed function bundle and the polyfill
// silently fails — later causing `ReferenceError: DOMMatrix is not defined`.
//
// We do the polyfill ourselves with a *static* import so Next's file tracer
// always ships `@napi-rs/canvas`, and we install it before `pdf-parse` is
// evaluated via a deferred dynamic import.
import { DOMMatrix, DOMPoint, ImageData, Path2D } from "@napi-rs/canvas";

// The @napi-rs/canvas DOM shims aren't structurally identical to lib.dom's
// DOMMatrix/ImageData/Path2D typings (some methods differ), but pdfjs-dist
// only relies on the common subset. Assign through a loosely-typed view of
// globalThis so we don't leak those mismatches into callers' type-checks.
const g = globalThis as unknown as Record<string, unknown>;

if (typeof g.DOMMatrix === "undefined") g.DOMMatrix = DOMMatrix;
if (typeof g.DOMPoint === "undefined") g.DOMPoint = DOMPoint;
if (typeof g.ImageData === "undefined") g.ImageData = ImageData;
if (typeof g.Path2D === "undefined") g.Path2D = Path2D;

const pdfParseModulePromise = import("pdf-parse");

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const { PDFParse } = await pdfParseModulePromise;
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
