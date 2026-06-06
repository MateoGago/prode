import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { updateSession } from "@/shared/supabase/proxy-session";

// ── Supabase SSR mock ─────────────────────────────────────────────────────────
// Only getUser() is exercised here — the cookie setAll path is driven by token
// refresh, which the mocked client never triggers.
const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/shared/supabase/env", () => ({
  supabaseEnv: () => ({ url: "https://x.supabase.co", publishableKey: "pk" }),
}));

// ─────────────────────────────────────────────────────────────────────────────

function request(path: string) {
  return new NextRequest(`https://prode.app${path}`);
}

describe("updateSession — auth bounce preserves the requested destination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects an unauthenticated visitor to /login carrying ?next= the path", async () => {
    // An invite link is a protected path: the proxy must hand the destination to
    // /login so the user lands back on /join/<code> after auth — not on /.
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(request("/join/R1EDZ34V"));

    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/join/R1EDZ34V");
  });

  it("preserves the destination query string in ?next=", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(request("/g/ABCD/leaderboard?tab=fixture"));

    const location = new URL(res.headers.get("location") ?? "");
    expect(location.searchParams.get("next")).toBe(
      "/g/ABCD/leaderboard?tab=fixture",
    );
  });

  it("does not bounce an unauthenticated visitor already on a public path", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await updateSession(request("/login?next=%2Fjoin%2FABCD"));

    expect(res.headers.get("location")).toBeNull();
  });

  it("does not redirect an authenticated visitor", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const res = await updateSession(request("/join/R1EDZ34V"));

    expect(res.headers.get("location")).toBeNull();
  });
});
