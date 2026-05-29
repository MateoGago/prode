import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLeaderboard } from "@/features/leaderboard/actions/get-leaderboard";
import type { GetLeaderboardRpcRow } from "@/features/leaderboard/entities/leaderboard";

// ── Supabase server mock ──────────────────────────────────────────────────────
// vi.hoisted ensures mockRpc is defined before vi.mock factory runs (hoisting).
const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("@/shared/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    rpc: mockRpc,
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────

describe("getLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped LeaderboardRow[] on success", async () => {
    const rawRows: GetLeaderboardRpcRow[] = [
      { user_id: "u1", display_name: "Alice", total_points: 30, hits: 5 },
      { user_id: "u2", display_name: "Bob", total_points: "20", hits: "3" },
    ];

    mockRpc.mockResolvedValueOnce({ data: rawRows, error: null });

    const result = await getLeaderboard();

    expect(result).toEqual([
      { playerId: "u1", playerName: "Alice", totalPoints: 30 },
      { playerId: "u2", playerName: "Bob", totalPoints: 20 },
    ]);
  });

  it("calls supabase.rpc with 'get_leaderboard'", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await getLeaderboard();

    expect(mockRpc).toHaveBeenCalledWith("get_leaderboard");
  });

  it("throws an Error when RPC returns an error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Permission denied" },
    });

    await expect(getLeaderboard()).rejects.toThrow("Permission denied");
  });

  it("returns [] when RPC returns an empty data array", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await getLeaderboard();

    expect(result).toEqual([]);
  });
});
