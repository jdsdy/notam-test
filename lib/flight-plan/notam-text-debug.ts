import Anthropic, { toFile } from "@anthropic-ai/sdk";

import {
  runPdfSplitterAgent,
  splitPdfBySplitterResult,
} from "@/lib/flight-plan/agents/pdf-splitter";
import { extractPdfText } from "@/lib/pdf-parse-server";

const FILES_API_BETA = "files-api-2025-04-14";

function mergeAllNotamPages(
  splitterResult: Awaited<ReturnType<typeof runPdfSplitterAgent>>,
) {
  const pages = Array.from(
    new Set(splitterResult.notamGroups.flatMap((group) => group.pages)),
  ).sort((a, b) => a - b);

  if (pages.length === 0) {
    return {
      ...splitterResult,
      notamGroups: [],
    };
  }

  const firstGroup = splitterResult.notamGroups[0];
  const lastGroup = splitterResult.notamGroups.at(-1);

  return {
    ...splitterResult,
    notamGroups: [
      {
        pages,
        notamCount: splitterResult.notamGroups.reduce(
          (total, group) => total + group.notamCount,
          0,
        ),
        startId: firstGroup?.startId ?? "",
        endId: lastGroup?.endId ?? "",
      },
    ],
  };
}

export async function runNotamPdfParseDebug(args: {
  anthropic: Anthropic;
  file: File;
}): Promise<{ notamText: string }> {
  const { anthropic, file } = args;

  const uploadedFileIds: string[] = [];

  try {
    const originalPdfBytes = new Uint8Array(await file.arrayBuffer());
    const normalizedPdfFilename = `${crypto.randomUUID()}.pdf`;

    const uploaded = await anthropic.beta.files.upload({
      file: await toFile(file, normalizedPdfFilename, {
        type: file.type || "application/pdf",
      }),
      betas: [FILES_API_BETA],
    });
    uploadedFileIds.push(uploaded.id);

    const splitterResult = await runPdfSplitterAgent({
      anthropic,
      originalFileId: uploaded.id,
      originalPdfBytes,
    });

    const mergedNotamResult = mergeAllNotamPages(splitterResult);
    const { notamBatchPdfs } = await splitPdfBySplitterResult(
      originalPdfBytes,
      mergedNotamResult,
    );

    const notamPdf = notamBatchPdfs[0] ?? null;
    if (!notamPdf) {
      console.log("Parsed NOTAM PDF text:", "");
      return { notamText: "" };
    }

    const text = await extractPdfText(notamPdf);
    console.log("Parsed NOTAM PDF text:", text);
    return { notamText: text };
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
