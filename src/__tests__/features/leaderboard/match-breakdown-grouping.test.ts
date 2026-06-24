import { describe, expect, it } from "vitest";

import { groupMatchBreakdownByDay } from "@/features/leaderboard/entities/match-breakdown";
import type { MatchBreakdownItem } from "@/features/leaderboard/components/match-breakdown-list";

const makeItem = (
  overrides: Partial<MatchBreakdownItem> & Pick<MatchBreakdownItem, "matchId">,
): MatchBreakdownItem => ({
  matchLabel: "A vs B",
  kickoffAt: "2026-06-13T19:00:00.000Z",
  homeTeamName: "A",
  awayTeamName: "B",
  homeFlagUrl: null,
  awayFlagUrl: null,
  predictedHomeScore: 1,
  predictedAwayScore: 0,
  actualHomeScore: 1,
  actualAwayScore: 0,
  pointsAwarded: 3,
  hitType: "exact",
  multiplier: 1,
  ...overrides,
});

describe("groupMatchBreakdownByDay", () => {
  it("returns an empty array for no items", () => {
    expect(groupMatchBreakdownByDay([])).toEqual([]);
  });

  it("buckets by AR-local day, newest day first", () => {
    const blocks = groupMatchBreakdownByDay([
      makeItem({ matchId: "early", kickoffAt: "2026-06-13T19:00:00.000Z" }),
      makeItem({ matchId: "later", kickoffAt: "2026-06-14T19:00:00.000Z" }),
    ]);

    expect(blocks.map((b) => b.dateKey)).toEqual(["2026-06-14", "2026-06-13"]);
  });

  it("orders matches within a day newest first", () => {
    const blocks = groupMatchBreakdownByDay([
      makeItem({ matchId: "noon", kickoffAt: "2026-06-13T16:00:00.000Z" }),
      makeItem({ matchId: "night", kickoffAt: "2026-06-13T23:00:00.000Z" }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].items.map((i) => i.matchId)).toEqual(["night", "noon"]);
  });

  it("puts items with no kickoff into a trailing 'Sin fecha' bucket", () => {
    const blocks = groupMatchBreakdownByDay([
      makeItem({ matchId: "dated", kickoffAt: "2026-06-13T19:00:00.000Z" }),
      makeItem({ matchId: "undated", kickoffAt: "" }),
    ]);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].dateKey).toBe("2026-06-13");
    expect(blocks[1].weekday).toBe("Sin fecha");
  });
});
