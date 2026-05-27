import { describe, expect, it } from "vitest";

import type { ConfirmedResult } from "@/features/results/entities/confirm-result";
import {
  type PredictionScoreRow,
  resultToMatchUpdate,
  rowToScorablePrediction,
} from "@/features/results/entities/rows";

describe("rowToScorablePrediction", () => {
  it("maps a predictions row to the domain ScorablePrediction", () => {
    const row: PredictionScoreRow = {
      id: "p1",
      home_score: 2,
      away_score: 1,
    };
    expect(rowToScorablePrediction(row)).toEqual({
      id: "p1",
      homeScore: 2,
      awayScore: 1,
    });
  });
});

describe("resultToMatchUpdate", () => {
  const confirmedAt = new Date("2026-06-14T22:00:00.000Z");

  it("maps a confirmed result to the matches update row, status confirmed", () => {
    const result: ConfirmedResult = {
      matchId: "m1",
      round: "qf",
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: "team-a",
    };
    expect(resultToMatchUpdate(result, confirmedAt)).toEqual({
      status: "confirmed",
      home_score: 1,
      away_score: 1,
      advancer_team_id: "team-a",
      result_confirmed_at: confirmedAt.toISOString(),
    });
  });

  it("keeps a null advancer for non-knockout results", () => {
    const result: ConfirmedResult = {
      matchId: "m2",
      round: "group",
      homeScore: 2,
      awayScore: 0,
      advancerTeamId: null,
    };
    expect(
      resultToMatchUpdate(result, confirmedAt).advancer_team_id,
    ).toBeNull();
  });
});
