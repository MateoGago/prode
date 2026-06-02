import { describe, expect, it } from "vitest";

import type { Match, Team } from "@/features/fixtures/entities/match";
import {
  buildPredictionsByMatchId,
  groupMatches,
  groupMatchesByDay,
  groupMatchesByRound,
  mapMatchRow,
  selectNextScheduledMatch,
  type MatchWithTeamsRow,
  normalizeTeamRelation,
  type PredictionReadRow,
  shouldCollapseDayByDefault,
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

describe("groupMatchesByDay", () => {
  it("buckets matches by AR-local kickoff date and orders days chronologically", () => {
    const days = groupMatchesByDay([
      groupMatch({
        id: "d12",
        kickoffAt: new Date("2026-06-12T19:00:00.000Z"),
      }),
      groupMatch({
        id: "d11",
        kickoffAt: new Date("2026-06-11T19:00:00.000Z"),
      }),
    ]);

    expect(days.map((d) => d.dateKey)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(days[0]).toMatchObject({
      dateKey: "2026-06-11",
      day: "11",
      weekday: "Jueves",
      month: "Junio",
    });
  });

  it("orders matches within a day by kickoff instant", () => {
    const days = groupMatchesByDay([
      groupMatch({
        id: "late",
        kickoffAt: new Date("2026-06-11T22:00:00.000Z"),
      }),
      groupMatch({
        id: "early",
        kickoffAt: new Date("2026-06-11T16:00:00.000Z"),
      }),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].matches.map((m) => m.id)).toEqual(["early", "late"]);
  });

  it("groups a late-night UTC kickoff under its AR calendar day", () => {
    // 00:00 UTC Jun 12 = 21:00 ART Jun 11 → must share the Jun 11 bucket.
    const days = groupMatchesByDay([
      groupMatch({
        id: "evening",
        kickoffAt: new Date("2026-06-11T19:00:00.000Z"),
      }),
      groupMatch({
        id: "latenight",
        kickoffAt: new Date("2026-06-12T00:00:00.000Z"),
      }),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].dateKey).toBe("2026-06-11");
    expect(days[0].matches.map((m) => m.id)).toEqual(["evening", "latenight"]);
  });

  it("is round-agnostic — it buckets whatever it is given", () => {
    const days = groupMatchesByDay([groupMatch({ id: "ko", round: "r16" })]);

    expect(days.flatMap((d) => d.matches.map((m) => m.id))).toEqual(["ko"]);
  });
});

describe("selectNextScheduledMatch", () => {
  it("returns the soonest-kickoff scheduled match with teams", () => {
    const next = selectNextScheduledMatch([
      groupMatch({
        id: "confirmed-early",
        status: "confirmed",
        kickoffAt: new Date("2026-06-11T19:00:00.000Z"),
      }),
      groupMatch({
        id: "scheduled-late",
        status: "scheduled",
        kickoffAt: new Date("2026-07-01T19:00:00.000Z"),
      }),
      groupMatch({
        id: "scheduled-soon",
        status: "scheduled",
        kickoffAt: new Date("2026-06-28T19:00:00.000Z"),
      }),
    ]);

    expect(next?.id).toBe("scheduled-soon");
  });

  it("ignores matches without resolved teams", () => {
    const next = selectNextScheduledMatch([
      groupMatch({
        id: "tbd",
        status: "scheduled",
        homeTeam: null,
        awayTeam: null,
        kickoffAt: new Date("2026-06-28T19:00:00.000Z"),
      }),
      groupMatch({
        id: "real",
        status: "scheduled",
        kickoffAt: new Date("2026-07-01T19:00:00.000Z"),
      }),
    ]);

    expect(next?.id).toBe("real");
  });

  it("returns null when nothing is scheduled", () => {
    expect(
      selectNextScheduledMatch([groupMatch({ id: "a", status: "confirmed" })]),
    ).toBeNull();
  });
});

describe("groupMatchesByRound", () => {
  it("buckets resolved knockout matches by round in bracket order, skipping group", () => {
    const rounds = groupMatchesByRound([
      groupMatch({ id: "g1", round: "group" }),
      groupMatch({ id: "qf1", round: "qf" }),
      groupMatch({ id: "r32a", round: "r32" }),
    ]);

    expect(rounds.map((r) => r.round)).toEqual(["r32", "qf"]);
  });

  it("excludes knockout matches whose teams are not resolved yet", () => {
    const rounds = groupMatchesByRound([
      groupMatch({ id: "filled", round: "r32" }),
      groupMatch({
        id: "tbd",
        round: "r32",
        homeTeam: null,
        awayTeam: null,
        homePlaceholder: "W74",
        awayPlaceholder: "W77",
      }),
    ]);

    expect(rounds).toHaveLength(1);
    expect(rounds[0].matches.map((m) => m.id)).toEqual(["filled"]);
  });

  it("carries the round label and per-round multiplier", () => {
    const rounds = groupMatchesByRound([
      groupMatch({ id: "r32a", round: "r32" }),
      groupMatch({ id: "r16a", round: "r16" }),
    ]);

    expect(rounds[0]).toMatchObject({
      round: "r32",
      label: "32avos",
      multiplier: 1,
    });
    expect(rounds[1]).toMatchObject({
      round: "r16",
      label: "Octavos",
      multiplier: 2,
    });
  });

  it("orders matches within a round by kickoff instant", () => {
    const rounds = groupMatchesByRound([
      groupMatch({
        id: "late",
        round: "r32",
        kickoffAt: new Date("2026-06-30T22:00:00.000Z"),
      }),
      groupMatch({
        id: "early",
        round: "r32",
        kickoffAt: new Date("2026-06-30T16:00:00.000Z"),
      }),
    ]);

    expect(rounds[0].matches.map((m) => m.id)).toEqual(["early", "late"]);
  });
});

describe("shouldCollapseDayByDefault", () => {
  // now = 2026-06-15 09:00 ART (12:00 UTC). AR today = 15, AR yesterday = 14.
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("keeps today expanded", () => {
    expect(shouldCollapseDayByDefault("2026-06-15", now)).toBe(false);
  });

  it("keeps yesterday expanded", () => {
    expect(shouldCollapseDayByDefault("2026-06-14", now)).toBe(false);
  });

  it("collapses days before yesterday", () => {
    expect(shouldCollapseDayByDefault("2026-06-13", now)).toBe(true);
    expect(shouldCollapseDayByDefault("2026-06-01", now)).toBe(true);
  });

  it("keeps future days expanded", () => {
    expect(shouldCollapseDayByDefault("2026-06-20", now)).toBe(false);
  });

  it("uses the AR calendar day, not UTC, to resolve 'yesterday'", () => {
    // 02:00 UTC Jun 15 = 23:00 ART Jun 14 → AR today = 14, AR yesterday = 13.
    const lateNight = new Date("2026-06-15T02:00:00.000Z");
    expect(shouldCollapseDayByDefault("2026-06-13", lateNight)).toBe(false); // yesterday
    expect(shouldCollapseDayByDefault("2026-06-12", lateNight)).toBe(true); // before
  });
});
