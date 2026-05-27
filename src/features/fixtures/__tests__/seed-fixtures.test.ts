/**
 * Tests for the seedFixtures use-case.
 *
 * Uses mock implementations of MatchDataProvider and MatchesRepo.
 * No real HTTP calls, no database — pure logic verified in isolation.
 */
import { describe, expect, it, vi } from "vitest";
import type { Match, Team } from "../model";
import type { MatchDataProvider } from "../ports/match-data-provider";
import type { MatchesRepo } from "../ports/matches-repo";
import { seedFixtures } from "../use-case/seed-fixtures";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(externalRef: string, name: string): Team {
  return {
    id: "",
    externalRef,
    name,
    groupLabel: "A",
    flagUrl: null,
  };
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
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("seedFixtures", () => {
  it("calls upsertTeams with all unique teams from the fixture list", async () => {
    const teamA = makeTeam("10", "Argentina");
    const teamB = makeTeam("26", "France");
    const teamC = makeTeam("6", "Germany");

    const matches: Match[] = [
      makeMatch("101", teamA, teamB),
      makeMatch("102", teamA, teamC),
    ];

    const provider: MatchDataProvider = {
      getFixtures: vi.fn().mockResolvedValue(matches),
      getResults: vi.fn().mockResolvedValue([]),
    };

    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockResolvedValue(undefined),
      upsertMatches: vi.fn().mockResolvedValue(undefined),
    };

    await seedFixtures({ provider, repo });

    expect(repo.upsertTeams).toHaveBeenCalledOnce();
    const calledWithTeams = (repo.upsertTeams as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Team[];

    // All three unique teams must be present
    const refs = calledWithTeams.map((t) => t.externalRef).sort();
    expect(refs).toEqual(["10", "26", "6"]);
  });

  it("deduplicates teams that appear in multiple matches (same externalRef)", async () => {
    const teamA = makeTeam("10", "Argentina");
    const teamB = makeTeam("26", "France");

    // Same teamA appears in two matches
    const matches: Match[] = [
      makeMatch("101", teamA, teamB),
      makeMatch("102", teamA, makeTeam("5", "Brazil")),
    ];

    const provider: MatchDataProvider = {
      getFixtures: vi.fn().mockResolvedValue(matches),
      getResults: vi.fn().mockResolvedValue([]),
    };
    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockResolvedValue(undefined),
      upsertMatches: vi.fn().mockResolvedValue(undefined),
    };

    await seedFixtures({ provider, repo });

    const calledWithTeams = (repo.upsertTeams as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Team[];
    const refs = calledWithTeams.map((t) => t.externalRef);

    // Argentina (10) must appear only once despite being in two matches
    expect(refs.filter((r) => r === "10")).toHaveLength(1);
    expect(calledWithTeams).toHaveLength(3);
  });

  it("calls upsertMatches with all matches from the provider", async () => {
    const teamA = makeTeam("10", "Argentina");
    const teamB = makeTeam("26", "France");

    const matches: Match[] = [
      makeMatch("101", teamA, teamB),
      makeMatch("102", teamB, teamA),
    ];

    const provider: MatchDataProvider = {
      getFixtures: vi.fn().mockResolvedValue(matches),
      getResults: vi.fn().mockResolvedValue([]),
    };
    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockResolvedValue(undefined),
      upsertMatches: vi.fn().mockResolvedValue(undefined),
    };

    await seedFixtures({ provider, repo });

    expect(repo.upsertMatches).toHaveBeenCalledOnce();
    const calledWithMatches = (repo.upsertMatches as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as Match[];
    expect(calledWithMatches).toHaveLength(2);
  });

  it("upserts teams BEFORE matches (teams must exist for FK constraint)", async () => {
    const callOrder: string[] = [];

    const provider: MatchDataProvider = {
      getFixtures: vi
        .fn()
        .mockResolvedValue([
          makeMatch("101", makeTeam("1", "A"), makeTeam("2", "B")),
        ]),
      getResults: vi.fn().mockResolvedValue([]),
    };
    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockImplementation(async () => {
        callOrder.push("upsertTeams");
      }),
      upsertMatches: vi.fn().mockImplementation(async () => {
        callOrder.push("upsertMatches");
      }),
    };

    await seedFixtures({ provider, repo });

    expect(callOrder).toEqual(["upsertTeams", "upsertMatches"]);
  });

  it("skips null teams (placeholder knockout slots)", async () => {
    const placeholderMatch: Match = {
      id: "",
      externalRef: "900",
      round: "r32",
      multiplier: 1,
      matchday: null,
      homeTeam: null,
      awayTeam: null,
      homePlaceholder: "1A",
      awayPlaceholder: "2B",
      kickoffAt: new Date("2026-06-25T18:00:00Z"),
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      penaltyWinnerTeam: null,
      advancerTeam: null,
      resultConfirmedAt: null,
    };

    const provider: MatchDataProvider = {
      getFixtures: vi.fn().mockResolvedValue([placeholderMatch]),
      getResults: vi.fn().mockResolvedValue([]),
    };
    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockResolvedValue(undefined),
      upsertMatches: vi.fn().mockResolvedValue(undefined),
    };

    await seedFixtures({ provider, repo });

    // No teams to upsert (both null) — upsertTeams called with empty array
    const calledWithTeams = (repo.upsertTeams as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Team[];
    expect(calledWithTeams).toHaveLength(0);

    // Match itself is still upserted (placeholder matches are valid fixtures)
    const calledWithMatches = (repo.upsertMatches as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as Match[];
    expect(calledWithMatches).toHaveLength(1);
  });

  it("is idempotent: re-running with the same data does not throw", async () => {
    const teamA = makeTeam("10", "Argentina");
    const teamB = makeTeam("26", "France");
    const matches = [makeMatch("101", teamA, teamB)];

    const provider: MatchDataProvider = {
      getFixtures: vi.fn().mockResolvedValue(matches),
      getResults: vi.fn().mockResolvedValue([]),
    };
    const repo: MatchesRepo = {
      upsertTeams: vi.fn().mockResolvedValue(undefined),
      upsertMatches: vi.fn().mockResolvedValue(undefined),
    };

    // Run twice — should not throw (repo handles upsert idempotency)
    await expect(seedFixtures({ provider, repo })).resolves.toBeUndefined();
    await expect(seedFixtures({ provider, repo })).resolves.toBeUndefined();
  });
});
