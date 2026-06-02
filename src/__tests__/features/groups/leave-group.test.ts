import { beforeEach, describe, expect, it, vi } from "vitest";

import { leaveGroup } from "@/features/groups/actions/leave-group";

// ── Supabase server mock ──────────────────────────────────────────────────────
// groups.select().eq().maybeSingle() chain resolves the code → { id, owner_id }.
// group_members.delete().eq().eq() removes the caller's own membership row.
const {
  mockGetUser,
  mockFrom,
  mockSelectGroups,
  mockEqGroups,
  mockMaybeSingleGroups,
  mockDeleteMembers,
  mockEqMembers1,
  mockEqMembers2,
} = vi.hoisted(() => {
  const mockMaybeSingleGroups = vi.fn();
  const mockEqGroups = vi
    .fn()
    .mockReturnValue({ maybeSingle: mockMaybeSingleGroups });
  const mockSelectGroups = vi.fn().mockReturnValue({ eq: mockEqGroups });

  // delete().eq("group_id").eq("user_id") — second .eq() resolves to { error }.
  const mockEqMembers2 = vi.fn();
  const mockEqMembers1 = vi.fn().mockReturnValue({ eq: mockEqMembers2 });
  const mockDeleteMembers = vi.fn().mockReturnValue({ eq: mockEqMembers1 });

  const mockFrom = vi.fn((table: string) => {
    if (table === "groups") return { select: mockSelectGroups };
    return { delete: mockDeleteMembers };
  });

  const mockGetUser = vi.fn();

  return {
    mockGetUser,
    mockFrom,
    mockSelectGroups,
    mockEqGroups,
    mockMaybeSingleGroups,
    mockDeleteMembers,
    mockEqMembers1,
    mockEqMembers2,
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
const OWNER_ID = "owner-xyz";
const GROUP_ID = "group-xyz";
const CODE = "ABCD1234";

describe("leaveGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockMaybeSingleGroups.mockResolvedValue({
      data: { id: GROUP_ID, owner_id: OWNER_ID },
      error: null,
    });
    mockEqGroups.mockReturnValue({ maybeSingle: mockMaybeSingleGroups });
    mockSelectGroups.mockReturnValue({ eq: mockEqGroups });
    mockEqMembers1.mockReturnValue({ eq: mockEqMembers2 });
    mockEqMembers2.mockResolvedValue({ error: null });
    mockDeleteMembers.mockReturnValue({ eq: mockEqMembers1 });
    mockFrom.mockImplementation((table: string) => {
      if (table === "groups") return { select: mockSelectGroups };
      return { delete: mockDeleteMembers };
    });
  });

  it("deletes the caller's own membership row for a valid code", async () => {
    const result = await leaveGroup(CODE);

    expect(result).toEqual({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith("group_members");
    expect(mockEqMembers1).toHaveBeenCalledWith("group_id", GROUP_ID);
    expect(mockEqMembers2).toHaveBeenCalledWith("user_id", USER_ID);
  });

  it("returns { ok: false, reason: 'unauthenticated' } when no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await leaveGroup(CODE);

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'invalid_code' } for unknown code", async () => {
    mockMaybeSingleGroups.mockResolvedValueOnce({ data: null, error: null });

    const result = await leaveGroup("ZZZZZZZZ");

    expect(result).toEqual({ ok: false, reason: "invalid_code" });
    expect(mockDeleteMembers).not.toHaveBeenCalled();
  });

  it("forbids the owner from leaving their own group", async () => {
    // Owner's own id matches the group owner_id — leaving would orphan the group.
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: OWNER_ID } } });

    const result = await leaveGroup(CODE);

    expect(result).toEqual({ ok: false, reason: "owner_cannot_leave" });
    expect(mockDeleteMembers).not.toHaveBeenCalled();
  });

  it("throws on unexpected DB error during delete", async () => {
    mockEqMembers2.mockResolvedValueOnce({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(leaveGroup(CODE)).rejects.toThrow("permission denied");
  });
});
