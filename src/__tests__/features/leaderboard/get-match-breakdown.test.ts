import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMatchBreakdown } from "@/features/leaderboard/actions/get-match-breakdown";

// ── Supabase server mock ──────────────────────────────────────────────────────
// vi.hoisted ensures mockFrom is defined before vi.mock factory runs (hoisting).
const { mockSelect, mockEq, mockOrder, mockFrom } = vi.hoisted(() => {
  const mockOrder = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockSelect, mockEq, mockOrder, mockFrom };
});

vi.mock("@/shared/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockFrom,
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────

const sampleData = [
  {
    match_id: "m1",
    home_score: 2,
    away_score: 1,
    points_awarded: 3,
    match: {
      home_score: 2,
      away_score: 1,
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
    // Re-chain the mock return values after clearAllMocks
    mockOrder.mockResolvedValue({ data: sampleData, error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("queries predictions for the given userId", async () => {
    await getMatchBreakdown("user-123");

    expect(mockFrom).toHaveBeenCalledWith("predictions");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("returns mapped MatchBreakdownItem[] on success", async () => {
    const result = await getMatchBreakdown("user-123");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      matchId: "m1",
      matchLabel: "Argentina vs Brazil",
      predictedHomeScore: 2,
      predictedAwayScore: 1,
      actualHomeScore: 2,
      actualAwayScore: 1,
      pointsAwarded: 3,
    });
  });

  it("throws an Error when query returns an error", async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    });

    await expect(getMatchBreakdown("user-123")).rejects.toThrow(
      "Database error",
    );
  });

  it("returns [] when data is empty", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const result = await getMatchBreakdown("user-123");

    expect(result).toEqual([]);
  });
});
