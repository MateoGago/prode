import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateDisplayName } from "@/features/auth/actions/update-display-name";

// ── Supabase server mock — captures the update payload + the row filter ───────
const { mockFrom, mockUpdate, mockEq } = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ update: mockUpdate }));
  return { mockFrom, mockUpdate, mockEq };
});

vi.mock("@/shared/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
}));

vi.mock("@/features/auth/actions/get-current-user", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ─────────────────────────────────────────────────────────────────────────────

describe("updateDisplayName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockEq.mockResolvedValue({ error: null });
  });

  it("rejects a name shorter than 2 chars without touching the DB", async () => {
    const result = await updateDisplayName({ displayName: "a" });

    expect(result.status).toBe("error");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("trims and writes the name to the caller's own profiles row", async () => {
    const result = await updateDisplayName({ displayName: "  Santi Pacini  " });

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: "Santi Pacini" });
    expect(mockEq).toHaveBeenCalledWith("id", "user-1");
    expect(result).toMatchObject({
      status: "success",
      displayName: "Santi Pacini",
    });
  });

  it("returns an error for an unauthenticated caller and never updates", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await updateDisplayName({ displayName: "Santi" });

    expect(result.status).toBe("error");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("surfaces a DB failure as an error state", async () => {
    mockEq.mockResolvedValue({ error: { message: "rls denied" } });

    const result = await updateDisplayName({ displayName: "Santi" });

    expect(result.status).toBe("error");
  });
});
