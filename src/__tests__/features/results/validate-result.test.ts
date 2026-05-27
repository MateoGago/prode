import { describe, expect, it } from "vitest";

import {
  type ResultInput,
  type ResultMatchContext,
  validateResultInput,
} from "@/features/results/entities/confirm-result";

const group: ResultMatchContext = {
  round: "group",
  homeTeamId: "team-a",
  awayTeamId: "team-b",
};
const knockout: ResultMatchContext = {
  round: "r16",
  homeTeamId: "team-a",
  awayTeamId: "team-b",
};

const baseInput: ResultInput = {
  matchId: "m1",
  homeScore: 2,
  awayScore: 1,
  advancerTeamId: null,
};

describe("validateResultInput — admin-entered final score (server-side, REQ-XCUT-5)", () => {
  it("accepts a valid group result without an advancer", () => {
    expect(validateResultInput(baseInput, group)).toEqual({ ok: true });
  });

  it("rejects negative scores", () => {
    expect(validateResultInput({ ...baseInput, homeScore: -1 }, group)).toEqual(
      { ok: false, reason: "negative_score" },
    );
  });

  it("rejects non-integer scores", () => {
    expect(
      validateResultInput({ ...baseInput, awayScore: 1.5 }, group),
    ).toEqual({ ok: false, reason: "non_integer_score" });
  });

  it("rejects an advancer on a group result (groups have no advancer)", () => {
    expect(
      validateResultInput({ ...baseInput, advancerTeamId: "team-a" }, group),
    ).toEqual({ ok: false, reason: "advancer_not_allowed" });
  });

  it("requires an advancer for a knockout draw (REQ-RES-3, penalty winner)", () => {
    expect(
      validateResultInput(
        { ...baseInput, homeScore: 1, awayScore: 1, advancerTeamId: null },
        knockout,
      ),
    ).toEqual({ ok: false, reason: "advancer_required" });
  });

  it("rejects a knockout-draw advancer that did not compete", () => {
    expect(
      validateResultInput(
        { ...baseInput, homeScore: 1, awayScore: 1, advancerTeamId: "team-x" },
        knockout,
      ),
    ).toEqual({ ok: false, reason: "advancer_not_competing" });
  });

  it("accepts a knockout draw with a competing advancer", () => {
    expect(
      validateResultInput(
        { ...baseInput, homeScore: 1, awayScore: 1, advancerTeamId: "team-b" },
        knockout,
      ),
    ).toEqual({ ok: true });
  });

  it("accepts a knockout non-draw without an advancer (winner is implied)", () => {
    expect(
      validateResultInput(
        { ...baseInput, homeScore: 2, awayScore: 1, advancerTeamId: null },
        knockout,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects a knockout non-draw advancer that did not compete", () => {
    expect(
      validateResultInput(
        { ...baseInput, homeScore: 2, awayScore: 1, advancerTeamId: "team-x" },
        knockout,
      ),
    ).toEqual({ ok: false, reason: "advancer_not_competing" });
  });
});
