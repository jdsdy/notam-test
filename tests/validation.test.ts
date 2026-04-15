import { describe, expect, it } from "vitest";

import { authSignUpSchema } from "@/lib/validation/auth";
import { aircraftInputSchema } from "@/lib/validation/aircraft";

describe("input validation", () => {
  it("requires a strong password for sign-up", () => {
    const result = authSignUpSchema.safeParse({
      name: "Pilot User",
      email: "pilot@example.com",
      password: "123",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid aircraft payload", () => {
    const result = aircraftInputSchema.safeParse({
      organisationId: "f91d4c15-7e53-4f57-ac09-34cdfd497984",
      tailNumber: "N700GX",
      manufacturer: "Gulfstream",
      type: "G700",
      seats: "14",
    });

    expect(result.success).toBe(true);
  });
});
