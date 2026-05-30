import { describe, expect, it } from "vitest";

import type { Match, Team } from "@/features/fixtures/entities/match";
import {
  buildPredictionsByMatchId,
  groupMatches,
  mapMatchRow,
  type MatchWithTeamsRow,
  normalizeTeamRelation,
  type PredictionReadRow,
  type TeamJoinRow,
} from "@/features/predictions/entities/predictions-page";

const teamRow: NonNullable<TeamJoinRow> = {
  id: "team-1",
  external_ref: "ARG",
  name: "Argentina",
  group_label: "A",
  flag_url: "https://flagcdn.com/w320/ar.png",
};

function matchRow(
  overrides: Partial<MatchWithTeamsRow> = {},
): MatchWithTeamsRow {
  return {
    id: "match-1",
    external_ref: "wc2026-1",
    round: "group",
    multiplier: 1,
    matchday: 1,
    home_placeholder: null,
    away_placeholder: null,
    kickoff_at: "2026-06-11T19:00:00.000Z",
    status: "scheduled",
    home_score: null,
    away_score: null,
    result_confirmed_at: null,
    home_team: teamRow,
    away_team: {
      ...teamRow,
      id: "team-2",
      external_ref: "MEX",
      name: "México",
    },
    ...overrides,
  };
}

function team(id: string, name: string, groupLabel: string | null): Team {
  return { id, externalRef: id, name, groupLabel, flagUrl: null };
}

/** A group-stage match built from the domain side, for grouping tests. */
function groupMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "m",
    externalRef: "ref",
    round: "group",
    multiplier: 1,
    matchday: 1,
    homeTeam: team("t1", "Argentina", "A"),
    awayTeam: team("t2", "México", "A"),
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date("2026-06-11T19:00:00.000Z"),
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
    ...overrides,
  };
}

describe("normalizeTeamRelation", () => {
  it("returns the object when the relation is a single row", () => {
    expect(normalizeTeamRelation(teamRow)).toBe(teamRow);
  });

  it("unwraps a one-element array (PostgREST to-one shape)", () => {
    expect(normalizeTeamRelation([teamRow])).toBe(teamRow);
  });

  it("returns null for an empty array", () => {
    expect(normalizeTeamRelation([])).toBeNull();
  });

  it("returns null for null and undefined", () => {
    expect(normalizeTeamRelation(null)).toBeNull();
    expect(normalizeTeamRelation(undefined)).toBeNull();
  });
});

describe("mapMatchRow", () => {
  it("maps a row (incl. array-shaped joins) into a domain Match", () => {
    const match = mapMatchRow(matchRow({ home_team: [teamRow] }));

    expect(match.id).toBe("match-1");
    expect(match.round).toBe("group");
    expect(match.homeTeam?.name).toBe("Argentina");
    expect(match.homeTeam?.flagUrl).toBe("https://flagcdn.com/w320/ar.png");
    expect(match.kickoffAt).toEqual(new Date("2026-06-11T19:00:00.000Z"));
  });

  it("defaults absent knockout joins to null", () => {
    const match = mapMatchRow(matchRow());

    expect(match.penaltyWinnerTeam).toBeNull();
    expect(match.advancerTeam).toBeNull();
  });

  it("maps a resolved result_confirmed_at into a Date", () => {
    const match = mapMatchRow(
      matchRow({ result_confirmed_at: "2026-06-11T21:00:00.000Z" }),
    );

    expect(match.resultConfirmedAt).toEqual(
      new Date("2026-06-11T21:00:00.000Z"),
    );
  });
});

describe("buildPredictionsByMatchId", () => {
  it("indexes prediction read rows by match id", () => {
    const rows: PredictionReadRow[] = [
      { match_id: "m1", home_score: 2, away_score: 1, advancer_team_id: null },
      {
        match_id: "m2",
        home_score: 1,
        away_score: 1,
        advancer_team_id: "team-9",
      },
    ];

    expect(buildPredictionsByMatchId(rows)).toEqual({
      m1: { homeScore: 2, awayScore: 1, advancerTeamId: null },
      m2: { homeScore: 1, awayScore: 1, advancerTeamId: "team-9" },
    });
  });

  it("returns an empty record for no rows", () => {
    expect(buildPredictionsByMatchId([])).toEqual({});
  });
});

describe("groupMatches", () => {
  it("keeps only group-stage matches", () => {
    const groups = groupMatches([
      groupMatch({ id: "g", round: "group" }),
      groupMatch({ id: "k", round: "r16" }),
    ]);

    const ids = groups.flatMap((group) => group.matches.map((m) => m.id));
    expect(ids).toEqual(["g"]);
  });

  it("groups by label and sorts groups alphabetically", () => {
    const groups = groupMatches([
      groupMatch({
        id: "b",
        homeTeam: team("t1", "Argentina", "B"),
        awayTeam: team("t2", "México", "B"),
      }),
      groupMatch({ id: "a" }),
    ]);

    expect(groups.map((group) => group.groupLabel)).toEqual(["A", "B"]);
  });

  it("orders matches within a group by matchday, then kickoff", () => {
    const groups = groupMatches([
      groupMatch({
        id: "late-md1",
        matchday: 1,
        kickoffAt: new Date("2026-06-11T22:00:00.000Z"),
      }),
      groupMatch({
        id: "early-md1",
        matchday: 1,
        kickoffAt: new Date("2026-06-11T19:00:00.000Z"),
      }),
      groupMatch({ id: "md2", matchday: 2 }),
    ]);

    expect(groups[0].matches.map((m) => m.id)).toEqual([
      "early-md1",
      "late-md1",
      "md2",
    ]);
  });

  it("falls back to a readable label when no group can be resolved", () => {
    const groups = groupMatches([
      groupMatch({ id: "orphan", homeTeam: null, awayTeam: null }),
    ]);

    expect(groups[0].groupLabel).toBe("Sin asignar");
  });
});
