import { describe, expect, it } from "vitest";

import type { Match, Team } from "@/features/fixtures/entities/match";
import {
  computeStandings,
  resolveHeadToHead,
  selectBestThirds,
  type GroupStandings,
  type TeamStanding,
} from "@/features/tournament/entities/standings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function team(id: string, name: string, groupLabel: string | null = "A"): Team {
  return { id, externalRef: id, name, groupLabel, flagUrl: null };
}

const ARG = team("arg", "Argentina", "A");
const MEX = team("mex", "México", "A");
const POL = team("pol", "Polonia", "A");

function groupMatch(
  overrides: Partial<Match> & { homeTeam: Team; awayTeam: Team },
): Match {
  return {
    id: "m",
    externalRef: "ref",
    round: "group",
    multiplier: 1,
    matchday: 1,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date("2026-06-11T19:00:00.000Z"),
    status: "confirmed",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
    ...overrides,
  };
}

function rowFor(group: GroupStandings, teamId: string): TeamStanding {
  const row = group.rows.find((r) => r.team.id === teamId);
  if (!row) throw new Error(`no standings row for team ${teamId}`);
  return row;
}

// ---------------------------------------------------------------------------
// T1.1 — computeStandings: stats math + status filter
// ---------------------------------------------------------------------------

describe("computeStandings — Group Table Computation", () => {
  it("computes correct PJ/PG/PE/PP/GF/GC/DG/Pts from finished matches", () => {
    // ARG beats MEX 2-0 (finished)
    // ARG beats POL 1-0 (confirmed)
    // MEX draws POL 1-1 (finished)
    const matches: Match[] = [
      groupMatch({
        id: "m1",
        homeTeam: ARG,
        awayTeam: MEX,
        status: "finished",
        homeScore: 2,
        awayScore: 0,
      }),
      groupMatch({
        id: "m2",
        homeTeam: ARG,
        awayTeam: POL,
        status: "confirmed",
        homeScore: 1,
        awayScore: 0,
      }),
      groupMatch({
        id: "m3",
        homeTeam: MEX,
        awayTeam: POL,
        status: "finished",
        homeScore: 1,
        awayScore: 1,
      }),
    ];

    const standings = computeStandings(matches, [ARG, MEX, POL]);

    expect(standings).toHaveLength(1);
    const groupA = standings[0];
    expect(groupA.groupLabel).toBe("A");

    const argRow = rowFor(groupA, "arg");
    expect(argRow.pj).toBe(2);
    expect(argRow.pg).toBe(2);
    expect(argRow.pe).toBe(0);
    expect(argRow.pp).toBe(0);
    expect(argRow.gf).toBe(3);
    expect(argRow.gc).toBe(0);
    expect(argRow.dg).toBe(3);
    expect(argRow.pts).toBe(6);

    const mexRow = rowFor(groupA, "mex");
    expect(mexRow.pj).toBe(2);
    expect(mexRow.pg).toBe(0);
    expect(mexRow.pe).toBe(1);
    expect(mexRow.pp).toBe(1);
    expect(mexRow.gf).toBe(1);
    expect(mexRow.gc).toBe(3);
    expect(mexRow.dg).toBe(-2);
    expect(mexRow.pts).toBe(1);

    const polRow = rowFor(groupA, "pol");
    expect(polRow.pj).toBe(2);
    expect(polRow.pg).toBe(0);
    expect(polRow.pe).toBe(1);
    expect(polRow.pp).toBe(1);
    expect(polRow.gf).toBe(1);
    expect(polRow.gc).toBe(2);
    expect(polRow.dg).toBe(-1);
    expect(polRow.pts).toBe(1);
  });

  it("returns zero stats when all matches are scheduled (no eligible matches)", () => {
    const matches: Match[] = [
      groupMatch({
        id: "m1",
        homeTeam: ARG,
        awayTeam: MEX,
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      }),
    ];

    const standings = computeStandings(matches, [ARG, MEX]);

    const groupA = standings[0];
    const argRow = rowFor(groupA, "arg");
    expect(argRow.pj).toBe(0);
    expect(argRow.pts).toBe(0);
    expect(argRow.gf).toBe(0);
    expect(argRow.gc).toBe(0);
  });

  it("ignores scheduled matches when confirmed matches also exist (partial round)", () => {
    const matches: Match[] = [
      groupMatch({
        id: "scheduled",
        homeTeam: ARG,
        awayTeam: MEX,
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      }),
      groupMatch({
        id: "confirmed",
        homeTeam: ARG,
        awayTeam: POL,
        status: "confirmed",
        homeScore: 3,
        awayScore: 0,
      }),
    ];

    const standings = computeStandings(matches, [ARG, MEX, POL]);
    const groupA = standings[0];

    const argRow = rowFor(groupA, "arg");
    // only the confirmed match counts
    expect(argRow.pj).toBe(1);
    expect(argRow.pts).toBe(3);
    expect(argRow.gf).toBe(3);

    const mexRow = rowFor(groupA, "mex");
    // scheduled match not counted → MEX has 0
    expect(mexRow.pj).toBe(0);
  });

  it("returns an empty array when passed no matches and no teams", () => {
    expect(computeStandings([], [])).toEqual([]);
  });

  it("does NOT include non-group rounds in standings", () => {
    const knockoutMatch: Match = {
      id: "ko",
      externalRef: "ko",
      round: "r32",
      multiplier: 1,
      matchday: null,
      homeTeam: ARG,
      awayTeam: MEX,
      homePlaceholder: null,
      awayPlaceholder: null,
      kickoffAt: new Date("2026-06-28T19:00:00.000Z"),
      status: "confirmed",
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeam: null,
      advancerTeam: ARG,
      resultConfirmedAt: new Date("2026-06-28T21:00:00.000Z"),
    };

    const standings = computeStandings([knockoutMatch], [ARG, MEX]);
    // knockout match should be ignored; still returns group rows but with zero stats
    for (const g of standings) {
      for (const r of g.rows) {
        expect(r.pj).toBe(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// T1.2 — comparator: Pts → DG → GF → localeCompare
// ---------------------------------------------------------------------------

describe("computeStandings — Standings Ordering", () => {
  it("orders by points descending (clear points leader)", () => {
    const A = team("a", "Team A", "B");
    const B = team("b", "Team B", "B");
    const C = team("c", "Team C", "B");

    const matches: Match[] = [
      // A beats B 3-0 (confirmed) → A: 3pts, B: 0pts
      groupMatch({
        id: "m1",
        homeTeam: A,
        awayTeam: B,
        status: "confirmed",
        homeScore: 3,
        awayScore: 0,
      }),
      // A beats C 2-0 (confirmed) → A gets another win
      groupMatch({
        id: "m2",
        homeTeam: A,
        awayTeam: C,
        status: "confirmed",
        homeScore: 2,
        awayScore: 0,
      }),
      // B draws C 1-1 → each gets 1pt
      groupMatch({
        id: "m3",
        homeTeam: B,
        awayTeam: C,
        status: "confirmed",
        homeScore: 1,
        awayScore: 1,
      }),
    ];

    const standings = computeStandings(matches, [A, B, C]);
    const rows = standings[0].rows;

    // A first (6 pts), then B and C sorted by DG/GF/name
    expect(rows[0].team.id).toBe("a");
    expect(rows[0].pts).toBe(6);
  });

  it("breaks Pts tie by DG descending", () => {
    const X = team("x", "Team X", "C");
    const Y = team("y", "Team Y", "C");
    const Z = team("z", "Team Z", "C"); // absorbs losses

    // X beats Z 4-0 → X: 3pts, DG=+4, GF=4
    // Y beats Z 3-0 → Y: 3pts, DG=+3, GF=3
    const matches: Match[] = [
      groupMatch({
        id: "xz",
        homeTeam: X,
        awayTeam: Z,
        status: "confirmed",
        homeScore: 4,
        awayScore: 0,
      }),
      groupMatch({
        id: "yz",
        homeTeam: Y,
        awayTeam: Z,
        status: "confirmed",
        homeScore: 3,
        awayScore: 0,
      }),
    ];

    const standings = computeStandings(matches, [X, Y, Z]);
    const rows = standings[0].rows;

    expect(rows[0].team.id).toBe("x"); // X before Y (DG +4 > +3)
    expect(rows[1].team.id).toBe("y");
  });

  it("breaks Pts+DG tie by GF descending", () => {
    const P = team("p", "Team P", "D");
    const Q = team("q", "Team Q", "D");
    const R = team("r", "Team R", "D");

    // P beats R 3-1 → P: 3pts, DG=+2, GF=3
    // Q beats R 2-0 → Q: 3pts, DG=+2, GF=2
    const matches: Match[] = [
      groupMatch({
        id: "pr",
        homeTeam: P,
        awayTeam: R,
        status: "confirmed",
        homeScore: 3,
        awayScore: 1,
      }),
      groupMatch({
        id: "qr",
        homeTeam: Q,
        awayTeam: R,
        status: "confirmed",
        homeScore: 2,
        awayScore: 0,
      }),
    ];

    const standings = computeStandings(matches, [P, Q, R]);
    const rows = standings[0].rows;

    expect(rows[0].team.id).toBe("p"); // P before Q (GF 3 > 2, same DG)
    expect(rows[1].team.id).toBe("q");
  });

  it("falls back to alphabetical by team name when Pts, DG, and GF are all equal", () => {
    // Three teams all beat the same phantom opponent with the same scoreline:
    // "Zebra", "Alpha", "Mango" — all finish with same stats
    const Alpha = team("alpha", "Alpha", "E");
    const Mango = team("mango", "Mango", "E");
    const Zebra = team("zebra", "Zebra", "E");
    const Phantom = team("phantom", "Phantom", "E");

    // Each team beats Phantom 2-1 → all get 3pts, DG=+1, GF=2
    const matches: Match[] = [
      groupMatch({
        id: "ma",
        homeTeam: Alpha,
        awayTeam: Phantom,
        status: "confirmed",
        homeScore: 2,
        awayScore: 1,
      }),
      groupMatch({
        id: "mm",
        homeTeam: Mango,
        awayTeam: Phantom,
        status: "confirmed",
        homeScore: 2,
        awayScore: 1,
      }),
      groupMatch({
        id: "mz",
        homeTeam: Zebra,
        awayTeam: Phantom,
        status: "confirmed",
        homeScore: 2,
        awayScore: 1,
      }),
    ];

    const standings = computeStandings(matches, [Alpha, Mango, Zebra]);
    const rows = standings[0].rows;

    expect(rows.map((r) => r.team.name)).toEqual(["Alpha", "Mango", "Zebra"]);
  });
});

// ---------------------------------------------------------------------------
// T1.3 — resolveHeadToHead: seam exists, returns 0, not wired to computeStandings
// ---------------------------------------------------------------------------

describe("resolveHeadToHead — H2H seam", () => {
  it("exists as a separately callable pure function", () => {
    expect(typeof resolveHeadToHead).toBe("function");
  });

  it("returns 0 (seam not yet wired)", () => {
    const standing: TeamStanding = {
      team: ARG,
      pj: 2,
      pg: 1,
      pe: 1,
      pp: 0,
      gf: 3,
      gc: 1,
      dg: 2,
      pts: 4,
    };
    const result = resolveHeadToHead(standing, standing, []);
    expect(result).toBe(0);
  });

  it("does NOT affect computeStandings output — seam not called internally in v1", () => {
    // If computeStandings invoked resolveHeadToHead it could produce a different
    // tiebreaker than alphabetical. We verify the alphabetical fallback still applies,
    // confirming the seam is NOT wired.
    const Alpha = team("alpha", "Alpha", "F");
    const Zebra = team("zebra", "Zebra", "F");
    const Phantom = team("phantom", "Phantom", "F");

    const matches: Match[] = [
      groupMatch({
        id: "az",
        homeTeam: Alpha,
        awayTeam: Phantom,
        status: "confirmed",
        homeScore: 1,
        awayScore: 0,
      }),
      groupMatch({
        id: "zp",
        homeTeam: Zebra,
        awayTeam: Phantom,
        status: "confirmed",
        homeScore: 1,
        awayScore: 0,
      }),
    ];

    const standings = computeStandings(matches, [Alpha, Zebra]);
    const rows = standings[0].rows;

    // Alphabetical fallback: Alpha before Zebra
    expect(rows[0].team.id).toBe("alpha");
    expect(rows[1].team.id).toBe("zebra");
  });
});

// ---------------------------------------------------------------------------
// T1.4 — selectBestThirds
// ---------------------------------------------------------------------------

describe("selectBestThirds", () => {
  it("returns an empty array for empty standings input", () => {
    expect(selectBestThirds([])).toEqual([]);
  });

  it("returns an empty array when no group has at least 3 teams", () => {
    // A group with only 2 rows — no third-place team
    const standings: GroupStandings[] = [
      {
        groupLabel: "A",
        rows: [
          {
            team: ARG,
            pj: 3,
            pg: 3,
            pe: 0,
            pp: 0,
            gf: 6,
            gc: 0,
            dg: 6,
            pts: 9,
          },
          {
            team: MEX,
            pj: 3,
            pg: 1,
            pe: 0,
            pp: 2,
            gf: 2,
            gc: 5,
            dg: -3,
            pts: 3,
          },
        ],
      },
    ];
    expect(selectBestThirds(standings)).toEqual([]);
  });

  it("returns exactly 8 teams when all 12 groups have a third-placed team", () => {
    const groupLabels = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
    ];

    const standings: GroupStandings[] = groupLabels.map((label, i) => {
      const t1 = team(`${label}-1`, `Team ${label}1`, label);
      const t2 = team(`${label}-2`, `Team ${label}2`, label);
      const t3 = team(`${label}-3`, `Team ${label}3`, label);

      return {
        groupLabel: label,
        rows: [
          {
            team: t1,
            pj: 3,
            pg: 3,
            pe: 0,
            pp: 0,
            gf: 9,
            gc: 0,
            dg: 9,
            pts: 9,
          },
          {
            team: t2,
            pj: 3,
            pg: 2,
            pe: 0,
            pp: 1,
            gf: 6,
            gc: 3,
            dg: 3,
            pts: 6,
          },
          {
            team: t3,
            pj: 3,
            pg: 0,
            pe: 0,
            pp: 3,
            gf: 0,
            gc: 9,
            dg: -9,
            // Vary pts so we can confirm selection order
            pts: 10 - i, // groups A-H get pts 10..3; groups I-L get 2,1,0 etc → pick top 8
          },
        ],
      };
    });

    const result = selectBestThirds(standings);
    expect(result).toHaveLength(8);
  });

  it("orders selected thirds by Pts DESC → DG DESC → GF DESC", () => {
    // Build 3 groups each with a distinct third whose stats we control
    const t3A = team("t3a", "Third A", "A");
    const t3B = team("t3b", "Third B", "B");
    const t3C = team("t3c", "Third C", "C");

    const standings: GroupStandings[] = [
      {
        groupLabel: "A",
        rows: [
          {
            team: team("a1", "A1", "A"),
            pj: 3,
            pg: 3,
            pe: 0,
            pp: 0,
            gf: 9,
            gc: 0,
            dg: 9,
            pts: 9,
          },
          {
            team: team("a2", "A2", "A"),
            pj: 3,
            pg: 2,
            pe: 0,
            pp: 1,
            gf: 6,
            gc: 3,
            dg: 3,
            pts: 6,
          },
          {
            team: t3A,
            pj: 3,
            pg: 1,
            pe: 0,
            pp: 2,
            gf: 3,
            gc: 6,
            dg: -3,
            pts: 3,
          }, // 3pts, -3DG, 3GF
        ],
      },
      {
        groupLabel: "B",
        rows: [
          {
            team: team("b1", "B1", "B"),
            pj: 3,
            pg: 3,
            pe: 0,
            pp: 0,
            gf: 9,
            gc: 0,
            dg: 9,
            pts: 9,
          },
          {
            team: team("b2", "B2", "B"),
            pj: 3,
            pg: 2,
            pe: 0,
            pp: 1,
            gf: 6,
            gc: 3,
            dg: 3,
            pts: 6,
          },
          {
            team: t3B,
            pj: 3,
            pg: 1,
            pe: 0,
            pp: 2,
            gf: 4,
            gc: 6,
            dg: -2,
            pts: 3,
          }, // 3pts, -2DG, 4GF → better than A
        ],
      },
      {
        groupLabel: "C",
        rows: [
          {
            team: team("c1", "C1", "C"),
            pj: 3,
            pg: 3,
            pe: 0,
            pp: 0,
            gf: 9,
            gc: 0,
            dg: 9,
            pts: 9,
          },
          {
            team: team("c2", "C2", "C"),
            pj: 3,
            pg: 2,
            pe: 0,
            pp: 1,
            gf: 6,
            gc: 3,
            dg: 3,
            pts: 6,
          },
          {
            team: t3C,
            pj: 3,
            pg: 0,
            pe: 1,
            pp: 2,
            gf: 2,
            gc: 4,
            dg: -2,
            pts: 1,
          }, // 1pt → worst
        ],
      },
    ];

    const result = selectBestThirds(standings);

    // Only 3 thirds exist, so we get all 3; order: t3B (3pts,-2DG,4GF) → t3A (3pts,-3DG,3GF) → t3C (1pt)
    expect(result[0].team.id).toBe("t3b");
    expect(result[1].team.id).toBe("t3a");
    expect(result[2].team.id).toBe("t3c");
  });
});
