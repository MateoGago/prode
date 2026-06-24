import { describe, expect, it } from "vitest";

import {
  mapMatchBreakdown,
  type BreakdownPredictionRow,
} from "@/features/leaderboard/entities/match-breakdown";

describe("mapMatchBreakdown", () => {
  const makeRow = (
    overrides: Partial<BreakdownPredictionRow> = {},
  ): BreakdownPredictionRow => ({
    match_id: "m1",
    home_score: 2,
    away_score: 1,
    points_awarded: 3,
    match: {
      home_score: 3,
      away_score: 0,
      kickoff_at: "2026-06-15T19:00:00.000Z",
      home_team: {
        name: "Argentina",
        flag_url: "https://flagcdn.com/w40/ar.png",
      },
      away_team: { name: "Brazil", flag_url: "https://flagcdn.com/w40/br.png" },
    },
    ...overrides,
  });

  it("maps all fields correctly", () => {
    const result = mapMatchBreakdown([makeRow()]);

    expect(result).toEqual([
      {
        matchId: "m1",
        matchLabel: "Argentina vs Brazil",
        kickoffAt: "2026-06-15T19:00:00.000Z",
        homeTeamName: "Argentina",
        awayTeamName: "Brazil",
        homeFlagUrl: "https://flagcdn.com/w40/ar.png",
        awayFlagUrl: "https://flagcdn.com/w40/br.png",
        predictedHomeScore: 2,
        predictedAwayScore: 1,
        actualHomeScore: 3,
        actualAwayScore: 0,
        pointsAwarded: 3,
        // predicted home win (2-1), actual home win (3-0) → same outcome but different scores
        hitType: "winner",
        multiplier: 1,
      },
    ]);
  });

  it("builds matchLabel as 'home vs away'", () => {
    const result = mapMatchBreakdown([
      makeRow({
        match: {
          home_score: 1,
          away_score: 0,
          home_team: { name: "France" },
          away_team: { name: "Germany" },
        },
      }),
    ]);

    expect(result[0].matchLabel).toBe("France vs Germany");
  });

  it("coerces string scores and points to numbers (LB-4)", () => {
    const result = mapMatchBreakdown([
      makeRow({
        home_score: "2",
        away_score: "1",
        points_awarded: "3",
        match: {
          home_score: "3",
          away_score: "0",
          home_team: { name: "A" },
          away_team: { name: "B" },
        },
      }),
    ]);

    expect(typeof result[0].predictedHomeScore).toBe("number");
    expect(typeof result[0].predictedAwayScore).toBe("number");
    expect(typeof result[0].actualHomeScore).toBe("number");
    expect(typeof result[0].actualAwayScore).toBe("number");
    expect(typeof result[0].pointsAwarded).toBe("number");
    expect(result[0].predictedHomeScore).toBe(2);
    expect(result[0].actualHomeScore).toBe(3);
    expect(result[0].pointsAwarded).toBe(3);
  });

  it("returns [] for null input", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing null guard
    expect(mapMatchBreakdown(null as any)).toEqual([]);
  });

  it("returns [] for undefined input", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing undefined guard
    expect(mapMatchBreakdown(undefined as any)).toEqual([]);
  });

  it("returns [] for empty array", () => {
    expect(mapMatchBreakdown([])).toEqual([]);
  });

  it("maps N input rows to N output items (LB-4)", () => {
    const rows = [
      makeRow({ match_id: "m1" }),
      makeRow({ match_id: "m2" }),
      makeRow({ match_id: "m3" }),
    ];

    const result = mapMatchBreakdown(rows);

    expect(result).toHaveLength(3);
    expect(result[0].matchId).toBe("m1");
    expect(result[1].matchId).toBe("m2");
    expect(result[2].matchId).toBe("m3");
  });

  it("skips rows whose match is null", () => {
    const rows = [
      makeRow({ match_id: "m1", match: null }),
      makeRow({ match_id: "m2" }),
    ];

    const result = mapMatchBreakdown(rows);

    expect(result).toHaveLength(1);
    expect(result[0].matchId).toBe("m2");
  });

  it("uses 'Equipo' placeholder when a team name is missing", () => {
    const result = mapMatchBreakdown([
      makeRow({
        match: {
          home_score: 0,
          away_score: 0,
          home_team: null,
          away_team: { name: "Spain" },
        },
      }),
    ]);

    expect(result[0].matchLabel).toBe("Equipo vs Spain");
  });
});
