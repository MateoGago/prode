/**
 * Tests for the pure batch-save decision (Slice 4).
 *
 * `decideBatch` mirrors `decideSave` but over N items: it resolves each item
 * against its authoritative match context (existence → kickoff lock → shape
 * validation) and returns one result entry PER item, in input order. It NEVER
 * throws — a single rejection must not poison the rest of the batch
 * (constraint C). The Server Action is a thin I/O shell around this.
 */

import { describe, expect, it } from "vitest";

import { decideBatch } from "@/features/predictions/entities/batch";
import type { MatchKickoffContext } from "@/features/predictions/entities/prediction";
import type { UpsertItem } from "@/features/predictions/entities/predictions-board";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const FUTURE = new Date("2026-06-11T19:00:00.000Z");
const PAST = new Date("2026-05-01T19:00:00.000Z");

function groupCtx(kickoffAt: Date): MatchKickoffContext {
  return { round: "group", homeTeamId: "h", awayTeamId: "a", kickoffAt };
}

function koCtx(kickoffAt: Date): MatchKickoffContext {
  return { round: "r16", homeTeamId: "h", awayTeamId: "a", kickoffAt };
}

function item(matchId: string, partial: Partial<UpsertItem> = {}): UpsertItem {
  return {
    matchId,
    homeScore: 1,
    awayScore: 0,
    advancerTeamId: null,
    ...partial,
  };
}

describe("decideBatch (Slice 4, REQ-04 / constraint C)", () => {
  it("returns an empty result for an empty batch", () => {
    expect(decideBatch([], {}, NOW)).toEqual([]);
  });

  it("accepts a valid, open group-stage item", () => {
    const items = [item("m1")];
    const ctx = { m1: groupCtx(FUTURE) };
    expect(decideBatch(items, ctx, NOW)).toEqual([{ matchId: "m1", ok: true }]);
  });

  it("rejects an item whose match context is missing as match_not_found", () => {
    const items = [item("ghost")];
    expect(decideBatch(items, {}, NOW)).toEqual([
      { matchId: "ghost", ok: false, reason: "match_not_found" },
    ]);
  });

  it("rejects an item whose kickoff already passed as locked", () => {
    const items = [item("m1")];
    const ctx = { m1: groupCtx(PAST) };
    expect(decideBatch(items, ctx, NOW)).toEqual([
      { matchId: "m1", ok: false, reason: "locked" },
    ]);
  });

  it("rejects an item with a negative score", () => {
    const items = [item("m1", { homeScore: -1 })];
    const ctx = { m1: groupCtx(FUTURE) };
    expect(decideBatch(items, ctx, NOW)).toEqual([
      { matchId: "m1", ok: false, reason: "negative_score" },
    ]);
  });

  it("rejects a knockout draw missing its advancer", () => {
    const items = [item("k1", { homeScore: 1, awayScore: 1 })];
    const ctx = { k1: koCtx(FUTURE) };
    expect(decideBatch(items, ctx, NOW)).toEqual([
      { matchId: "k1", ok: false, reason: "advancer_required" },
    ]);
  });

  it("preserves input order and isolates rejections (one bad item does not poison the batch)", () => {
    const items = [
      item("ok1"),
      item("bad", { homeScore: -2 }),
      item("ok2", { homeScore: 3, awayScore: 2 }),
    ];
    const ctx = {
      ok1: groupCtx(FUTURE),
      bad: groupCtx(FUTURE),
      ok2: groupCtx(FUTURE),
    };
    expect(decideBatch(items, ctx, NOW)).toEqual([
      { matchId: "ok1", ok: true },
      { matchId: "bad", ok: false, reason: "negative_score" },
      { matchId: "ok2", ok: true },
    ]);
  });
});
