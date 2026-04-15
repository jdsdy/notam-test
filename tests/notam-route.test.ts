import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/notams/process/route";
import { createSupabaseServerClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("POST /api/notams/process", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
    } as never);

    const request = new Request("http://localhost/api/notams/process", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns categorized dummy payload when a pdf is provided", async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: "user-1" } } }),
      },
    } as never);

    const formData = new FormData();
    formData.set(
      "file",
      new File(["dummy"], "briefing.pdf", { type: "application/pdf" }),
    );

    const request = new Request("http://localhost/api/notams/process", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.categories.map((item: { category: string }) => item.category)).toEqual([
      "Category 1",
      "Category 2",
      "Category 3",
    ]);
  });
});
