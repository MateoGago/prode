import { describe, expect, it } from "vitest";

import {
  collectUniqueTeams,
  type Match,
  type Team,
} from "@/features/fixtures/entities/match";

function makeTeam(externalRef: string, name: string): Team {
  return { id: "", externalRef, name, groupLabel: "A", flagUrl: null };
}

function makeMatch(
  externalRef: string,
  homeTeam: Team | null,
  awayTeam: Team | null,
): Match {
  return {
    id: "",
    externalRef,
    round: homeTeam ? "group" : "r32",
    multiplier: 1,
    matchday: homeTeam ? 1 : null,
    homeTeam,
    awayTeam,
    homePlaceholder: homeTeam ? null : "1A",
    awayPlaceholder: awayTeam ? null : "2B",
    kickoffAt: new Date("2026-06-11T18:00:00Z"),
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
  };
}

describe("collectUniqueTeams", () => {
  it("collects every unique team from the fixture list", () => {
    const teamA = makeTeam("10", "Argentina");
    const teamB = makeTeam("26", "France");
    const teamC = makeTeam("6", "Germany");

    const teams = collectUniqueTeams([
      makeMatch("101", teamA, teamB),
      makeMatch("102", teamA, teamC),
    ]);

    expect(teams.map((t) => t.externalRef).sort()).toEqual(["10", "26", "6"]);
  });

  it("deduplicates a team that appears in multiple matches", () => {
    const teamA = makeTeam("10", "Argentina");
    const teams = collectUniqueTeams([
      makeMatch("101", teamA, makeTeam("26", "France")),
      makeMatch("102", teamA, makeTeam("5", "Brazil")),
    ]);

    expect(teams.filter((t) => t.externalRef === "10")).toHaveLength(1);
    expect(teams).toHaveLength(3);
  });

  it("skips null teams (placeholder knockout slots)", () => {
    const teams = collectUniqueTeams([makeMatch("900", null, null)]);
    expect(teams).toHaveLength(0);
  });
});
