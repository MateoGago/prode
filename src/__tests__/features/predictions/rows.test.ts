import { describe, expect, it } from "vitest";

import {
  predictionToRow,
  rowToContext,
} from "@/features/predictions/entities/rows";

describe("predictionToRow", () => {
  it("maps a prediction input to a snake_case row", () => {
    expect(
      predictionToRow({
        userId: "u1",
        matchId: "m1",
        homeScore: 2,
        awayScore: 1,
        advancerTeamId: null,
      }),
    ).toEqual({
      user_id: "u1",
      match_id: "m1",
      home_score: 2,
      away_score: 1,
      advancer_team_id: null,
    });
  });

  it("carries the advancer for a knockout draw", () => {
    const row = predictionToRow({
      userId: "u1",
      matchId: "m1",
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: "team-a",
    });
    expect(row.advancer_team_id).toBe("team-a");
  });
});

describe("rowToContext", () => {
  it("maps a matches row to a MatchKickoffContext", () => {
    expect(
      rowToContext({
        round: "r16",
        home_team_id: "uuid-a",
        away_team_id: "uuid-b",
        kickoff_at: "2026-07-01T19:00:00.000Z",
      }),
    ).toEqual({
      round: "r16",
      homeTeamId: "uuid-a",
      awayTeamId: "uuid-b",
      kickoffAt: new Date("2026-07-01T19:00:00.000Z"),
    });
  });

  it("preserves null team ids for unresolved knockout slots", () => {
    const ctx = rowToContext({
      round: "r32",
      home_team_id: null,
      away_team_id: null,
      kickoff_at: "2026-06-28T19:00:00.000Z",
    });
    expect(ctx.homeTeamId).toBeNull();
    expect(ctx.awayTeamId).toBeNull();
  });
});
