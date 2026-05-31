import { beforeEach, describe, expect, it, vi } from "vitest";

import { joinGroup } from "@/features/groups/actions/join-group";

// ── Supabase server mock ──────────────────────────────────────────────────────
// groups.select().eq().maybeSingle() chain for code lookup
// group_members.upsert() for idempotent membership insert
const {
  mockGetUser,
  mockFrom,
  mockSelectGroups,
  mockEqGroups,
  mockMaybeSingleGroups,
  mockUpsertMembers,
} = vi.hoisted(() => {
  const mockMaybeSingleGroups = vi.fn();
  const mockEqGroups = vi
    .fn()
    .mockReturnValue({ maybeSingle: mockMaybeSingleGroups });
  const mockSelectGroups = vi.fn().mockReturnValue({ eq: mockEqGroups });

  const mockUpsertMembers = vi.fn();

  const mockFrom = vi.fn((table: string) => {
    if (table === "groups") return { select: mockSelectGroups };
    return { upsert: mockUpsertMembers };
  });

  const mockGetUser = vi.fn();

  return {
    mockGetUser,
    mockFrom,
    mockSelectGroups,
    mockEqGroups,
    mockMaybeSingleGroups,
    mockUpsertMembers,
  };
});

vi.mock("@/shared/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";
const GROUP_ID = "group-xyz";
const CODE = "ABCD1234";

describe("joinGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
    });
    mockMaybeSingleGroups.mockResolvedValue({
      data: { id: GROUP_ID, invite_code: CODE },
      error: null,
    });
    mockEqGroups.mockReturnValue({ maybeSingle: mockMaybeSingleGroups });
    mockSelectGroups.mockReturnValue({ eq: mockEqGroups });
    mockFrom.mockImplementation((table: string) => {
      if (table === "groups") return { select: mockSelectGroups };
      return { upsert: mockUpsertMembers };
    });
    mockUpsertMembers.mockResolvedValue({ error: null });
  });

  it("returns { ok: false, reason: 'unauthenticated' } when no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await joinGroup(CODE);

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'invalid_code' } for unknown code", async () => {
    mockMaybeSingleGroups.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await joinGroup("ZZZZZZZZ");

    expect(result).toEqual({ ok: false, reason: "invalid_code" });
    expect(mockUpsertMembers).not.toHaveBeenCalled();
  });

  it("upserts membership row on valid code", async () => {
    const result = await joinGroup(CODE);

    expect(result).toMatchObject({ ok: true, code: CODE });
    expect(mockFrom).toHaveBeenCalledWith("group_members");
    expect(mockUpsertMembers).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: GROUP_ID,
        user_id: USER_ID,
      }),
      expect.objectContaining({ onConflict: "group_id,user_id" }),
    );
  });

  it("is idempotent — succeeds silently when already a member (upsert ignoreDuplicates)", async () => {
    // upsert with ignoreDuplicates: DB returns no error and no rows — still success
    mockUpsertMembers.mockResolvedValueOnce({ error: null });

    const result = await joinGroup(CODE);

    expect(result).toMatchObject({ ok: true, code: CODE });
  });

  it("is idempotent — 23505 unique-violation returns success, not a throw (REQ-02)", async () => {
    // Simulates the real Postgres 23505 error that plain .insert() would surface.
    // The action MUST treat this as a silent no-op and return ok: true.
    mockUpsertMembers.mockResolvedValueOnce({
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });

    const result = await joinGroup(CODE);

    expect(result).toMatchObject({ ok: true, code: CODE });
  });

  it("queries groups by invite_code", async () => {
    await joinGroup(CODE);

    expect(mockFrom).toHaveBeenCalledWith("groups");
    expect(mockSelectGroups).toHaveBeenCalledWith("id, invite_code");
    expect(mockEqGroups).toHaveBeenCalledWith("invite_code", CODE);
  });

  it("throws on unexpected DB error during membership upsert", async () => {
    mockUpsertMembers.mockResolvedValueOnce({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(joinGroup(CODE)).rejects.toThrow("permission denied");
  });
});
