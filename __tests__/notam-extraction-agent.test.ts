import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { runNotamExtractionAgent } from "@/lib/flight-plan/agents/notam-extraction";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("runNotamExtractionAgent", () => {
  it("waits for the streamed final response before returning", async () => {
    const expected = {
      extracted_notams: {
        notams: [
          {
            id: "A1/26",
            title: "RWY CLSD",
            q: "Q) TEST",
            a: "YSSY",
            b: "2601010000",
            c: "2601012359",
            d: "null",
            e: "Runway closed",
            f: "null",
            g: "null",
            null_values: ["d", "f", "g"],
          },
        ],
        unformatted_notams: [],
      },
      unidentified_fields: [],
    };

    const deferred = createDeferred<{
      content: Array<{ type: "text"; text: string }>;
    }>();
    const finalMessage = vi.fn().mockImplementation(() => deferred.promise);
    const stream = vi.fn().mockReturnValue({ finalMessage });
    const anthropic = {
      beta: {
        messages: {
          stream,
        },
      },
    } as unknown as Anthropic;

    let settled = false;
    const resultPromise = runNotamExtractionAgent({
      anthropic,
      notamText: "A1/26 RWY CLSD ...",
    }).finally(() => {
      settled = true;
    });

    await Promise.resolve();

    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "text",
                text: expect.stringContaining("A1/26 RWY CLSD"),
              }),
            ]),
          }),
        ],
      }),
    );
    expect(finalMessage).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    deferred.resolve({
      content: [{ type: "text", text: JSON.stringify(expected) }],
    });

    await expect(resultPromise).resolves.toEqual(expected);
    expect(settled).toBe(true);
  });
});
