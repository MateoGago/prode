import { describe, expect, it } from "vitest";
import {
  mapOpenFootballRound,
  parseGroupLabel,
  parseKickoff,
  StaticFixtureProvider,
  slugifyTeamName,
} from "../infra/openfootball-provider";
import type { Round } from "../model";

describe("mapOpenFootballRound", () => {
  it("maps every group matchday to 'group'", () => {
    expect(mapOpenFootballRound("Matchday 1")).toBe("group");
    expect(mapOpenFootballRound("Matchday 8")).toBe("group");
    expect(mapOpenFootballRound("Matchday 17")).toBe("group");
  });

  it("maps knockout labels to domain rounds", () => {
    const cases: Array<[string, Round]> = [
      ["Round of 32", "r32"],
      ["Round of 16", "r16"],
      ["Quarter-final", "qf"],
      ["Semi-final", "sf"],
      ["Match for third place", "third_place"],
      ["Final", "final"],
    ];
    for (const [label, expected] of cases) {
      expect(mapOpenFootballRound(label)).toBe(expected);
    }
  });

  it("throws on an unknown round label", () => {
    expect(() => mapOpenFootballRound("Quarterfinals")).toThrow();
  });
});

describe("parseKickoff", () => {
  it("converts a local time with negative offset to a UTC instant", () => {
    // 13:00 in UTC-6 is 19:00 UTC.
    expect(parseKickoff("2026-06-11", "13:00 UTC-6").toISOString()).toBe(
      "2026-06-11T19:00:00.000Z",
    );
  });

  it("handles half-hour times and single-digit offsets", () => {
    expect(parseKickoff("2026-06-29", "16:30 UTC-4").toISOString()).toBe(
      "2026-06-29T20:30:00.000Z",
    );
    expect(parseKickoff("2026-06-13", "12:00 UTC-7").toISOString()).toBe(
      "2026-06-13T19:00:00.000Z",
    );
  });
});

describe("slugifyTeamName", () => {
  it("lowercases, strips punctuation and joins with hyphens", () => {
    expect(slugifyTeamName("South Korea")).toBe("south-korea");
    expect(slugifyTeamName("Bosnia & Herzegovina")).toBe("bosnia-herzegovina");
    expect(slugifyTeamName("Côte d'Ivoire")).toBe("cote-divoire");
  });
});

describe("parseGroupLabel", () => {
  it("extracts the single-letter group label", () => {
    expect(parseGroupLabel("Group A")).toBe("A");
    expect(parseGroupLabel("Group L")).toBe("L");
  });
});

describe("StaticFixtureProvider.getFixtures (against vendored 2026 data)", () => {
  const provider = new StaticFixtureProvider();

  it("returns all 104 tournament matches", async () => {
    const matches = await provider.getFixtures();
    expect(matches).toHaveLength(104);
  });

  it("has the correct round distribution", async () => {
    const matches = await provider.getFixtures();
    const counts = matches.reduce<Record<string, number>>((acc, m) => {
      acc[m.round] = (acc[m.round] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({
      group: 72,
      r32: 16,
      r16: 8,
      qf: 4,
      sf: 2,
      third_place: 1,
      final: 1,
    });
  });

  it("derives 48 unique national teams, all with a group label", async () => {
    const matches = await provider.getFixtures();
    const teams = new Map<string, string | null>();
    for (const m of matches) {
      if (m.homeTeam) teams.set(m.homeTeam.externalRef, m.homeTeam.groupLabel);
      if (m.awayTeam) teams.set(m.awayTeam.externalRef, m.awayTeam.groupLabel);
    }
    expect(teams.size).toBe(48);
    for (const groupLabel of teams.values()) {
      expect(groupLabel).not.toBeNull();
    }
  });

  it("maps a known group match with real teams, group label and matchday 1", async () => {
    const matches = await provider.getFixtures();
    const opener = matches.find(
      (m) =>
        m.homeTeam?.name === "Mexico" && m.awayTeam?.name === "South Africa",
    );
    expect(opener).toBeDefined();
    expect(opener?.round).toBe("group");
    expect(opener?.matchday).toBe(1);
    expect(opener?.homeTeam?.groupLabel).toBe("A");
    expect(opener?.homePlaceholder).toBeNull();
    expect(opener?.status).toBe("scheduled");
    expect(opener?.kickoffAt.toISOString()).toBe("2026-06-11T19:00:00.000Z");
  });

  it("assigns every group match a matchday of 1-3, exactly two per round per group", async () => {
    const matches = await provider.getFixtures();
    const groupMatches = matches.filter((m) => m.round === "group");

    for (const m of groupMatches) {
      expect(m.matchday).not.toBeNull();
      expect(m.matchday).toBeGreaterThanOrEqual(1);
      expect(m.matchday).toBeLessThanOrEqual(3);
    }

    // 12 groups × 3 matchdays, two matches each.
    const counts = new Map<string, number>();
    for (const m of groupMatches) {
      const group = m.homeTeam?.groupLabel ?? m.awayTeam?.groupLabel;
      const key = `${group}-${m.matchday}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(36);
    for (const count of counts.values()) {
      expect(count).toBe(2);
    }
  });

  it("maps knockout slots as placeholders with null teams and null matchday", async () => {
    const matches = await provider.getFixtures();
    const ro32 = matches.filter((m) => m.round === "r32");
    for (const m of ro32) {
      expect(m.homeTeam).toBeNull();
      expect(m.awayTeam).toBeNull();
      expect(m.homePlaceholder).not.toBeNull();
      expect(m.awayPlaceholder).not.toBeNull();
      expect(m.matchday).toBeNull();
    }
  });

  it("assigns a stable, unique externalRef to every match", async () => {
    const matches = await provider.getFixtures();
    const refs = new Set(matches.map((m) => m.externalRef));
    expect(refs.size).toBe(104);
  });
});

describe("StaticFixtureProvider results mapping (synthetic live data)", () => {
  // Mirrors what openfootball publishes once matches are played and the bracket
  // resolves: scores appear, and knockout team1/team2 become real names.
  const liveData = {
    name: "test",
    matches: [
      {
        round: "Matchday 1",
        date: "2026-06-11",
        time: "13:00 UTC-6",
        team1: "Mexico",
        team2: "Argentina",
        group: "Group A",
        ground: "x",
        score: {
          ht: [1, 0] as [number, number],
          ft: [2, 1] as [number, number],
        },
      },
      {
        round: "Round of 16",
        num: 90,
        date: "2026-07-01",
        time: "15:00 UTC-4",
        team1: "Mexico",
        team2: "Argentina",
        ground: "y",
        score: {
          ht: [0, 1] as [number, number],
          ft: [1, 1] as [number, number],
          et: [1, 1] as [number, number],
          p: [2, 4] as [number, number],
        },
      },
      {
        round: "Round of 16",
        num: 91,
        date: "2026-07-01",
        time: "19:00 UTC-4",
        team1: "3A",
        team2: "3B",
        ground: "z",
      },
    ],
  };
  const provider = new StaticFixtureProvider(liveData);

  it("populates score and finished status for a played group match", async () => {
    const matches = await provider.getFixtures();
    const m = matches.find((x) => x.round === "group");
    expect(m?.homeScore).toBe(2);
    expect(m?.awayScore).toBe(1);
    expect(m?.status).toBe("finished");
    expect(m?.advancerTeam).toBeNull(); // group stage has no advancer
  });

  it("resolves a knockout's real teams and the penalty advancer", async () => {
    const matches = await provider.getFixtures();
    const ko = matches.find((x) => x.externalRef === "wc2026-ko-90");
    // Teams resolved from real names, no placeholders.
    expect(ko?.homeTeam?.name).toBe("Mexico");
    expect(ko?.awayTeam?.name).toBe("Argentina");
    expect(ko?.homePlaceholder).toBeNull();
    // Score is the 120' result, excluding penalties.
    expect(ko?.homeScore).toBe(1);
    expect(ko?.awayScore).toBe(1);
    // Argentina won the shootout 4-2, so it is both penalty winner and advancer.
    expect(ko?.penaltyWinnerTeam?.name).toBe("Argentina");
    expect(ko?.advancerTeam?.name).toBe("Argentina");
  });

  it("leaves an unplayed, unresolved knockout as scheduled placeholders", async () => {
    const matches = await provider.getFixtures();
    const ko = matches.find((x) => x.externalRef === "wc2026-ko-91");
    expect(ko?.status).toBe("scheduled");
    expect(ko?.homeScore).toBeNull();
    expect(ko?.homeTeam).toBeNull();
    expect(ko?.homePlaceholder).toBe("3A");
  });

  it("getResults returns only finished matches with resolved advancer refs", async () => {
    const results = await provider.getResults();
    expect(results).toHaveLength(2); // the two played matches
    const ko = results.find((r) => r.matchId === "wc2026-ko-90");
    expect(ko?.homeScore).toBe(1);
    expect(ko?.advancerId).toBe("argentina");
    expect(ko?.penaltyWinnerId).toBe("argentina");
  });
});
