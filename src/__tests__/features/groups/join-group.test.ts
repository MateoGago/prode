import { beforeEach, describe, expect, it, vi } from "vitest";

import { joinGroup } from "@/features/groups/actions/join-group";

// ── Supabase server mock ──────────────────────────────────────────────────────
// joinGroup now delegates the group lookup + membership insert to the
// SECURITY DEFINER `join_group(p_code)` RPC, which bypasses the membership-gated
// groups SELECT policy. The RPC returns the invite_code on success, NULL for an
// unknown code. So we mock `rpc`, not the table chain.
const { mockGetUser, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@/shared/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";
const CODE = "ABCD1234";

describe("joinGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockRpc.mockResolvedValue({ data: CODE, error: null });
  });

  it("returns { ok: false, reason: 'unauthenticated' } when no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await joinGroup(CODE);

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'invalid_code' } when the RPC resolves to null", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await joinGroup("ZZZZZZZZ");

    expect(result).toEqual({ ok: false, reason: "invalid_code" });
  });

  it("calls join_group RPC with the invite code and returns ok on success", async () => {
    const result = await joinGroup(CODE);

    expect(mockRpc).toHaveBeenCalledWith("join_group", { p_code: CODE });
    expect(result).toMatchObject({ ok: true, code: CODE });
  });

  it("is idempotent — already-a-member still resolves to the code (RPC ON CONFLICT)", async () => {
    // The DB function inserts ON CONFLICT DO NOTHING and still RETURNs the code,
    // so re-joining surfaces to the action as a plain success.
    mockRpc.mockResolvedValueOnce({ data: CODE, error: null });

    const result = await joinGroup(CODE);

    expect(result).toMatchObject({ ok: true, code: CODE });
  });

  it("throws on an unexpected RPC error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });

    await expect(joinGroup(CODE)).rejects.toThrow("permission denied");
  });
});
