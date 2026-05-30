import { describe, expect, it } from "vitest";

import type { Match, Team } from "@/features/fixtures/entities/match";
import { matchToRow, teamToRow } from "@/features/fixtures/entities/rows";

const mexico: Team = {
  id: "",
  externalRef: "mexico",
  name: "Mexico",
  groupLabel: "A",
  flagUrl: null,
};

function groupMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "",
    externalRef: "wc2026-g-a-mexico-vs-south-africa",
    round: "group",
    multiplier: 1,
    matchday: 1,
    homeTeam: mexico,
    awayTeam: { ...mexico, externalRef: "south-africa", name: "South Africa" },
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

function knockoutMatch(): Match {
  return {
    ...groupMatch(),
    externalRef: "wc2026-ko-73",
    round: "r32",
    matchday: null,
    homeTeam: null,
    awayTeam: null,
    homePlaceholder: "2A",
    awayPlaceholder: "2B",
  };
}

describe("teamToRow", () => {
  it("maps a domain Team to a snake_case DB row", () => {
    expect(teamToRow(mexico)).toEqual({
      external_ref: "mexico",
      name: "Mexico",
      group_label: "A",
      flag_url: null,
    });
  });
});

describe("matchToRow", () => {
  const ids = new Map<string, string>([
    ["mexico", "uuid-mexico"],
    ["south-africa", "uuid-rsa"],
  ]);

  it("resolves team externalRefs to their DB uuids for a group match", () => {
    const row = matchToRow(groupMatch(), ids);
    expect(row.home_team_id).toBe("uuid-mexico");
    expect(row.away_team_id).toBe("uuid-rsa");
    // Placeholder fields are OMITTED (undefined) when null — not written as null
    // — so the upsert never overwrites an existing DB placeholder with null.
    expect(row.home_placeholder).toBeUndefined();
    expect(row.away_placeholder).toBeUndefined();
    expect(row.matchday).toBe(1);
    expect(row.round).toBe("group");
    expect(row.kickoff_at).toBe("2026-06-11T19:00:00.000Z");
  });

  it("keeps team ids null and carries placeholders for a knockout match", () => {
    const row = matchToRow(knockoutMatch(), ids);
    expect(row.home_team_id).toBeNull();
    expect(row.away_team_id).toBeNull();
    expect(row.home_placeholder).toBe("2A");
    expect(row.away_placeholder).toBe("2B");
    expect(row.matchday).toBeNull();
  });

  it("falls back to null when a team ref is missing from the id map", () => {
    const row = matchToRow(groupMatch(), new Map());
    expect(row.home_team_id).toBeNull();
    expect(row.away_team_id).toBeNull();
  });

  it("maps score, finished status and resolved advancer/penalty winner", () => {
    const argentina: Team = {
      id: "",
      externalRef: "argentina",
      name: "Argentina",
      groupLabel: "A",
      flagUrl: null,
    };
    const finishedKo: Match = {
      ...knockoutMatch(),
      homeTeam: mexico,
      awayTeam: argentina,
      homePlaceholder: null,
      awayPlaceholder: null,
      status: "finished",
      homeScore: 1,
      awayScore: 1,
      penaltyWinnerTeam: argentina,
      advancerTeam: argentina,
    };
    const map = new Map<string, string>([
      ["mexico", "uuid-mexico"],
      ["argentina", "uuid-arg"],
    ]);
    const row = matchToRow(finishedKo, map);
    expect(row.home_score).toBe(1);
    expect(row.away_score).toBe(1);
    expect(row.status).toBe("finished");
    expect(row.penalty_winner_team_id).toBe("uuid-arg");
    expect(row.advancer_team_id).toBe("uuid-arg");
  });

  it("leaves score and result columns null for an unplayed match", () => {
    const row = matchToRow(groupMatch(), ids);
    expect(row.home_score).toBeNull();
    expect(row.away_score).toBeNull();
    expect(row.penalty_winner_team_id).toBeNull();
    expect(row.advancer_team_id).toBeNull();
    expect(row.status).toBe("scheduled");
  });

  it("omits placeholder fields when null so upsert preserves existing DB value (PRO-34 AC)", () => {
    // When a sync run resolves a knockout team, the domain Match has
    // homePlaceholder: null (team is now known). The row must NOT include
    // home_placeholder at all — otherwise the upsert overwrites the stored
    // "1A" / "W73" etc. with null, losing the original slot label.
    const argentina: Team = {
      id: "",
      externalRef: "argentina",
      name: "Argentina",
      groupLabel: "A",
      flagUrl: null,
    };
    const resolvedKo: Match = {
      ...knockoutMatch(),
      homeTeam: mexico,
      awayTeam: argentina,
      homePlaceholder: null, // team is now known — placeholder no longer on domain object
      awayPlaceholder: null,
      status: "scheduled",
    };
    const map = new Map<string, string>([
      ["mexico", "uuid-mexico"],
      ["argentina", "uuid-arg"],
    ]);
    const row = matchToRow(resolvedKo, map);
    expect(row.home_team_id).toBe("uuid-mexico");
    expect(row.away_team_id).toBe("uuid-arg");
    // Crucially: these fields must be absent from the row (undefined), not null.
    // Supabase upsert only writes columns present in the payload, so the DB's
    // existing "2A" / "2B" strings survive the sync untouched.
    expect("home_placeholder" in row).toBe(false);
    expect("away_placeholder" in row).toBe(false);
  });
});
