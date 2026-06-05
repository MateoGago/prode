import { describe, expect, it } from "vitest";

import type { Match, Team } from "@/features/fixtures/entities/match";
import type { MatchBreakdownItem } from "@/features/leaderboard";
import {
  countPendingPredictions,
  derivePlayerStats,
  mapLastResults,
  selectNextMatch,
} from "@/features/dashboard/entities/inicio";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function team(name: string, ref: string): Team {
  return {
    id: `t-${ref}`,
    externalRef: ref,
    name,
    groupLabel: "C",
    flagUrl: `https://flagcdn.com/w80/${ref}.png`,
  };
}

function match(
  overrides: Partial<Match> & Pick<Match, "id" | "kickoffAt">,
): Match {
  return {
    externalRef: `ext-${overrides.id}`,
    round: "group",
    multiplier: 1,
    matchday: 1,
    homeTeam: team("Argentina", "ar"),
    awayTeam: team("México", "mx"),
    homePlaceholder: null,
    awayPlaceholder: null,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
    ...overrides,
  };
}

const NOW = new Date("2026-06-13T12:00:00Z");

// ── selectNextMatch ─────────────────────────────────────────────────────────

describe("selectNextMatch", () => {
  it("picks the soonest scheduled match whose kickoff is still in the future", () => {
    const soon = match({
      id: "soon",
      kickoffAt: new Date("2026-06-13T14:00:00Z"),
    });
    const later = match({
      id: "later",
      kickoffAt: new Date("2026-06-14T18:00:00Z"),
    });

    expect(selectNextMatch([later, soon], NOW)?.id).toBe("soon");
  });

  it("ignores matches whose kickoff already passed", () => {
    const past = match({
      id: "past",
      kickoffAt: new Date("2026-06-13T10:00:00Z"),
    });
    const future = match({
      id: "future",
      kickoffAt: new Date("2026-06-13T20:00:00Z"),
    });

    expect(selectNextMatch([past, future], NOW)?.id).toBe("future");
  });

  it("ignores non-scheduled matches (live/finished/confirmed are not pronosticable)", () => {
    const live = match({
      id: "live",
      kickoffAt: new Date("2026-06-13T13:00:00Z"),
      status: "live",
    });
    const scheduled = match({
      id: "scheduled",
      kickoffAt: new Date("2026-06-13T19:00:00Z"),
      status: "scheduled",
    });

    expect(selectNextMatch([live, scheduled], NOW)?.id).toBe("scheduled");
  });

  it("ignores matches whose teams are still placeholders (no team to show/predict)", () => {
    const placeholder = match({
      id: "ph",
      kickoffAt: new Date("2026-06-13T13:00:00Z"),
      homeTeam: null,
      awayTeam: null,
      homePlaceholder: "1A",
      awayPlaceholder: "2B",
    });
    const real = match({
      id: "real",
      kickoffAt: new Date("2026-06-13T20:00:00Z"),
    });

    expect(selectNextMatch([placeholder, real], NOW)?.id).toBe("real");
  });

  it("returns null when there is no upcoming pronosticable match", () => {
    const past = match({
      id: "past",
      kickoffAt: new Date("2026-06-13T10:00:00Z"),
    });
    expect(selectNextMatch([past], NOW)).toBeNull();
    expect(selectNextMatch([], NOW)).toBeNull();
  });
});

// ── countPendingPredictions ─────────────────────────────────────────────────

describe("countPendingPredictions", () => {
  const open = [
    match({ id: "a", kickoffAt: new Date("2026-06-13T20:00:00Z") }),
    match({ id: "b", kickoffAt: new Date("2026-06-14T20:00:00Z") }),
    match({ id: "c", kickoffAt: new Date("2026-06-15T20:00:00Z") }),
  ];

  it("counts open matches with no saved prediction", () => {
    expect(countPendingPredictions(open, new Set(["a"]), NOW)).toBe(2);
  });

  it("is zero when every open match already has a prediction", () => {
    expect(countPendingPredictions(open, new Set(["a", "b", "c"]), NOW)).toBe(
      0,
    );
  });

  it("does not count matches whose kickoff already locked", () => {
    const withPast = [
      ...open,
      match({ id: "locked", kickoffAt: new Date("2026-06-13T10:00:00Z") }),
    ];
    expect(countPendingPredictions(withPast, new Set(), NOW)).toBe(3);
  });
});

// ── derivePlayerStats ───────────────────────────────────────────────────────

describe("derivePlayerStats", () => {
  const rows = [
    { playerId: "u1", playerName: "Ana", totalPoints: 34 },
    { playerId: "u2", playerName: "Beto", totalPoints: 40 },
    { playerId: "u3", playerName: "Caro", totalPoints: 34 },
  ];

  it("returns the player's points and dense rank position", () => {
    // sorted: Beto 40 (#1), Ana 34 (#2), Caro 34 (#2 tie)
    expect(derivePlayerStats(rows, "u1")).toEqual({ position: 2, points: 34 });
    expect(derivePlayerStats(rows, "u2")).toEqual({ position: 1, points: 40 });
  });

  it("shares rank on ties (Ana and Caro both #2)", () => {
    expect(derivePlayerStats(rows, "u3").position).toBe(2);
  });

  it("returns null position and 0 points for a player not on the board yet", () => {
    expect(derivePlayerStats(rows, "newbie")).toEqual({
      position: null,
      points: 0,
    });
  });

  it("handles an empty board", () => {
    expect(derivePlayerStats([], "u1")).toEqual({ position: null, points: 0 });
  });
});

// ── mapLastResults ──────────────────────────────────────────────────────────

function breakdown(
  overrides: Partial<MatchBreakdownItem> & Pick<MatchBreakdownItem, "matchId">,
): MatchBreakdownItem {
  return {
    matchLabel: "Brasil vs Serbia",
    homeTeamName: "Brasil",
    awayTeamName: "Serbia",
    homeFlagUrl: null,
    awayFlagUrl: null,
    predictedHomeScore: 2,
    predictedAwayScore: 1,
    actualHomeScore: 2,
    actualAwayScore: 1,
    pointsAwarded: 3,
    hitType: "exact",
    multiplier: 1,
    ...overrides,
  };
}

describe("mapLastResults", () => {
  it("labels an exact hit as 'win' with exact-result copy", () => {
    const [row] = mapLastResults([breakdown({ matchId: "m1" })]);

    expect(row.score).toBe("2–1");
    expect(row.kind).toBe("win");
    expect(row.points).toBe("+3");
    expect(row.detail).toMatch(/exacto/i);
    expect(row.detail).toMatch(/2–1/);
  });

  it("labels a correct-direction-but-not-exact hit as 'partial'", () => {
    const [row] = mapLastResults([
      breakdown({
        matchId: "m2",
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        actualHomeScore: 2,
        actualAwayScore: 1,
        pointsAwarded: 1,
      }),
    ]);

    expect(row.score).toBe("2–1");
    expect(row.kind).toBe("partial");
    expect(row.points).toBe("+1");
    expect(row.detail).toMatch(/ganador/i);
  });

  it("labels a miss (0 points) as 'zero'", () => {
    const [row] = mapLastResults([
      breakdown({
        matchId: "m3",
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        actualHomeScore: 0,
        actualAwayScore: 2,
        pointsAwarded: 0,
      }),
    ]);

    expect(row.kind).toBe("zero");
    expect(row.points).toBe("0");
  });

  it("keeps the most recent results first and limits to the given count", () => {
    // getMatchBreakdown returns ascending by kickoff; dashboard wants newest first.
    const items = [
      breakdown({ matchId: "old" }),
      breakdown({ matchId: "mid" }),
      breakdown({ matchId: "new" }),
    ];
    const rows = mapLastResults(items, 2);

    expect(rows).toHaveLength(2);
    expect(rows[0].matchId).toBe("new");
    expect(rows[1].matchId).toBe("mid");
  });

  it("returns an empty array for no confirmed results", () => {
    expect(mapLastResults([])).toEqual([]);
  });
});
