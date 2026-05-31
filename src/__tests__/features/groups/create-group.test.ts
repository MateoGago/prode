import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGroup } from "@/features/groups/actions/create-group";

// ── Supabase server mock ──────────────────────────────────────────────────────
// groups.insert().select("id").single() chain
const {
  mockGetUser,
  mockFrom,
  mockInsertGroupsSingle,
  mockInsertGroupsSelect,
  mockInsertGroups,
  mockInsertMembers,
} = vi.hoisted(() => {
  const mockInsertGroupsSingle = vi.fn();
  const mockInsertGroupsSelect = vi
    .fn()
    .mockReturnValue({ single: mockInsertGroupsSingle });
  const mockInsertGroups = vi
    .fn()
    .mockReturnValue({ select: mockInsertGroupsSelect });

  const mockInsertMembers = vi.fn();
  const mockFrom = vi.fn((table: string) => {
    if (table === "groups") {
      return { insert: mockInsertGroups };
    }
    return { insert: mockInsertMembers };
  });
  const mockGetUser = vi.fn();
  return {
    mockGetUser,
    mockFrom,
    mockInsertGroupsSingle,
    mockInsertGroupsSelect,
    mockInsertGroups,
    mockInsertMembers,
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

describe("createGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
    });
    // Default success: group insert returns id
    mockInsertGroupsSingle.mockResolvedValue({
      data: { id: GROUP_ID },
      error: null,
    });
    // Re-wire chain after clearAllMocks
    mockInsertGroupsSelect.mockReturnValue({ single: mockInsertGroupsSingle });
    mockInsertGroups.mockReturnValue({ select: mockInsertGroupsSelect });
    mockFrom.mockImplementation((table: string) => {
      if (table === "groups") return { insert: mockInsertGroups };
      return { insert: mockInsertMembers };
    });
    mockInsertMembers.mockResolvedValue({ error: null });
  });

  it("returns { ok: false, reason: 'empty_name' } for empty name", async () => {
    const result = await createGroup("   ");

    expect(result).toEqual({ ok: false, reason: "empty_name" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns { ok: false, reason: 'unauthenticated' } when no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await createGroup("Mi grupo");

    expect(result).toEqual({ ok: false, reason: "unauthenticated" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("inserts group row with generated invite_code and owner_id", async () => {
    const result = await createGroup("Mi grupo");

    expect(result).toMatchObject({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith("groups");
    expect(mockInsertGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: USER_ID,
        name: "Mi grupo",
        invite_code: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{8}$/),
      }),
    );
  });

  it("inserts creator into group_members after group insert", async () => {
    const result = await createGroup("Mi grupo");

    expect(result).toMatchObject({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith("group_members");
    expect(mockInsertMembers).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: GROUP_ID,
        user_id: USER_ID,
      }),
    );
  });

  it("returns { ok: true, code } with valid invite code on success", async () => {
    const result = await createGroup("Los cracks");

    expect(result).toMatchObject({
      ok: true,
      code: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{8}$/),
    });
  });

  it("retries invite_code on unique-constraint collision (max 3)", async () => {
    const uniqueError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    // First two attempts fail, third succeeds
    mockInsertGroupsSingle
      .mockResolvedValueOnce({ data: null, error: uniqueError })
      .mockResolvedValueOnce({ data: null, error: uniqueError })
      .mockResolvedValueOnce({ data: { id: GROUP_ID }, error: null });

    const result = await createGroup("Los cracks");

    expect(result).toMatchObject({ ok: true });
    expect(mockInsertGroupsSingle).toHaveBeenCalledTimes(3);
  });

  it("returns { ok: false, reason: 'code_collision' } after 3 retries", async () => {
    const uniqueError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };
    mockInsertGroupsSingle.mockResolvedValue({
      data: null,
      error: uniqueError,
    });

    const result = await createGroup("Los cracks");

    expect(result).toEqual({ ok: false, reason: "code_collision" });
    expect(mockInsertGroupsSingle).toHaveBeenCalledTimes(3);
  });

  it("throws on unexpected DB error during group insert", async () => {
    mockInsertGroupsSingle.mockResolvedValue({
      data: null,
      error: { code: "ZZZZZ", message: "Unexpected DB error" },
    });

    await expect(createGroup("Mi grupo")).rejects.toThrow(
      "Unexpected DB error",
    );
  });
});
