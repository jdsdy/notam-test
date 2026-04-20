import Anthropic, { toFile } from "@anthropic-ai/sdk";

import { runFlightDataExtractionAgent } from "@/lib/flight-plan/agents/flight-data-extraction";
import { runNotamExtractionOnTextChunks } from "@/lib/flight-plan/notam-text-split";
import {
  runPdfSplitterAgent,
  splitPdfBySplitterResult,
} from "@/lib/flight-plan/agents/pdf-splitter";
import { runSupervisorAgent } from "@/lib/flight-plan/agents/supervisor";
import { extractPdfText } from "@/lib/pdf-parse-server";
import type {
  FlightDataExtractionPartial,
  FlightPlanExtraction,
  NotamExtractionPartial,
} from "@/lib/flight-plan/schemas";

const FILES_API_BETA = "files-api-2025-04-14";

const FLIGHT_DATA_FALLBACK_PARTIAL: FlightDataExtractionPartial = {
  departure_icao: null,
  arrival_icao: null,
  departure_time: null,
  arrival_time: null,
  time_enroute: null,
  departure_rwy: null,
  arrival_rwy: null,
  route: null,
  aircraft_weight: null,
  flight_plan_json: { primary: [], alternate: [] },
  flight_metadata: null,
  unidentified_fields: [
    "departure_icao",
    "arrival_icao",
    "departure_time",
    "arrival_time",
    "time_enroute",
    "departure_rwy",
    "arrival_rwy",
    "route",
    "aircraft_weight",
    "flight_plan_json",
  ],
};

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
 *   3. splitPdfBySplitterResult physically splits the PDF into one PDF per
 *      NOTAM group plus a single flight-details PDF.
 *   4. The flight-details PDF is uploaded to the Files API for the
 *      flight-data extraction agent.
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

    const { flightDetailsPdf, notamBatchPdfs } =
      await splitPdfBySplitterResult(originalPdfBytes, splitterResult);

    const notamTextChunks = await Promise.all(
      notamBatchPdfs.map((pdfBytes) => extractPdfText(pdfBytes)),
    );
    const notamText = notamTextChunks
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0)
      .join("\n\n");

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

    const flightDataExtractionPromise: Promise<FlightDataExtractionPartial> =
      flightDetailsFileId
        ? runFlightDataExtractionAgent({
            anthropic,
            flightDataFileId: flightDetailsFileId,
          })
        : Promise.resolve(FLIGHT_DATA_FALLBACK_PARTIAL);

    const [notamPartial, flightDataPartial] = await Promise.all([
      notamExtractionPromise,
      flightDataExtractionPromise,
    ]);

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
