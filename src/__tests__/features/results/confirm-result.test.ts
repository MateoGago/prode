import { describe, expect, it } from "vitest";

import {
  type ConfirmedResult,
  type ScorablePrediction,
  scorePredictions,
} from "@/features/results/entities/confirm-result";

const groupResult: ConfirmedResult = {
  matchId: "m1",
  round: "group",
  homeScore: 2,
  awayScore: 1,
  advancerTeamId: null,
};

describe("scorePredictions — recompute all predictions for a match (REQ-RES-4)", () => {
  it("scores every prediction against the confirmed result", () => {
    const predictions: ScorablePrediction[] = [
      { id: "p-exact", homeScore: 2, awayScore: 1 },
      { id: "p-direction", homeScore: 3, awayScore: 0 },
      { id: "p-wrong", homeScore: 0, awayScore: 2 },
    ];

    expect(scorePredictions(predictions, groupResult)).toEqual([
      { id: "p-exact", pointsAwarded: 3 },
      { id: "p-direction", pointsAwarded: 1 },
      { id: "p-wrong", pointsAwarded: 0 },
    ]);
  });

  it("returns no scores when the match has no predictions", () => {
    expect(scorePredictions([], groupResult)).toEqual([]);
  });

  it("applies the round multiplier and ignores the advancer (KO-3)", () => {
    const koDraw: ConfirmedResult = {
      matchId: "m-qf",
      round: "qf",
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: "team-a",
    };
    const predictions: ScorablePrediction[] = [
      { id: "p-exact-draw", homeScore: 1, awayScore: 1 },
    ];
    // Exact ET draw in a QF → 3 × 3 = 9, regardless of the advancer.
    expect(scorePredictions(predictions, koDraw)).toEqual([
      { id: "p-exact-draw", pointsAwarded: 9 },
    ]);
  });
});

describe("scorePredictions — idempotency & re-confirm (SCORE-11, RES-4)", () => {
  const predictions: ScorablePrediction[] = [
    { id: "p1", homeScore: 2, awayScore: 1 },
    { id: "p2", homeScore: 1, awayScore: 1 },
  ];

  it("yields identical results when run repeatedly — no double-credit (SCORE-11)", () => {
    const first = scorePredictions(predictions, groupResult);
    const second = scorePredictions(predictions, groupResult);
    expect(first).toEqual([
      { id: "p1", pointsAwarded: 3 },
      { id: "p2", pointsAwarded: 0 },
    ]);
    expect(second).toEqual(first);
  });

  it("recomputes every prediction against a corrected score (RES-4)", () => {
    // (2,1) originally earned p1 an exact 3. Admin corrects the result to (1,1).
    const corrected: ConfirmedResult = {
      ...groupResult,
      homeScore: 1,
      awayScore: 1,
    };
    expect(scorePredictions(predictions, corrected)).toEqual([
      // p1 predicted (2,1): wrong direction vs a draw → 0 (was 3).
      { id: "p1", pointsAwarded: 0 },
      // p2 predicted (1,1): now the exact score → 3 (was 0).
      { id: "p2", pointsAwarded: 3 },
    ]);
  });
});
