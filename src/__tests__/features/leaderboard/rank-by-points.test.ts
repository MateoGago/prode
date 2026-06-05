import { describe, expect, it } from "vitest";

import { rankByPoints } from "@/features/leaderboard/entities/leaderboard";

// The single source of truth for ranking: total points DESC, standard
// competition ranking (shared rank on ties, next rank skips). Previously this
// logic was copy-pasted in derivePlayerStats, getRankedRows and listMyGroups.

describe("rankByPoints", () => {
  it("sorts by totalPoints DESC and assigns rank 1..n", () => {
    const ranked = rankByPoints([
      { id: "a", totalPoints: 10 },
      { id: "b", totalPoints: 30 },
      { id: "c", totalPoints: 20 },
    ]);

    expect(ranked.map((r) => [r.id, r.rank])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });

  it("shares rank on ties and skips the next rank (1,1,3)", () => {
    const ranked = rankByPoints([
      { id: "x", totalPoints: 50 },
      { id: "y", totalPoints: 50 },
      { id: "z", totalPoints: 10 },
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("ranks a single tie below the leader as (1,2,2)", () => {
    const ranked = rankByPoints([
      { id: "leader", totalPoints: 40 },
      { id: "tieA", totalPoints: 34 },
      { id: "tieB", totalPoints: 34 },
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2]);
  });

  it("preserves every other field on the row", () => {
    const [first] = rankByPoints([
      { id: "a", playerName: "Ana", totalPoints: 5, extra: true },
    ]);

    expect(first).toEqual({
      id: "a",
      playerName: "Ana",
      totalPoints: 5,
      extra: true,
      rank: 1,
    });
  });

  it("returns an empty array for no rows", () => {
    expect(rankByPoints([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { id: "a", totalPoints: 1 },
      { id: "b", totalPoints: 2 },
    ];
    rankByPoints(input);
    expect(input.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
