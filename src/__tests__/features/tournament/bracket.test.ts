import { describe, expect, it } from "vitest";

import type { Match, Round, Team } from "@/features/fixtures/entities/match";
import {
  buildBracket,
  deriveBracketWinner,
  formatPlaceholder,
  groupsForPlaceholder,
} from "@/features/tournament/entities/bracket";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function team(id: string, name: string): Team {
  return { id, externalRef: id, name, groupLabel: null, flagUrl: null };
}

const ARG = team("arg", "Argentina");
const BRA = team("bra", "Brasil");

function knockoutMatch(overrides: Partial<Match> & { round: Round }): Match {
  return {
    id: "m",
    externalRef: "ref",
    multiplier: 1,
    matchday: null,
    homeTeam: null,
    awayTeam: null,
    homePlaceholder: "1A",
    awayPlaceholder: "2B",
    kickoffAt: new Date("2026-06-28T19:00:00.000Z"),
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T2.1 — formatPlaceholder: all vocabulary
// ---------------------------------------------------------------------------

describe("formatPlaceholder — Placeholder Formatting", () => {
  it("formats group position 1 placeholder (e.g. '1A' → '1° Grupo A')", () => {
    expect(formatPlaceholder("1A")).toBe("1° Grupo A");
    expect(formatPlaceholder("1B")).toBe("1° Grupo B");
    expect(formatPlaceholder("1L")).toBe("1° Grupo L");
  });

  it("formats group position 2 placeholder (e.g. '2B' → '2° Grupo B')", () => {
    expect(formatPlaceholder("2B")).toBe("2° Grupo B");
    expect(formatPlaceholder("2C")).toBe("2° Grupo C");
  });

  it("formats best-third placeholder (e.g. '3A/B/C/D/F' → 'Mejor 3° (A/B/C/D/F)')", () => {
    expect(formatPlaceholder("3A/B/C/D/F")).toBe("Mejor 3° (A/B/C/D/F)");
    expect(formatPlaceholder("3E/F/G/H")).toBe("Mejor 3° (E/F/G/H)");
  });

  it("formats winner placeholder (e.g. 'W74' → 'Ganador P74')", () => {
    expect(formatPlaceholder("W74")).toBe("Ganador P74");
    expect(formatPlaceholder("W101")).toBe("Ganador P101");
  });

  it("formats loser placeholder (e.g. 'L101' → 'Perdedor P101')", () => {
    expect(formatPlaceholder("L101")).toBe("Perdedor P101");
    expect(formatPlaceholder("L74")).toBe("Perdedor P74");
  });

  it("returns the raw string unchanged when it matches no known pattern", () => {
    expect(formatPlaceholder("UNKNOWN")).toBe("UNKNOWN");
    expect(formatPlaceholder("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// groupsForPlaceholder — admin selector group filter
// ---------------------------------------------------------------------------

describe("groupsForPlaceholder — Slot Group Filter", () => {
  it("returns the single group for a 1st/2nd-place placeholder", () => {
    expect(groupsForPlaceholder("1J")).toEqual(["J"]);
    expect(groupsForPlaceholder("2H")).toEqual(["H"]);
    expect(groupsForPlaceholder("1A")).toEqual(["A"]);
  });

  it("returns every group for a best-third placeholder", () => {
    expect(groupsForPlaceholder("3A/B/C/D/F")).toEqual([
      "A",
      "B",
      "C",
      "D",
      "F",
    ]);
    expect(groupsForPlaceholder("3E/F/G/H")).toEqual(["E", "F", "G", "H"]);
  });

  it("returns null for winner/loser placeholders (any team can fill it)", () => {
    expect(groupsForPlaceholder("W74")).toBeNull();
    expect(groupsForPlaceholder("L101")).toBeNull();
  });

  it("returns null for unknown or empty placeholders (no filter)", () => {
    expect(groupsForPlaceholder("UNKNOWN")).toBeNull();
    expect(groupsForPlaceholder("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T2.2 — buildBracket: round grouping, slots, empty input
// ---------------------------------------------------------------------------

describe("buildBracket — Bracket Structure", () => {
  it("returns an empty array for empty match input", () => {
    expect(buildBracket([], [])).toEqual([]);
  });

  it("groups knockout matches by round in KNOCKOUT_ROUND_ORDER (R32 → R16 → QF → SF → third_place → Final)", () => {
    const matches: Match[] = [
      knockoutMatch({ id: "sf1", round: "sf" }),
      knockoutMatch({ id: "r32a", round: "r32" }),
      knockoutMatch({ id: "qf1", round: "qf" }),
      knockoutMatch({ id: "r16a", round: "r16" }),
      knockoutMatch({ id: "fin", round: "final" }),
      knockoutMatch({ id: "tp", round: "third_place" }),
    ];

    const bracket = buildBracket(matches, []);

    expect(bracket.map((r) => r.round)).toEqual([
      "r32",
      "r16",
      "qf",
      "sf",
      "third_place",
      "final",
    ]);
  });

  it("produces a 'team' slot when the team is resolved", () => {
    const match = knockoutMatch({
      id: "m1",
      round: "r16",
      homeTeam: ARG,
      awayTeam: BRA,
      homePlaceholder: null,
      awayPlaceholder: null,
    });

    const bracket = buildBracket([match], [ARG, BRA]);
    const bMatch = bracket[0].matches[0];

    expect(bMatch.home).toEqual({ kind: "team", team: ARG });
    expect(bMatch.away).toEqual({ kind: "team", team: BRA });
  });

  it("produces a 'placeholder' slot when teamId is null", () => {
    const match = knockoutMatch({
      id: "m2",
      round: "r32",
      homeTeam: null,
      awayTeam: null,
      homePlaceholder: "1A",
      awayPlaceholder: "2B",
    });

    const bracket = buildBracket([match], []);
    const bMatch = bracket[0].matches[0];

    expect(bMatch.home).toEqual({ kind: "placeholder", label: "1° Grupo A" });
    expect(bMatch.away).toEqual({ kind: "placeholder", label: "2° Grupo B" });
  });

  it("uses raw placeholder string when placeholder is null and team is also null", () => {
    const match = knockoutMatch({
      id: "m3",
      round: "qf",
      homeTeam: null,
      awayTeam: null,
      homePlaceholder: null,
      awayPlaceholder: null,
    });

    const bracket = buildBracket([match], []);
    const bMatch = bracket[0].matches[0];

    expect(bMatch.home.kind).toBe("placeholder");
    expect(bMatch.away.kind).toBe("placeholder");
  });

  it("uses formatPlaceholder for W/L raw placeholder strings", () => {
    const match = knockoutMatch({
      id: "m4",
      round: "sf",
      homeTeam: null,
      awayTeam: null,
      homePlaceholder: "W74",
      awayPlaceholder: "L101",
    });

    const bracket = buildBracket([match], []);
    const bMatch = bracket[0].matches[0];

    expect(bMatch.home).toEqual({ kind: "placeholder", label: "Ganador P74" });
    expect(bMatch.away).toEqual({
      kind: "placeholder",
      label: "Perdedor P101",
    });
  });

  it("includes the kickoffAt and status on each BracketMatch", () => {
    const kickoff = new Date("2026-06-28T19:00:00.000Z");
    const match = knockoutMatch({
      id: "m5",
      round: "final",
      homeTeam: ARG,
      awayTeam: BRA,
      kickoffAt: kickoff,
      status: "scheduled",
    });

    const bracket = buildBracket([match], [ARG, BRA]);
    const bMatch = bracket[0].matches[0];

    expect(bMatch.kickoffAt).toBe(kickoff.toISOString());
    expect(bMatch.status).toBe("scheduled");
  });

  it("ignores group-stage matches", () => {
    const groupMatchInput: Match = {
      id: "g1",
      externalRef: "g1",
      round: "group",
      multiplier: 1,
      matchday: 1,
      homeTeam: ARG,
      awayTeam: BRA,
      homePlaceholder: null,
      awayPlaceholder: null,
      kickoffAt: new Date("2026-06-11T19:00:00.000Z"),
      status: "confirmed",
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeam: null,
      advancerTeam: null,
      resultConfirmedAt: null,
    };

    const bracket = buildBracket([groupMatchInput], [ARG, BRA]);
    expect(bracket).toEqual([]);
  });

  it("orders matches within a round by kickoffAt ascending", () => {
    const matches: Match[] = [
      knockoutMatch({
        id: "late",
        round: "r32",
        kickoffAt: new Date("2026-06-28T22:00:00.000Z"),
      }),
      knockoutMatch({
        id: "early",
        round: "r32",
        kickoffAt: new Date("2026-06-28T16:00:00.000Z"),
      }),
    ];

    const bracket = buildBracket(matches, []);
    expect(bracket[0].matches.map((m) => m.id)).toEqual(["early", "late"]);
  });

  it("includes the round label on each BracketRound", () => {
    const match = knockoutMatch({ id: "m", round: "r16" });
    const bracket = buildBracket([match], []);

    expect(bracket[0].label).toBe("Octavos");
  });

  it("carries scores, winner and penalty flag onto each BracketMatch", () => {
    const match = knockoutMatch({
      id: "m6",
      round: "r16",
      homeTeam: ARG,
      awayTeam: BRA,
      homePlaceholder: null,
      awayPlaceholder: null,
      status: "confirmed",
      homeScore: 2,
      awayScore: 1,
      advancerTeam: ARG,
    });

    const bMatch = buildBracket([match], [ARG, BRA])[0].matches[0];

    expect(bMatch.homeScore).toBe(2);
    expect(bMatch.awayScore).toBe(1);
    expect(bMatch.winner).toBe("home");
    expect(bMatch.decidedByPenalties).toBe(false);
  });

  it("marks decidedByPenalties when a penalty winner is set", () => {
    const match = knockoutMatch({
      id: "m7",
      round: "qf",
      homeTeam: ARG,
      awayTeam: BRA,
      homePlaceholder: null,
      awayPlaceholder: null,
      status: "confirmed",
      homeScore: 1,
      awayScore: 1,
      penaltyWinnerTeam: BRA,
      advancerTeam: BRA,
    });

    const bMatch = buildBracket([match], [ARG, BRA])[0].matches[0];

    expect(bMatch.decidedByPenalties).toBe(true);
    expect(bMatch.winner).toBe("away");
  });
});

// ---------------------------------------------------------------------------
// deriveBracketWinner — advancer-first, score fallback
// ---------------------------------------------------------------------------

describe("deriveBracketWinner — advancer / score resolution", () => {
  it("prefers the persisted advancer (home side)", () => {
    expect(
      deriveBracketWinner(
        knockoutMatch({
          round: "sf",
          homeTeam: ARG,
          awayTeam: BRA,
          advancerTeam: ARG,
        }),
      ),
    ).toBe("home");
  });

  it("prefers the persisted advancer (away side), even with a level score", () => {
    expect(
      deriveBracketWinner(
        knockoutMatch({
          round: "sf",
          homeTeam: ARG,
          awayTeam: BRA,
          homeScore: 1,
          awayScore: 1,
          penaltyWinnerTeam: BRA,
          advancerTeam: BRA,
        }),
      ),
    ).toBe("away");
  });

  it("falls back to the higher score when no advancer is set", () => {
    expect(
      deriveBracketWinner(
        knockoutMatch({
          round: "r32",
          homeTeam: ARG,
          awayTeam: BRA,
          homeScore: 0,
          awayScore: 3,
        }),
      ),
    ).toBe("away");
  });

  it("returns null for a level score with no advancer", () => {
    expect(
      deriveBracketWinner(
        knockoutMatch({
          round: "r32",
          homeTeam: ARG,
          awayTeam: BRA,
          homeScore: 2,
          awayScore: 2,
        }),
      ),
    ).toBeNull();
  });

  it("returns null for a scheduled match (no scores, no advancer)", () => {
    expect(
      deriveBracketWinner(knockoutMatch({ round: "r32", status: "scheduled" })),
    ).toBeNull();
  });
});
