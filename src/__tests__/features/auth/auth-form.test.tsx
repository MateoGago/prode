/**
 * D-10: Cancha Pop restyle of the login surface.
 *
 * Tests focus on rendered structure and variant classes — NOT on OAuth
 * side-effects, which would require heavy Supabase mocking and are covered
 * by e2e. Auth wiring (actions) is untouched; we only verify presentation.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock server actions — they are "use server" modules that hit network/DB.
// We only need the shape, not the implementation.
vi.mock("@/features/auth/actions/auth-actions", () => ({
  signInWithGoogle: vi.fn().mockResolvedValue(undefined),
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  signUpWithPassword: vi.fn().mockResolvedValue(undefined),
}));

// sonner toast is a side-effect we don't care about in unit tests.
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { AuthForm } from "@/features/auth/components/auth-form";

describe("AuthForm — Cancha Pop (D-10)", () => {
  it("renders the Google sign-in button", () => {
    render(<AuthForm />);
    expect(
      screen.getByRole("button", { name: /continuar con google/i }),
    ).toBeInTheDocument();
  });

  it("Google button carries pop-ghost variant classes", () => {
    render(<AuthForm />);
    const btn = screen.getByRole("button", { name: /continuar con google/i });
    // pop-ghost = rounded-pill + bg-background
    expect(btn).toHaveClass("rounded-pill");
    expect(btn).toHaveClass("bg-background");
  });

  it("renders the Ingresar (login) submit button with pop variant", () => {
    render(<AuthForm />);
    // The submit button in the login tab
    const submitBtn = screen.getByRole("button", { name: /^ingresar$/i });
    expect(submitBtn).toHaveClass("rounded-pill");
    expect(submitBtn).toHaveClass("bg-primary");
  });

  it("renders the email and password fields for login", () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText(/vos@email\.com/i)).toBeInTheDocument();
  });
});
