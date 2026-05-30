/**
 * D-8: hit-type badge + multiplier fields in the breakdown mapper.
 * Tests the NEW fields added to MatchBreakdownItem without replacing the
 * existing mapper tests (which still cover the base shape).
 */

import { describe, expect, it } from "vitest";

import {
  mapMatchBreakdown,
  type BreakdownPredictionRow,
} from "@/features/leaderboard/entities/match-breakdown";

const makeRow = (
  overrides: Partial<BreakdownPredictionRow> = {},
): BreakdownPredictionRow => ({
  match_id: "m1",
  home_score: 2,
  away_score: 1,
  points_awarded: 3,
  match: {
    home_score: 2,
    away_score: 1,
    multiplier: 1,
    home_team: { name: "Argentina" },
    away_team: { name: "Brazil" },
  },
  ...overrides,
});

describe("mapMatchBreakdown — hit type badge (D-8)", () => {
  it("classifies an exact score prediction as 'exact'", () => {
    const [item] = mapMatchBreakdown([
      makeRow({
        home_score: 2,
        away_score: 1,
        match: {
          home_score: 2,
          away_score: 1,
          multiplier: 1,
          home_team: { name: "A" },
          away_team: { name: "B" },
        },
      }),
    ]);
    expect(item.hitType).toBe("exact");
  });

  it("classifies a correct winner (wrong score) as 'winner'", () => {
    const [item] = mapMatchBreakdown([
      makeRow({
        home_score: 1,
        away_score: 0,
        match: {
          home_score: 3,
          away_score: 0,
          multiplier: 1,
          home_team: { name: "A" },
          away_team: { name: "B" },
        },
      }),
    ]);
    expect(item.hitType).toBe("winner");
  });

  it("classifies two different draws (same outcome) as 'winner'", () => {
    const [item] = mapMatchBreakdown([
      makeRow({
        home_score: 0,
        away_score: 0,
        match: {
          home_score: 1,
          away_score: 1,
          multiplier: 1,
          home_team: { name: "A" },
          away_team: { name: "B" },
        },
      }),
    ]);
    expect(item.hitType).toBe("winner");
  });

  it("classifies a wrong outcome as 'miss'", () => {
    const [item] = mapMatchBreakdown([
      makeRow({
        home_score: 1,
        away_score: 0,
        match: {
          home_score: 0,
          away_score: 2,
          multiplier: 1,
          home_team: { name: "A" },
          away_team: { name: "B" },
        },
      }),
    ]);
    expect(item.hitType).toBe("miss");
  });

  it("passes the multiplier from the match to the breakdown item", () => {
    const [item] = mapMatchBreakdown([
      makeRow({
        match: {
          home_score: 1,
          away_score: 0,
          multiplier: 3,
          home_team: { name: "A" },
          away_team: { name: "B" },
        },
      }),
    ]);
    expect(item.multiplier).toBe(3);
  });

  it("defaults multiplier to 1 when the match row does not carry it", () => {
    const row: BreakdownPredictionRow = {
      match_id: "m2",
      home_score: 1,
      away_score: 0,
      points_awarded: 1,
      match: {
        home_score: 2,
        away_score: 0,
        // multiplier intentionally absent
        home_team: { name: "A" },
        away_team: { name: "B" },
      },
    };
    const [item] = mapMatchBreakdown([row]);
    expect(item.multiplier).toBe(1);
  });
});

describe("mapMatchBreakdown — multiplier display chip (D-8)", () => {
  it("emits multiplier > 1 so the UI can show the ×N chip", () => {
    const [item] = mapMatchBreakdown([
      makeRow({
        match: {
          home_score: 0,
          away_score: 0,
          multiplier: 5,
          home_team: { name: "A" },
          away_team: { name: "B" },
        },
      }),
    ]);
    expect(item.multiplier).toBeGreaterThan(1);
    expect(item.multiplier).toBe(5);
  });
});
