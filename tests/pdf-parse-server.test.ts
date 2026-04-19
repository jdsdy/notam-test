import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parserCtor: vi.fn(),
  parserGetText: vi.fn(),
  parserDestroy: vi.fn(),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: mocks.parserCtor,
}));

describe("extractPdfText", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mocks.parserGetText.mockResolvedValue({ text: "NOTAM TEXT FROM PDF" });
    mocks.parserDestroy.mockResolvedValue(undefined);
    mocks.parserCtor.mockImplementation(() => ({
      getText: mocks.parserGetText,
      destroy: mocks.parserDestroy,
    }));
  });

  it("uses pdf-parse directly to extract text from the buffer", async () => {
    const { extractPdfText } = await import("../lib/pdf-parse-server");

    await expect(extractPdfText(new Uint8Array([1, 2, 3]))).resolves.toBe(
      "NOTAM TEXT FROM PDF",
    );

    expect(mocks.parserCtor).toHaveBeenCalledWith({
      data: expect.any(Uint8Array),
    });
    expect(mocks.parserGetText).toHaveBeenCalledTimes(1);
    expect(mocks.parserDestroy).toHaveBeenCalledTimes(1);
  });

  it("destroys the parser even when getText throws", async () => {
    mocks.parserGetText.mockRejectedValueOnce(new Error("boom"));

    const { extractPdfText } = await import("../lib/pdf-parse-server");

    await expect(extractPdfText(new Uint8Array([1]))).rejects.toThrow("boom");
    expect(mocks.parserDestroy).toHaveBeenCalledTimes(1);
  });
});
