/**
 * Tests for the pure mapping logic inside ApiFootballProvider.
 *
 * Strategy: test the exported mapping helpers directly (unit tests on pure functions).
 * The HTTP layer (fetch) is not tested here — integration tests would cover that,
 * but those require a live API key (out of scope for this slice).
 */
import { describe, expect, it } from "vitest";
import {
  mapApiFixtureToMatch,
  mapApiTeamToTeam,
  mapRoundLabel,
} from "../infra/api-football-provider";
import finishedGroupRaw from "./fixtures/api-football-finished-group-match.json";
// Load sample JSON fixtures
import groupMatchRaw from "./fixtures/api-football-group-match.json";
import knockoutPenaltyRaw from "./fixtures/api-football-knockout-penalty-match.json";
import r32PlaceholderRaw from "./fixtures/api-football-r32-placeholder.json";

// ---- mapRoundLabel --------------------------------------------------------

describe("mapRoundLabel", () => {
  it('maps "Group Stage - 1" to "group"', () => {
    expect(mapRoundLabel("Group Stage - 1")).toBe("group");
  });

  it('maps "Group Stage - 3" to "group"', () => {
    expect(mapRoundLabel("Group Stage - 3")).toBe("group");
  });

  it('maps "Round of 32" to "r32"', () => {
    expect(mapRoundLabel("Round of 32")).toBe("r32");
  });

  it('maps "Round of 16" to "r16"', () => {
    expect(mapRoundLabel("Round of 16")).toBe("r16");
  });

  it('maps "Quarter-finals" to "qf"', () => {
    expect(mapRoundLabel("Quarter-finals")).toBe("qf");
  });

  it('maps "Semi-finals" to "sf"', () => {
    expect(mapRoundLabel("Semi-finals")).toBe("sf");
  });

  it('maps "3rd Place Final" to "third_place"', () => {
    expect(mapRoundLabel("3rd Place Final")).toBe("third_place");
  });

  it('maps "Final" to "final"', () => {
    expect(mapRoundLabel("Final")).toBe("final");
  });

  it("throws on an unknown round label", () => {
    expect(() => mapRoundLabel("Unknown Round")).toThrow();
  });
});

// ---- mapApiTeamToTeam ----------------------------------------------------

describe("mapApiTeamToTeam", () => {
  it("maps a home team with a real id", () => {
    const team = mapApiTeamToTeam(groupMatchRaw.teams.home);
    expect(team).not.toBeNull();
    expect(team?.externalRef).toBe("1570");
    expect(team?.name).toBe("Mexico");
    expect(team?.flagUrl).toBe(
      "https://media.api-sports.io/football/teams/1570.png",
    );
  });

  it("returns null when team id is null (placeholder slot)", () => {
    const team = mapApiTeamToTeam(r32PlaceholderRaw.teams.home);
    expect(team).toBeNull();
  });
});

// ---- mapApiFixtureToMatch ------------------------------------------------

describe("mapApiFixtureToMatch", () => {
  it("maps a scheduled group-stage match correctly", () => {
    const match = mapApiFixtureToMatch(groupMatchRaw);

    expect(match.externalRef).toBe("1035739");
    expect(match.round).toBe("group");
    expect(match.multiplier).toBe(1);
    expect(match.matchday).toBe(1);
    expect(match.status).toBe("scheduled");
    expect(match.homeScore).toBeNull();
    expect(match.awayScore).toBeNull();
    expect(match.penaltyWinnerTeam).toBeNull();
    expect(match.advancerTeam).toBeNull();
    expect(match.kickoffAt).toEqual(new Date("2026-06-11T18:00:00+00:00"));
    expect(match.homeTeam?.externalRef).toBe("1570");
    expect(match.awayTeam?.externalRef).toBe("6");
  });

  it("maps a finished group-stage match with scores", () => {
    const match = mapApiFixtureToMatch(finishedGroupRaw);

    expect(match.externalRef).toBe("1035740");
    expect(match.status).toBe("finished");
    expect(match.homeScore).toBe(2);
    expect(match.awayScore).toBe(0);
    expect(match.penaltyWinnerTeam).toBeNull();
    expect(match.advancerTeam).toBeNull();
  });

  it("maps a knockout match decided by penalties", () => {
    const match = mapApiFixtureToMatch(knockoutPenaltyRaw);

    expect(match.round).toBe("r16");
    expect(match.multiplier).toBe(2);
    expect(match.matchday).toBeNull();
    expect(match.status).toBe("finished");
    // Score is ET score (2-2), not including penalty shootout goals
    expect(match.homeScore).toBe(2);
    expect(match.awayScore).toBe(2);
    // The team with winner=true is the penalty winner
    expect(match.penaltyWinnerTeam?.externalRef).toBe("10"); // Argentina
    expect(match.advancerTeam?.externalRef).toBe("10");
  });

  it("maps a Round of 32 placeholder match (null team ids)", () => {
    const match = mapApiFixtureToMatch(r32PlaceholderRaw);

    expect(match.round).toBe("r32");
    expect(match.multiplier).toBe(1);
    expect(match.matchday).toBeNull();
    // Teams are null; placeholder strings carry the slot labels
    expect(match.homeTeam).toBeNull();
    expect(match.awayTeam).toBeNull();
    expect(match.homePlaceholder).toBe("1A");
    expect(match.awayPlaceholder).toBe("2B");
  });
});
