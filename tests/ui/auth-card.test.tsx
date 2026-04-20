// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import AuthCard from "@/components/auth/auth-card";

vi.mock("@/app/actions/auth", () => ({
  signInWithPassword: vi.fn(async () => ({ ok: true })),
  signUpWithPassword: vi.fn(async () => ({ ok: true })),
}));

describe("AuthCard", () => {
  it("shows an invite-only message instead of a sign-up form", () => {
    render(<AuthCard />);

    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));

    expect(
      screen.getByText(
        "Account creation is currently not possible as JetOps is in a private invite-only testing phase. If you should have access, please contact your JetOps representative",
      ),
    ).toBeInTheDocument();

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
});

