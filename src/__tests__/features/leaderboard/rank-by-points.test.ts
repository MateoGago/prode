import { describe, expect, it } from "vitest";

import { rankByPoints } from "@/features/leaderboard/entities/leaderboard";

// The single source of truth for ranking: total points DESC, SEQUENTIAL
// positions (never shared on ties; ties broken alphabetically by player name).
// Consumed by derivePlayerStats, the leaderboard table and listMyGroups.

describe("rankByPoints", () => {
  it("sorts by totalPoints DESC and assigns rank 1..n", () => {
    const ranked = rankByPoints([
      { id: "a", playerName: "Ana", totalPoints: 10 },
      { id: "b", playerName: "Bob", totalPoints: 30 },
      { id: "c", playerName: "Caro", totalPoints: 20 },
    ]);

    expect(ranked.map((r) => [r.id, r.rank])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });

  it("numbers ties sequentially — never shared (1,2,3 not 1,1,3)", () => {
    const ranked = rankByPoints([
      { id: "x", playerName: "Xavi", totalPoints: 50 },
      { id: "y", playerName: "Yago", totalPoints: 50 },
      { id: "z", playerName: "Zoe", totalPoints: 10 },
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("breaks point ties alphabetically by player name (es locale)", () => {
    const ranked = rankByPoints([
      { id: "leader", playerName: "Zeta", totalPoints: 40 },
      { id: "tieB", playerName: "Bruno", totalPoints: 34 },
      { id: "tieA", playerName: "Ana", totalPoints: 34 },
    ]);

    // Zeta leads on points; the 34-pt tie orders Ana before Bruno.
    expect(ranked.map((r) => [r.playerName, r.rank])).toEqual([
      ["Zeta", 1],
      ["Ana", 2],
      ["Bruno", 3],
    ]);
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
      { id: "a", playerName: "Ana", totalPoints: 1 },
      { id: "b", playerName: "Bob", totalPoints: 2 },
    ];
    rankByPoints(input);
    expect(input.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
