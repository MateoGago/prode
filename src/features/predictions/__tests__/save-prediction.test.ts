import { describe, expect, it, vi } from "vitest";
import type { MatchReader } from "../ports/match-reader";
import type {
  PredictionsRepo,
  UpsertPredictionInput,
} from "../ports/predictions-repo";
import { savePrediction } from "../use-case/save-prediction";

const KICKOFF = new Date("2026-06-11T19:00:00.000Z");
const BEFORE = () => new Date("2026-06-11T18:00:00.000Z");
const AFTER = () => new Date("2026-06-11T20:00:00.000Z");

function deps(overrides: {
  context?: Awaited<ReturnType<MatchReader["getContext"]>>;
  now?: () => Date;
}) {
  const upsert = vi.fn<(i: UpsertPredictionInput) => Promise<void>>(
    async () => {},
  );
  const predictions: PredictionsRepo = { upsert };
  const matches: MatchReader = {
    getContext: async () =>
      overrides.context === undefined
        ? {
            round: "group",
            homeTeamId: "team-a",
            awayTeamId: "team-b",
            kickoffAt: KICKOFF,
          }
        : overrides.context,
  };
  return {
    upsert,
    deps: { predictions, matches, now: overrides.now ?? BEFORE },
  };
}

const groupInput: UpsertPredictionInput = {
  userId: "u1",
  matchId: "m1",
  homeScore: 2,
  awayScore: 1,
  advancerTeamId: null,
};

describe("savePrediction", () => {
  it("saves a valid group prediction before kickoff", async () => {
    const { upsert, deps: d } = deps({});
    const result = await savePrediction(groupInput, d);
    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(groupInput);
  });

  it("fails when the match does not exist", async () => {
    const { upsert, deps: d } = deps({ context: null });
    const result = await savePrediction(groupInput, d);
    expect(result).toEqual({ ok: false, reason: "match_not_found" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects and does not persist once the match has kicked off", async () => {
    const { upsert, deps: d } = deps({ now: AFTER });
    const result = await savePrediction(groupInput, d);
    expect(result).toEqual({ ok: false, reason: "locked" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid prediction without persisting", async () => {
    const { upsert, deps: d } = deps({
      context: {
        round: "r16",
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        kickoffAt: KICKOFF,
      },
    });
    const result = await savePrediction(
      { ...groupInput, homeScore: 1, awayScore: 1, advancerTeamId: null },
      d,
    );
    expect(result).toEqual({ ok: false, reason: "advancer_required" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("saves a knockout draw with a valid advancer", async () => {
    const { upsert, deps: d } = deps({
      context: {
        round: "r16",
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        kickoffAt: KICKOFF,
      },
    });
    const input: UpsertPredictionInput = {
      userId: "u1",
      matchId: "m1",
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: "team-a",
    };
    const result = await savePrediction(input, d);
    expect(result).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(input);
  });
});
