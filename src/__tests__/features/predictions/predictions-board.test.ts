import { describe, expect, it } from "vitest";

import { deriveProgress } from "@/features/predictions/entities/predictions-board";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMatch(id: string, kickoffAt: Date) {
  return { id, kickoffAt };
}

type SimpleMatch = ReturnType<typeof makeMatch>;

// ---------------------------------------------------------------------------
// REQ-01: deriveProgress
// ---------------------------------------------------------------------------

describe("deriveProgress (REQ-01)", () => {
  const TODAY = new Date("2026-06-15T12:00:00.000Z");

  const matches72: SimpleMatch[] = Array.from({ length: 72 }, (_, i) =>
    makeMatch(`m${i}`, new Date("2026-06-20T18:00:00.000Z")),
  );

  it("initial state: cargados=0, faltan=72 when no saved predictions", () => {
    const savedMap: Record<string, unknown> = {};
    const result = deriveProgress(matches72, savedMap, TODAY);
    expect(result.cargados).toBe(0);
    expect(result.faltan).toBe(72);
    expect(result.total).toBe(72);
  });

  it("partial: cargados=10, faltan=62 when 10 matches have saved predictions", () => {
    const savedMap: Record<string, unknown> = {};
    for (let i = 0; i < 10; i++) {
      savedMap[`m${i}`] = { homeScore: 1, awayScore: 0, advancerTeamId: null };
    }
    const result = deriveProgress(matches72, savedMap, TODAY);
    expect(result.cargados).toBe(10);
    expect(result.faltan).toBe(62);
  });

  it("re-edit does NOT decrement cargados (savedMap cardinality is independent of workingMap)", () => {
    // match m0 is saved — cargados counts saved set, NOT working state
    const savedMap: Record<string, unknown> = {
      m0: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    };
    for (let i = 1; i < 10; i++) {
      savedMap[`m${i}`] = { homeScore: 1, awayScore: 0, advancerTeamId: null };
    }
    // Even though the caller now has a "dirty" working value for m0,
    // deriveProgress only looks at savedMap — it doesn't know about workingMap.
    const result = deriveProgress(matches72, savedMap, TODAY);
    expect(result.cargados).toBe(10);
  });

  it("re-save does NOT re-increment cargados (map cardinality stays constant)", () => {
    const savedMap: Record<string, unknown> = {
      m0: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    };
    for (let i = 1; i < 10; i++) {
      savedMap[`m${i}`] = { homeScore: 1, awayScore: 0, advancerTeamId: null };
    }
    // Re-saving m0 just updates the entry — cardinality stays 10
    savedMap.m0 = { homeScore: 2, awayScore: 1, advancerTeamId: null };
    const result = deriveProgress(matches72, savedMap, TODAY);
    expect(result.cargados).toBe(10);
  });

  it("cierranHoy counts matches whose kickoff falls within today's UTC day", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const todayMatches = [
      makeMatch("t1", new Date("2026-06-15T14:00:00.000Z")),
      makeMatch("t2", new Date("2026-06-15T17:00:00.000Z")),
      makeMatch("t3", new Date("2026-06-15T20:00:00.000Z")),
      makeMatch("t4", new Date("2026-06-15T23:59:59.000Z")),
      makeMatch("t5", new Date("2026-06-15T00:00:00.000Z")),
    ];
    const tomorrowMatches = [
      makeMatch("x1", new Date("2026-06-16T00:00:00.000Z")),
      makeMatch("x2", new Date("2026-06-14T23:59:59.000Z")),
    ];
    const allMatches = [...todayMatches, ...tomorrowMatches];
    const result = deriveProgress(allMatches, {}, now);
    expect(result.cierranHoy).toBe(5);
  });

  it("cierranHoy=0 when no matches today", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const otherDayMatches = [
      makeMatch("a1", new Date("2026-06-16T14:00:00.000Z")),
      makeMatch("a2", new Date("2026-06-14T14:00:00.000Z")),
    ];
    const result = deriveProgress(otherDayMatches, {}, now);
    expect(result.cierranHoy).toBe(0);
  });
});
