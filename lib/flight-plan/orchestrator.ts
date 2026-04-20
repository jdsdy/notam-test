import Anthropic, { toFile } from "@anthropic-ai/sdk";

import { runFlightDataExtractionAgent } from "@/lib/flight-plan/agents/flight-data-extraction";
import { runFlightRouteWeatherTableAgent } from "@/lib/flight-plan/agents/flight-route-weather-extraction";
import { runNotamExtractionOnTextChunks } from "@/lib/flight-plan/notam-text-split";
import {
  runPdfSplitterAgent,
  splitPdfBySplitterResult,
} from "@/lib/flight-plan/agents/pdf-splitter";
import { runSupervisorAgent } from "@/lib/flight-plan/agents/supervisor";
import { mergeFlightDataPartials } from "@/lib/flight-plan/merge-flight-data";
import { extractPdfText } from "@/lib/pdf-parse-server";
import {
  type FlightPlanExtraction,
  type NotamExtractionPartial,
  FLIGHT_DATA_CORE_FALLBACK,
  ROUTE_PARTIAL_WHEN_NO_TABLE_PDF,
} from "@/lib/flight-plan/schemas";

const FILES_API_BETA = "files-api-2025-04-14";

export type FlightPlanOrchestrationResult = {
  /** Complete extraction that conforms to the full output schema. */
  extraction: FlightPlanExtraction;
  /** Random UUID used as the canonical id for the original PDF filename (not an Anthropic file id). */
  pdfFileId: string;
};

/**
 * Orchestrates the multi-agent flight-plan extraction pipeline:
 *   1. Upload the original PDF to the Anthropic Files API.
 *   2. PDF splitter agent classifies pages (NOTAM groups, wind-map pages,
 *      flight-detail pages) and returns a SplitterResult.
 *   3. splitPdfBySplitterResult physically splits the PDF into NOTAM batch PDFs,
 *      an optional route/weather-table PDF, and flight-details PDFs.
 *   4. The flight-details and route-table PDFs are uploaded for the two flight
 *      extraction agents; results are merged in code.
 *   5. Every NOTAM batch PDF is converted to text via pdf-parse, then joined
 *      into one full NOTAM text block, split into chunks, and extracted in
 *      parallel; chunk outputs are merged in code before the supervisor runs.
 *   6. The supervisor agent merges flight-data and NOTAM partials into the
 *      final object.
 *   7. Every file id uploaded during the run is deleted from the Anthropic
 *      Files API in the finally block regardless of success or failure.
 */
export async function runFlightPlanExtractionPipeline(args: {
  anthropic: Anthropic;
  file: File;
}): Promise<FlightPlanOrchestrationResult> {
  const { anthropic, file } = args;

  const uploadedFileIds: string[] = [];

  const uploadPdfBytes = async (
    bytes: Uint8Array,
    label: string,
  ): Promise<string> => {
    const uploaded = await anthropic.beta.files.upload({
      file: await toFile(bytes, `${crypto.randomUUID()}-${label}.pdf`, {
        type: "application/pdf",
      }),
      betas: [FILES_API_BETA],
    });
    uploadedFileIds.push(uploaded.id);
    return uploaded.id;
  };

  try {
    const originalPdfBytes = new Uint8Array(await file.arrayBuffer());
    const planPdfUuid = crypto.randomUUID();
    const normalizedPdfFilename = `${planPdfUuid}.pdf`;

    const originalUploaded = await anthropic.beta.files.upload({
      file: await toFile(originalPdfBytes, normalizedPdfFilename, {
        type: file.type || "application/pdf",
      }),
      betas: [FILES_API_BETA],
    });
    uploadedFileIds.push(originalUploaded.id);
    const originalFileId = originalUploaded.id;

    const splitterResult = await runPdfSplitterAgent({
      anthropic,
      originalFileId,
      originalPdfBytes,
    });

    const { flightDetailsPdf, routeWeatherTablePdf, notamBatchPdfs } =
      await splitPdfBySplitterResult(originalPdfBytes, splitterResult);

    const notamTextChunks = await Promise.all(
      notamBatchPdfs.map((pdfBytes) => extractPdfText(pdfBytes)),
    );
    const notamText = notamTextChunks
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0)
      .join("\n\n");

    const routeTableFileId = routeWeatherTablePdf
      ? await uploadPdfBytes(routeWeatherTablePdf, "route-weather-table")
      : null;

    const flightDetailsFileId = flightDetailsPdf
      ? await uploadPdfBytes(flightDetailsPdf, "flight-details")
      : null;

    const notamExtractionPromise: Promise<NotamExtractionPartial> =
      notamText.length > 0
        ? runNotamExtractionOnTextChunks({ anthropic, notamText })
        : Promise.resolve({
            extracted_notams: { notams: [], unformatted_notams: [] },
            unidentified_fields: ["extracted_notams"],
          });

    const routePartialPromise = routeTableFileId
      ? runFlightRouteWeatherTableAgent({
          anthropic,
          routeTableFileId,
        })
      : Promise.resolve(ROUTE_PARTIAL_WHEN_NO_TABLE_PDF);

    const corePartialPromise = flightDetailsFileId
      ? runFlightDataExtractionAgent({
          anthropic,
          flightDataFileId: flightDetailsFileId,
        })
      : Promise.resolve(FLIGHT_DATA_CORE_FALLBACK);

    const [notamPartial, corePartial, routePartial] = await Promise.all([
      notamExtractionPromise,
      corePartialPromise,
      routePartialPromise,
    ]);

    const flightDataPartial = mergeFlightDataPartials(corePartial, routePartial);

    const extraction = await runSupervisorAgent({
      anthropic,
      notamPartial,
      flightDataPartial,
    });

    return { extraction, pdfFileId: planPdfUuid };
  } finally {
    if (uploadedFileIds.length > 0) {
      await Promise.allSettled(
        uploadedFileIds.map((fileId) =>
          anthropic.beta.files
            .delete(fileId, { betas: [FILES_API_BETA] })
            .catch(() => undefined),
        ),
      );
    }
  }
}
