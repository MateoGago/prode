import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGroup } from "@/features/groups/actions/create-group";

// ── Supabase server mock ──────────────────────────────────────────────────────
// createGroup now delegates to the atomic create_group(p_name, p_invite_code)
// SECURITY DEFINER RPC, which inserts the group + auto-enrolls the owner in one
// transaction. The action only sees { data, error } from supabase.rpc(...).
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
const GROUP_ID = "group-xyz";
const INVITE_CODE_RE = /^[0-9A-HJKMNP-TV-Z]{8}$/;

describe("createGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    // Default success: RPC returns the new group id.
    mockRpc.mockResolvedValue({ data: GROUP_ID, error: null });
  });

  it("returns { ok: false, reason: 'empty_name' } for empty name", async () => {
    const result = await createGroup("   ");

    expect(result).toEqual({ ok: false, reason: "empty_name" });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'unauthenticated' } when no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await createGroup("Mi grupo");

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls create_group RPC with trimmed name and a generated invite_code", async () => {
    const result = await createGroup("  Mi grupo  ");

    expect(result).toMatchObject({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith("create_group", {
      p_name: "Mi grupo",
      p_invite_code: expect.stringMatching(INVITE_CODE_RE),
    });
  });

  it("returns { ok: true, code } with valid invite code on success", async () => {
    const result = await createGroup("Los cracks");

    expect(result).toMatchObject({
      ok: true,
      code: expect.stringMatching(INVITE_CODE_RE),
    });
  });

  it("retries invite_code on unique-constraint collision (max 3)", async () => {
    const uniqueError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    mockRpc
      .mockResolvedValueOnce({ data: null, error: uniqueError })
      .mockResolvedValueOnce({ data: null, error: uniqueError })
      .mockResolvedValueOnce({ data: GROUP_ID, error: null });

    const result = await createGroup("Los cracks");

    expect(result).toMatchObject({ ok: true });
    expect(mockRpc).toHaveBeenCalledTimes(3);
  });

  it("returns { ok: false, reason: 'code_collision' } after 3 retries", async () => {
    const uniqueError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    mockRpc.mockResolvedValue({ data: null, error: uniqueError });

    const result = await createGroup("Los cracks");

    expect(result).toEqual({ ok: false, reason: "code_collision" });
    expect(mockRpc).toHaveBeenCalledTimes(3);
  });

  it("throws on unexpected DB error from the RPC", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "ZZZZZ", message: "Unexpected DB error" },
    });

    await expect(createGroup("Mi grupo")).rejects.toThrow(
      "Unexpected DB error",
    );
  });
});
