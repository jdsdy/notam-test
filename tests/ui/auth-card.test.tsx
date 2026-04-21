// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import AuthCard from "@/components/auth/auth-card";

const signUpWithPasswordMock = vi.fn(async () => ({ ok: true }));
vi.mock("@/app/actions/auth", () => ({
  signInWithPassword: vi.fn(async () => ({ ok: true })),
  signUpWithPassword: (...args: any[]) => signUpWithPasswordMock(...args),
}));

describe("AuthCard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("shows the sign-up form when switching modes", () => {
    render(<AuthCard />);

    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Beta Access Key")).toBeInTheDocument();
  });

  it("requires a matching beta access key before calling sign-up", async () => {
    vi.stubEnv("NEXT_PUBLIC_BETA_ACCESS_KEY", "letmein");
    signUpWithPasswordMock.mockClear();

    render(<AuthCard />);
    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Beta Access Key"), { target: { value: "wrong" } });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Invalid Beta Access Key.")).toBeInTheDocument();
    expect(signUpWithPasswordMock).not.toHaveBeenCalled();
  });
});

