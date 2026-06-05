import { describe, expect, it } from "vitest";

import {
  type ResolveSlotInput,
  validateResolveSlot,
} from "@/features/results/entities/resolve-slot";
import type { Match, Team } from "@/features/fixtures/entities/match";

// ── Minimal fixtures ──────────────────────────────────────────────────────────

function makeTeam(id: string, name = `Team ${id}`): Team {
  return {
    id,
    externalRef: id,
    name,
    groupLabel: null,
    flagUrl: null,
  };
}

const TEAM_A = makeTeam("team-a", "Argentina");
const TEAM_B = makeTeam("team-b", "Brasil");
const TEAM_C = makeTeam("team-c", "Chile");

const ALL_TEAMS: Team[] = [TEAM_A, TEAM_B, TEAM_C];

function makeMatch(
  overrides: Partial<Match> & Pick<Match, "id" | "round">,
): Match {
  return {
    externalRef: overrides.id,
    multiplier: 1,
    matchday: null,
    homeTeam: null,
    awayTeam: null,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date("2026-06-10T18:00:00Z"),
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
    ...overrides,
  };
}

const KNOCKOUT_MATCH = makeMatch({ id: "m-ko", round: "r16" });
const GROUP_MATCH = makeMatch({ id: "m-group", round: "group", matchday: 1 });

// ── T5.1 [RED] — spec scenarios: bracket-admin-resolution ────────────────────

describe("validateResolveSlot — Admin-Only spec scenarios", () => {
  it("rejects a group match (not_knockout)", () => {
    const input: ResolveSlotInput = {
      matchId: GROUP_MATCH.id,
      slot: "home",
      teamId: TEAM_A.id,
    };

    const result = validateResolveSlot(input, GROUP_MATCH, ALL_TEAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_knockout");
    }
  });

  it("rejects an unknown team (team_not_found)", () => {
    const input: ResolveSlotInput = {
      matchId: KNOCKOUT_MATCH.id,
      slot: "home",
      teamId: "team-zzz-does-not-exist",
    };

    const result = validateResolveSlot(input, KNOCKOUT_MATCH, ALL_TEAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("team_not_found");
    }
  });

  it("succeeds when assigning a team to an empty home slot", () => {
    const input: ResolveSlotInput = {
      matchId: KNOCKOUT_MATCH.id,
      slot: "home",
      teamId: TEAM_A.id,
    };

    const result = validateResolveSlot(input, KNOCKOUT_MATCH, ALL_TEAMS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.teamId).toBe(TEAM_A.id);
      expect(result.slot).toBe("home");
      expect(result.matchId).toBe(KNOCKOUT_MATCH.id);
    }
  });

  it("succeeds when assigning a team to an empty away slot", () => {
    const input: ResolveSlotInput = {
      matchId: KNOCKOUT_MATCH.id,
      slot: "away",
      teamId: TEAM_B.id,
    };

    const result = validateResolveSlot(input, KNOCKOUT_MATCH, ALL_TEAMS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slot).toBe("away");
      expect(result.teamId).toBe(TEAM_B.id);
    }
  });

  it("allows idempotent re-assign (same teamId as already set)", () => {
    const matchWithHome = makeMatch({
      id: "m-ko-2",
      round: "qf",
      homeTeam: TEAM_A,
    });
    const input: ResolveSlotInput = {
      matchId: matchWithHome.id,
      slot: "home",
      teamId: TEAM_A.id,
    };

    const result = validateResolveSlot(input, matchWithHome, ALL_TEAMS);

    expect(result.ok).toBe(true);
  });

  it("allows re-assigning to a different team (overwrite existing slot)", () => {
    const matchWithHome = makeMatch({
      id: "m-ko-3",
      round: "sf",
      homeTeam: TEAM_A,
    });
    const input: ResolveSlotInput = {
      matchId: matchWithHome.id,
      slot: "home",
      teamId: TEAM_B.id,
    };

    const result = validateResolveSlot(input, matchWithHome, ALL_TEAMS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.teamId).toBe(TEAM_B.id);
    }
  });

  it("validates all knockout rounds, not just r16", () => {
    const rounds = ["r32", "r16", "qf", "sf", "third_place", "final"] as const;

    for (const round of rounds) {
      const match = makeMatch({ id: `m-${round}`, round });
      const input: ResolveSlotInput = {
        matchId: match.id,
        slot: "home",
        teamId: TEAM_C.id,
      };
      const result = validateResolveSlot(input, match, ALL_TEAMS);
      expect(result.ok).toBe(true);
    }
  });
});
