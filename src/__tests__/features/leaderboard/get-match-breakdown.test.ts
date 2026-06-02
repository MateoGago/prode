import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMatchBreakdown } from "@/features/leaderboard/actions/get-match-breakdown";

// ── Supabase server mock ──────────────────────────────────────────────────────
// The breakdown now reads through the get_match_breakdown RPC (SECURITY DEFINER,
// co-membership self-gated) instead of a direct predictions SELECT — the RLS
// policy pred_select_own would otherwise return zero rows for any other player.
const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("@/shared/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ rpc: mockRpc }),
}));

// ─────────────────────────────────────────────────────────────────────────────

// Shape returned by the RPC (SETOF jsonb) — nested, matching BreakdownPredictionRow.
const sampleData = [
  {
    match_id: "m1",
    home_score: 2,
    away_score: 1,
    points_awarded: 3,
    match: {
      home_score: 2,
      away_score: 1,
      multiplier: 1,
      status: "confirmed",
      kickoff_at: "2026-06-01T18:00:00Z",
      home_team: { name: "Argentina" },
      away_team: { name: "Brazil" },
    },
  },
  {
    match_id: "m2",
    home_score: 0,
    away_score: 0,
    points_awarded: 0,
    match: {
      home_score: 1,
      away_score: 0,
      multiplier: 1,
      status: "confirmed",
      kickoff_at: "2026-06-02T18:00:00Z",
      home_team: { name: "France" },
      away_team: { name: "Germany" },
    },
  },
];

describe("getMatchBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: sampleData, error: null });
  });

  it("calls the get_match_breakdown RPC with the target user and group", async () => {
    await getMatchBreakdown("user-123", "group-9");

    expect(mockRpc).toHaveBeenCalledWith("get_match_breakdown", {
      p_user_id: "user-123",
      p_group_id: "group-9",
    });
  });

  it("passes a null group for the self view (no groupId — dashboard)", async () => {
    await getMatchBreakdown("user-123");

    expect(mockRpc).toHaveBeenCalledWith("get_match_breakdown", {
      p_user_id: "user-123",
      p_group_id: null,
    });
  });

  it("returns mapped MatchBreakdownItem[] on success", async () => {
    const result = await getMatchBreakdown("user-123", "group-9");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      matchId: "m1",
      matchLabel: "Argentina vs Brazil",
      homeTeamName: "Argentina",
      awayTeamName: "Brazil",
      homeFlagUrl: null,
      awayFlagUrl: null,
      predictedHomeScore: 2,
      predictedAwayScore: 1,
      actualHomeScore: 2,
      actualAwayScore: 1,
      pointsAwarded: 3,
      hitType: "exact",
      multiplier: 1,
    });
  });

  it("throws an Error when the RPC returns an error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    });

    await expect(getMatchBreakdown("user-123", "group-9")).rejects.toThrow(
      "Database error",
    );
  });

  it("returns [] when the RPC returns no rows", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await getMatchBreakdown("user-123", "group-9");

    expect(result).toEqual([]);
  });
});
