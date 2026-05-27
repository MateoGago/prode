import { describe, expect, it } from "vitest";

import worldcup2026 from "@/features/fixtures/entities/data/worldcup-2026.json";
import type { Round } from "@/features/fixtures/entities/match";
import {
  datasetToFixtures,
  datasetToResults,
  mapOpenFootballRound,
  type OpenFootballData,
  parseGroupLabel,
  parseKickoff,
  slugifyTeamName,
} from "@/features/fixtures/entities/openfootball";

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

describe("datasetToFixtures (against vendored 2026 data)", () => {
  const matches = datasetToFixtures(worldcup2026 as OpenFootballData);

  it("returns all 104 tournament matches", () => {
    expect(matches).toHaveLength(104);
  });

  it("has the correct round distribution", () => {
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

  it("derives 48 unique national teams, all with a group label", () => {
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

  it("maps a known group match with real teams, group label and matchday 1", () => {
    const opener = matches.find(
      (m) =>
        m.homeTeam?.externalRef === "mexico" &&
        m.awayTeam?.externalRef === "south-africa",
    );
    expect(opener).toBeDefined();
    expect(opener?.homeTeam?.name).toBe("México");
    expect(opener?.awayTeam?.name).toBe("Sudáfrica");
    expect(opener?.round).toBe("group");
    expect(opener?.matchday).toBe(1);
    expect(opener?.homeTeam?.groupLabel).toBe("A");
    expect(opener?.homePlaceholder).toBeNull();
    expect(opener?.status).toBe("scheduled");
    expect(opener?.kickoffAt.toISOString()).toBe("2026-06-11T19:00:00.000Z");
  });

  it("assigns every group match a matchday of 1-3, exactly two per round per group", () => {
    const groupMatches = matches.filter((m) => m.round === "group");

    for (const m of groupMatches) {
      expect(m.matchday).not.toBeNull();
      expect(m.matchday).toBeGreaterThanOrEqual(1);
      expect(m.matchday).toBeLessThanOrEqual(3);
    }

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

  it("maps knockout slots as placeholders with null teams and null matchday", () => {
    const ro32 = matches.filter((m) => m.round === "r32");
    for (const m of ro32) {
      expect(m.homeTeam).toBeNull();
      expect(m.awayTeam).toBeNull();
      expect(m.homePlaceholder).not.toBeNull();
      expect(m.awayPlaceholder).not.toBeNull();
      expect(m.matchday).toBeNull();
    }
  });

  it("assigns a stable, unique externalRef to every match", () => {
    const refs = new Set(matches.map((m) => m.externalRef));
    expect(refs.size).toBe(104);
  });

  it("gives every one of the 48 teams a Spanish name and a flagcdn flag", () => {
    const teams = new Map<string, { name: string; flagUrl: string | null }>();
    for (const m of matches) {
      for (const t of [m.homeTeam, m.awayTeam]) {
        if (t) teams.set(t.externalRef, { name: t.name, flagUrl: t.flagUrl });
      }
    }
    expect(teams.size).toBe(48);
    for (const [ref, { flagUrl }] of teams) {
      expect(flagUrl, `team "${ref}" has no flag`).toMatch(
        /^https:\/\/flagcdn\.com\//,
      );
    }
  });
});

describe("dataset transforms (synthetic live data)", () => {
  // Mirrors what openfootball publishes once matches are played and the bracket
  // resolves: scores appear, and knockout team1/team2 become real names.
  const liveData: OpenFootballData = {
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
        score: { ht: [1, 0], ft: [2, 1] },
      },
      {
        round: "Round of 16",
        num: 90,
        date: "2026-07-01",
        time: "15:00 UTC-4",
        team1: "Mexico",
        team2: "Argentina",
        ground: "y",
        score: { ht: [0, 1], ft: [1, 1], et: [1, 1], p: [2, 4] },
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
  const matches = datasetToFixtures(liveData);

  it("populates score and finished status for a played group match", () => {
    const m = matches.find((x) => x.round === "group");
    expect(m?.homeScore).toBe(2);
    expect(m?.awayScore).toBe(1);
    expect(m?.status).toBe("finished");
    expect(m?.advancerTeam).toBeNull(); // group stage has no advancer
  });

  it("resolves a knockout's real teams and the penalty advancer", () => {
    const ko = matches.find((x) => x.externalRef === "wc2026-ko-90");
    expect(ko?.homeTeam?.name).toBe("México");
    expect(ko?.awayTeam?.name).toBe("Argentina");
    expect(ko?.homePlaceholder).toBeNull();
    expect(ko?.homeScore).toBe(1);
    expect(ko?.awayScore).toBe(1);
    expect(ko?.penaltyWinnerTeam?.name).toBe("Argentina");
    expect(ko?.advancerTeam?.name).toBe("Argentina");
  });

  it("leaves an unplayed, unresolved knockout as scheduled placeholders", () => {
    const ko = matches.find((x) => x.externalRef === "wc2026-ko-91");
    expect(ko?.status).toBe("scheduled");
    expect(ko?.homeScore).toBeNull();
    expect(ko?.homeTeam).toBeNull();
    expect(ko?.homePlaceholder).toBe("3A");
  });

  it("datasetToResults returns only finished matches with resolved advancer refs", () => {
    const results = datasetToResults(liveData);
    expect(results).toHaveLength(2);
    const ko = results.find((r) => r.matchId === "wc2026-ko-90");
    expect(ko?.homeScore).toBe(1);
    expect(ko?.advancerId).toBe("argentina");
    expect(ko?.penaltyWinnerId).toBe("argentina");
  });
});
