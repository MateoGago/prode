import { describe, expect, it } from "vitest";

import {
  type ConfirmableMatchRow,
  selectConfirmable,
} from "@/features/results/entities/auto-confirm";

const finished: ConfirmableMatchRow = {
  id: "m1",
  round: "group",
  status: "finished",
  home_score: 2,
  away_score: 1,
  advancer_team_id: null,
  result_confirmed_at: null,
};

describe("selectConfirmable — which finished matches to auto-confirm (RES-1)", () => {
  it("selects a finished, never-confirmed match and maps it to a ConfirmedResult", () => {
    expect(selectConfirmable([finished])).toEqual([
      {
        matchId: "m1",
        round: "group",
        homeScore: 2,
        awayScore: 1,
        advancerTeamId: null,
      },
    ]);
  });

  it("skips a match that was already confirmed — idempotent, no re-confirm (RES-1)", () => {
    const confirmed: ConfirmableMatchRow = {
      ...finished,
      result_confirmed_at: "2026-06-14T22:00:00.000Z",
    };
    expect(selectConfirmable([confirmed])).toEqual([]);
  });

  it("skips a confirmed match even if a re-sync clobbered its status back to finished", () => {
    const clobbered: ConfirmableMatchRow = {
      ...finished,
      status: "finished",
      result_confirmed_at: "2026-06-14T22:00:00.000Z",
    };
    expect(selectConfirmable([clobbered])).toEqual([]);
  });

  it("skips matches that have not finished", () => {
    expect(selectConfirmable([{ ...finished, status: "scheduled" }])).toEqual(
      [],
    );
  });

  it("skips a finished match with a missing score (defensive)", () => {
    expect(selectConfirmable([{ ...finished, home_score: null }])).toEqual([]);
  });

  it("carries the knockout advancer through to the result", () => {
    const ko: ConfirmableMatchRow = {
      ...finished,
      round: "qf",
      home_score: 1,
      away_score: 1,
      advancer_team_id: "team-a",
    };
    expect(selectConfirmable([ko])).toEqual([
      {
        matchId: "m1",
        round: "qf",
        homeScore: 1,
        awayScore: 1,
        advancerTeamId: "team-a",
      },
    ]);
  });

  it("returns nothing for an empty set", () => {
    expect(selectConfirmable([])).toEqual([]);
  });
});
