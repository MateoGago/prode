import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  signInWithPassword,
  signUpWithPassword,
} from "@/features/auth/actions/auth-actions";

// ── Supabase server mock ──────────────────────────────────────────────────────
const { mockSignUp, mockSignInWithPassword } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
}));

vi.mock("@/shared/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi
    .fn()
    .mockResolvedValue(new Map([["origin", "https://prode.app"]])),
}));

// ─────────────────────────────────────────────────────────────────────────────

const SIGNUP_INPUT = {
  displayName: "Santi",
  email: "santi@example.com",
  password: "12345678",
};

describe("auth-actions — result channel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signup with email-confirmation pending returns an INFO state, not an error", async () => {
    // Confirm-email enabled → signUp succeeds but returns no session yet.
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });

    const result = await signUpWithPassword(SIGNUP_INPUT);

    // The "check your inbox" message is informational — it must travel on the
    // info channel so the form renders a blue info toast, not a red error toast.
    expect(result).toEqual({
      status: "info",
      message: "Te enviamos un email para confirmar tu cuenta.",
    });
  });

  it("signup with a real auth failure returns an ERROR state", async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null },
      error: { message: "User already registered" },
    });

    const result = await signUpWithPassword(SIGNUP_INPUT);

    expect(result).toEqual({
      status: "error",
      message: "Ese email ya tiene una cuenta. Probá ingresar.",
    });
  });

  it("signup routes the email-confirmation link back through /auth/callback with next", async () => {
    // With confirm-email on, the magic link must land on /auth/callback (to
    // exchange the PKCE code) carrying ?next so the user returns to their invite.
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });

    await signUpWithPassword(SIGNUP_INPUT, "/join/R1EDZ34V");

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo:
            "https://prode.app/auth/callback?next=%2Fjoin%2FR1EDZ34V",
        }),
      }),
    );
  });

  it("signup without a next still sets emailRedirectTo to the bare callback", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });

    await signUpWithPassword(SIGNUP_INPUT);

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: "https://prode.app/auth/callback",
        }),
      }),
    );
  });

  it("login with bad credentials returns an ERROR state", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const result = await signInWithPassword({
      email: "santi@example.com",
      password: "nope",
    });

    expect(result).toEqual({
      status: "error",
      message: "Email o contraseña incorrectos.",
    });
  });
});
