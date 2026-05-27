import { describe, expect, it } from "vitest";

import {
  type ConfirmedResult,
  type ScorablePrediction,
  scorePredictions,
} from "@/features/results/entities/confirm-result";

// Integration (T-31): knockout scoring through the confirm-result use-case —
// calculatePoints (PRO-26) feeding scorePredictions (PRO-27). The per-tier and
// per-multiplier units live in scoring.test.ts; here we score a whole match's
// worth of predictions at once and pin the knockout rules: the 120' score
// decides points, the advancer never does (REQ-KO-3).

describe("knockout scoring integration (T-31)", () => {
  it("scores a QF non-draw batch by tier, scaled ×3", () => {
    const result: ConfirmedResult = {
      matchId: "m-qf",
      round: "qf",
      homeScore: 2,
      awayScore: 1,
      advancerTeamId: "team-home",
    };
    const predictions: ScorablePrediction[] = [
      { id: "exact", homeScore: 2, awayScore: 1 },
      { id: "direction", homeScore: 1, awayScore: 0 },
      { id: "wrong", homeScore: 0, awayScore: 2 },
    ];

    expect(scorePredictions(predictions, result)).toEqual([
      { id: "exact", pointsAwarded: 9 },
      { id: "direction", pointsAwarded: 3 },
      { id: "wrong", pointsAwarded: 0 },
    ]);
  });

  it("scores an SF level after 120' (decided on penalties) on the draw, ×4", () => {
    // advancerTeamId is the penalty winner — recorded, but it cannot move a score.
    const result: ConfirmedResult = {
      matchId: "m-sf",
      round: "sf",
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: "team-away",
    };
    const predictions: ScorablePrediction[] = [
      { id: "exact-draw", homeScore: 1, awayScore: 1 },
      { id: "other-draw", homeScore: 0, awayScore: 0 },
      { id: "picked-winner", homeScore: 2, awayScore: 1 },
    ];

    expect(scorePredictions(predictions, result)).toEqual([
      { id: "exact-draw", pointsAwarded: 12 },
      { id: "other-draw", pointsAwarded: 4 },
      { id: "picked-winner", pointsAwarded: 0 },
    ]);
  });

  it("scales the whole batch by the round multiplier — R32 ×1 vs final ×5", () => {
    const predictions: ScorablePrediction[] = [
      { id: "exact", homeScore: 2, awayScore: 1 },
      { id: "direction", homeScore: 3, awayScore: 1 },
    ];
    const base = {
      matchId: "m",
      homeScore: 2,
      awayScore: 1,
      advancerTeamId: null,
    };

    expect(scorePredictions(predictions, { ...base, round: "r32" })).toEqual([
      { id: "exact", pointsAwarded: 3 },
      { id: "direction", pointsAwarded: 1 },
    ]);
    expect(scorePredictions(predictions, { ...base, round: "final" })).toEqual([
      { id: "exact", pointsAwarded: 15 },
      { id: "direction", pointsAwarded: 5 },
    ]);
  });

  it("gives identical points no matter which team advanced (REQ-KO-3)", () => {
    const predictions: ScorablePrediction[] = [
      { id: "exact-draw", homeScore: 1, awayScore: 1 },
    ];
    const base = {
      matchId: "m-r16",
      round: "r16" as const,
      homeScore: 1,
      awayScore: 1,
    };

    const advancedHome = scorePredictions(predictions, {
      ...base,
      advancerTeamId: "team-home",
    });
    const advancedAway = scorePredictions(predictions, {
      ...base,
      advancerTeamId: "team-away",
    });

    expect(advancedHome).toEqual([{ id: "exact-draw", pointsAwarded: 6 }]);
    expect(advancedAway).toEqual(advancedHome);
  });
});
