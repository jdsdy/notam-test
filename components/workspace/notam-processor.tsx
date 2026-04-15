"use client";

import { FormEvent, useMemo, useState } from "react";

import type { ProcessedNotamResponse } from "@/lib/notams/dummy";

const categoryStyleMap: Record<string, string> = {
  "Category 1": "border-slate-700 bg-slate-900/60",
  "Category 2": "border-amber-600/40 bg-amber-950/20",
  "Category 3": "border-rose-600/50 bg-rose-950/25",
};

export function NotamProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ProcessedNotamResponse | null>(null);

  const totalNotams = useMemo(
    () => response?.categories.reduce((count, category) => count + category.items.length, 0) ?? 0,
    [response],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError("Attach a PDF file before processing.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await fetch("/api/notams/process", {
        method: "POST",
        body: formData,
      });

      if (!result.ok) {
        throw new Error("NOTAM processing request failed.");
      }

      const payload = (await result.json()) as ProcessedNotamResponse;
      setResponse(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unexpected processing error.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-5"
      >
        <h2 className="text-lg font-semibold text-slate-50">
          Upload NOTAM briefing
        </h2>
        <p className="text-sm text-slate-300">
          Upload one PDF briefing file. The API returns a categorized summary
          payload for the MVP.
        </p>

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            PDF File
          </span>
          <input
            required
            type="file"
            accept="application/pdf"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-200"
        >
          {loading ? "Processing..." : "Process NOTAMs"}
        </button>
      </form>

      {response ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
              Processing Complete
            </p>
            <p className="mt-2 text-sm text-slate-200">
              {totalNotams} NOTAM items classified across{" "}
              {response.categories.length} categories.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Timestamp: {new Date(response.processedAt).toLocaleString()}
            </p>
          </div>

          {response.categories.map((category) => (
            <article
              key={category.category}
              className={`rounded-lg border p-4 ${categoryStyleMap[category.category] ?? "border-slate-700 bg-slate-900/60"}`}
            >
              <h3 className="text-base font-semibold text-slate-50">
                {category.category}
              </h3>
              <p className="mt-1 text-sm text-slate-300">{category.description}</p>
              <div className="mt-3 space-y-2">
                {category.items.map((notam) => (
                  <details
                    key={notam.id}
                    className="rounded-md border border-slate-700 bg-slate-950/70 p-3"
                  >
                    <summary className="cursor-pointer list-none">
                      <p className="text-sm font-semibold text-slate-100">
                        {notam.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {notam.summary}
                      </p>
                    </summary>

                    <div className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-sm text-slate-300">
                      <p>
                        <span className="font-semibold text-slate-100">
                          Impact:
                        </span>{" "}
                        {notam.detail.operationalImpact}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-100">
                          Recommendation:
                        </span>{" "}
                        {notam.detail.recommendation}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-100">
                          Effective window:
                        </span>{" "}
                        {notam.detail.effectiveWindow}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
