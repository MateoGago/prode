import { describe, expect, it } from "vitest";

import {
  decideSave,
  isPredictionOpen,
  type MatchContext,
  type MatchKickoffContext,
  type UpsertPredictionInput,
  validatePrediction,
} from "@/features/predictions/entities/prediction";

describe("isPredictionOpen (REQ-PRED-3, lock at kickoff)", () => {
  const kickoff = new Date("2026-06-11T19:00:00.000Z");

  it("is open before kickoff", () => {
    expect(
      isPredictionOpen(kickoff, new Date("2026-06-11T18:59:59.000Z")),
    ).toBe(true);
  });

  it("is closed exactly at kickoff (now >= kickoff)", () => {
    expect(isPredictionOpen(kickoff, kickoff)).toBe(false);
  });

  it("is closed after kickoff", () => {
    expect(
      isPredictionOpen(kickoff, new Date("2026-06-11T19:00:01.000Z")),
    ).toBe(false);
  });
});

describe("validatePrediction", () => {
  const group: MatchContext = {
    round: "group",
    homeTeamId: "team-a",
    awayTeamId: "team-b",
  };
  const knockout: MatchContext = {
    round: "r16",
    homeTeamId: "team-a",
    awayTeamId: "team-b",
  };

  it("accepts a valid group prediction without an advancer", () => {
    expect(
      validatePrediction(
        { homeScore: 2, awayScore: 1, advancerTeamId: null },
        group,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects negative scores", () => {
    expect(
      validatePrediction(
        { homeScore: -1, awayScore: 0, advancerTeamId: null },
        group,
      ),
    ).toEqual({ ok: false, reason: "negative_score" });
  });

  it("rejects non-integer scores", () => {
    expect(
      validatePrediction(
        { homeScore: 1.5, awayScore: 0, advancerTeamId: null },
        group,
      ),
    ).toEqual({ ok: false, reason: "non_integer_score" });
  });

  it("rejects an advancer on a group prediction (REQ-PRED-2)", () => {
    expect(
      validatePrediction(
        { homeScore: 1, awayScore: 1, advancerTeamId: "team-a" },
        group,
      ),
    ).toEqual({ ok: false, reason: "advancer_not_allowed" });
  });

  it("requires an advancer for a knockout draw (KO-2)", () => {
    expect(
      validatePrediction(
        { homeScore: 1, awayScore: 1, advancerTeamId: null },
        knockout,
      ),
    ).toEqual({ ok: false, reason: "advancer_required" });
  });

  it("accepts a knockout draw with an advancer that competes", () => {
    expect(
      validatePrediction(
        { homeScore: 1, awayScore: 1, advancerTeamId: "team-b" },
        knockout,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects an advancer that is not one of the two teams", () => {
    expect(
      validatePrediction(
        { homeScore: 1, awayScore: 1, advancerTeamId: "team-x" },
        knockout,
      ),
    ).toEqual({ ok: false, reason: "advancer_not_competing" });
  });

  it("accepts a knockout non-draw and forbids an advancer (KO-3/KO-4)", () => {
    expect(
      validatePrediction(
        { homeScore: 2, awayScore: 1, advancerTeamId: null },
        knockout,
      ),
    ).toEqual({ ok: true });
    expect(
      validatePrediction(
        { homeScore: 2, awayScore: 1, advancerTeamId: "team-a" },
        knockout,
      ),
    ).toEqual({ ok: false, reason: "advancer_not_allowed" });
  });
});

describe("decideSave (orchestration decision, pure)", () => {
  const KICKOFF = new Date("2026-06-11T19:00:00.000Z");
  const BEFORE = new Date("2026-06-11T18:00:00.000Z");
  const AFTER = new Date("2026-06-11T20:00:00.000Z");

  const groupContext: MatchKickoffContext = {
    round: "group",
    homeTeamId: "team-a",
    awayTeamId: "team-b",
    kickoffAt: KICKOFF,
  };
  const groupInput: UpsertPredictionInput = {
    userId: "u1",
    matchId: "m1",
    homeScore: 2,
    awayScore: 1,
    advancerTeamId: null,
  };

  it("allows a valid group prediction before kickoff", () => {
    expect(decideSave(groupInput, groupContext, BEFORE)).toEqual({ ok: true });
  });

  it("fails when the match does not exist", () => {
    expect(decideSave(groupInput, null, BEFORE)).toEqual({
      ok: false,
      reason: "match_not_found",
    });
  });

  it("locks once the match has kicked off", () => {
    expect(decideSave(groupInput, groupContext, AFTER)).toEqual({
      ok: false,
      reason: "locked",
    });
  });

  it("surfaces the shape error for an invalid knockout draw", () => {
    const knockoutContext: MatchKickoffContext = {
      round: "r16",
      homeTeamId: "team-a",
      awayTeamId: "team-b",
      kickoffAt: KICKOFF,
    };
    expect(
      decideSave(
        { ...groupInput, homeScore: 1, awayScore: 1, advancerTeamId: null },
        knockoutContext,
        BEFORE,
      ),
    ).toEqual({ ok: false, reason: "advancer_required" });
  });
});
