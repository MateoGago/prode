import { beforeEach, describe, expect, it, vi } from "vitest";

import { removeMember } from "@/features/groups/actions/remove-member";

// ── Supabase server mock ──────────────────────────────────────────────────────
// group_members.delete().eq("group_id").eq("user_id").select() — the trailing
// .select() returns the deleted rows so the action can tell a real removal
// (1 row) from an RLS-blocked / non-member no-op (0 rows → "forbidden").
const {
  mockGetUser,
  mockFrom,
  mockDeleteMembers,
  mockEqMembers1,
  mockEqMembers2,
  mockSelectMembers,
} = vi.hoisted(() => {
  const mockSelectMembers = vi.fn();
  const mockEqMembers2 = vi.fn().mockReturnValue({ select: mockSelectMembers });
  const mockEqMembers1 = vi.fn().mockReturnValue({ eq: mockEqMembers2 });
  const mockDeleteMembers = vi.fn().mockReturnValue({ eq: mockEqMembers1 });

  const mockFrom = vi.fn(() => ({ delete: mockDeleteMembers }));
  const mockGetUser = vi.fn();

  return {
    mockGetUser,
    mockFrom,
    mockDeleteMembers,
    mockEqMembers1,
    mockEqMembers2,
    mockSelectMembers,
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

const OWNER_ID = "owner-abc";
const TARGET_ID = "member-xyz";
const GROUP_ID = "group-123";

describe("removeMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
    mockSelectMembers.mockResolvedValue({
      data: [{ id: "membership-1" }],
      error: null,
    });
    mockEqMembers2.mockReturnValue({ select: mockSelectMembers });
    mockEqMembers1.mockReturnValue({ eq: mockEqMembers2 });
    mockDeleteMembers.mockReturnValue({ eq: mockEqMembers1 });
    mockFrom.mockImplementation(() => ({ delete: mockDeleteMembers }));
  });

  it("deletes the target member's row in the group", async () => {
    const result = await removeMember(GROUP_ID, TARGET_ID);

    expect(result).toEqual({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith("group_members");
    expect(mockEqMembers1).toHaveBeenCalledWith("group_id", GROUP_ID);
    expect(mockEqMembers2).toHaveBeenCalledWith("user_id", TARGET_ID);
  });

  it("returns { ok: false, reason: 'unauthenticated' } when no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await removeMember(GROUP_ID, TARGET_ID);

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("refuses to let the owner remove themselves", async () => {
    const result = await removeMember(GROUP_ID, OWNER_ID);

    expect(result).toEqual({ ok: false, reason: "cannot_remove_self" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 'forbidden' when nothing was deleted (RLS blocked a non-owner)", async () => {
    // A non-owner caller: the RLS DELETE policy matches no row, so .select()
    // returns an empty array with no error — the action must NOT report success.
    mockSelectMembers.mockResolvedValueOnce({ data: [], error: null });

    const result = await removeMember(GROUP_ID, TARGET_ID);

    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("throws on unexpected DB error during delete", async () => {
    mockSelectMembers.mockResolvedValueOnce({
      error: { code: "23503", message: "fk violation" },
    });

    await expect(removeMember(GROUP_ID, TARGET_ID)).rejects.toThrow(
      "fk violation",
    );
  });
});
