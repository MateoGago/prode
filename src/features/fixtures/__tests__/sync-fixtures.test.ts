/**
 * Tests for the syncFixtures use-case.
 *
 * Unlike seedFixtures, sync refreshes only matches (scores + resolved knockout
 * bracket). Teams are seeded once and never re-touched, so their localized
 * names and flags are never clobbered by a scheduled sync.
 */
import { describe, expect, it, vi } from "vitest";
import type { Match, Team } from "../model";
import type { MatchDataProvider } from "../ports/match-data-provider";
import type { MatchesRepo } from "../ports/matches-repo";
import { syncFixtures } from "../use-case/sync-fixtures";

function makeTeam(externalRef: string, name: string): Team {
  return { id: "", externalRef, name, groupLabel: "A", flagUrl: null };
}

function makeMatch(externalRef: string, homeTeam: Team, awayTeam: Team): Match {
  return {
    id: "",
    externalRef,
    round: "group",
    multiplier: 1,
    matchday: 1,
    homeTeam,
    awayTeam,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date("2026-06-11T18:00:00Z"),
    status: "finished",
    homeScore: 2,
    awayScore: 1,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
  };
}

describe("syncFixtures", () => {
  it("upserts matches but never touches teams", async () => {
    const matches = [
      makeMatch("101", makeTeam("ar", "Argentina"), makeTeam("fr", "Francia")),
    ];
    const provider: MatchDataProvider = {
      getFixtures: vi.fn().mockResolvedValue(matches),
      getResults: vi.fn().mockResolvedValue([]),
    };
    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockResolvedValue(undefined),
      upsertMatches: vi.fn().mockResolvedValue(undefined),
    };

    await syncFixtures({ provider, repo });

    expect(repo.upsertMatches).toHaveBeenCalledOnce();
    expect(repo.upsertTeams).not.toHaveBeenCalled();
  });

  it("passes every match (including resolved knockouts) to upsertMatches", async () => {
    const matches = [
      makeMatch("101", makeTeam("ar", "Argentina"), makeTeam("fr", "Francia")),
      makeMatch("ko-90", makeTeam("br", "Brasil"), makeTeam("de", "Alemania")),
    ];
    const provider: MatchDataProvider = {
      getFixtures: vi.fn().mockResolvedValue(matches),
      getResults: vi.fn().mockResolvedValue([]),
    };
    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockResolvedValue(undefined),
      upsertMatches: vi.fn().mockResolvedValue(undefined),
    };

    await syncFixtures({ provider, repo });

    const calledWith = (repo.upsertMatches as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Match[];
    expect(calledWith).toHaveLength(2);
  });

  it("is idempotent: re-running with the same data does not throw", async () => {
    const matches = [
      makeMatch("101", makeTeam("ar", "Argentina"), makeTeam("fr", "Francia")),
    ];
    const provider: MatchDataProvider = {
      getFixtures: vi.fn().mockResolvedValue(matches),
      getResults: vi.fn().mockResolvedValue([]),
    };
    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockResolvedValue(undefined),
      upsertMatches: vi.fn().mockResolvedValue(undefined),
    };

    await expect(syncFixtures({ provider, repo })).resolves.toBeUndefined();
    await expect(syncFixtures({ provider, repo })).resolves.toBeUndefined();
  });
});
