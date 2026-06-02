import { describe, expect, it } from "vitest";

import {
  deriveCardState,
  deriveGroupProgress,
  deriveLock,
  deriveProgress,
  dirtySet,
  filterPredicate,
  isDirty,
  selectBatch,
} from "@/features/predictions/entities/predictions-board";
import type {
  BoardMatch,
  LockInfo,
} from "@/features/predictions/entities/predictions-board";
import type { PredictionInput } from "@/features/predictions/entities/prediction";

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

  it("faltan excludes locked matches (confirmed status or past kickoff)", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const future = new Date("2026-06-20T18:00:00.000Z");
    const past = new Date("2026-06-10T18:00:00.000Z");
    const matches: BoardMatch[] = [
      { id: "open1", kickoffAt: future, status: "scheduled" },
      { id: "open2", kickoffAt: future, status: "scheduled" },
      { id: "confirmed1", kickoffAt: future, status: "confirmed" }, // locked by status
      { id: "past1", kickoffAt: past }, // locked by kickoff (no status)
    ];
    const result = deriveProgress(matches, {}, now);
    // Only the two still-open, unsaved matches are "faltan".
    expect(result.faltan).toBe(2);
    expect(result.total).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// REQ-02 + REQ-03: deriveCardState
// ---------------------------------------------------------------------------

describe("deriveCardState (REQ-02 + REQ-03)", () => {
  const OPEN: LockInfo = { editable: true };
  const LOCKED: LockInfo = { editable: false, reason: "kickoff" };
  const LIVE: LockInfo = { editable: false, reason: "live" };
  const CONFIRMED: LockInfo = { editable: false, reason: "confirmed" };

  const saved: PredictionInput = {
    homeScore: 1,
    awayScore: 0,
    advancerTeamId: null,
  };
  const sameAsaved: PredictionInput = {
    homeScore: 1,
    awayScore: 0,
    advancerTeamId: null,
  };
  const different: PredictionInput = {
    homeScore: 2,
    awayScore: 0,
    advancerTeamId: null,
  };

  it("sin-cargar (empty): saved=null AND working=undefined", () => {
    expect(deriveCardState(null, undefined, OPEN)).toBe("empty");
  });

  it("sin-guardar (dirty): working differs from saved (saved non-null)", () => {
    expect(deriveCardState(saved, different, OPEN)).toBe("dirty");
  });

  it("sin-guardar (dirty): saved=null AND working defined", () => {
    expect(
      deriveCardState(
        null,
        { homeScore: 0, awayScore: 0, advancerTeamId: null },
        OPEN,
      ),
    ).toBe("dirty");
  });

  it("guardado (saved): working equals saved AND saved is not null", () => {
    expect(deriveCardState(saved, sameAsaved, OPEN)).toBe("saved");
  });

  it("re-edit of guardado → sin-guardar", () => {
    // Start: guardado state
    expect(deriveCardState(saved, sameAsaved, OPEN)).toBe("saved");
    // User edits: working differs
    expect(deriveCardState(saved, different, OPEN)).toBe("dirty");
  });

  it("saved + open match → editable=true (REQ-03)", () => {
    // editable is conveyed through LockInfo — deriveCardState returns "saved" not "locked"
    expect(deriveCardState(saved, sameAsaved, OPEN)).toBe("saved");
  });

  it("saved + locked match → locked state (REQ-03)", () => {
    expect(deriveCardState(saved, sameAsaved, LOCKED)).toBe("locked");
  });

  it("unsaved + locked match → locked state (REQ-03)", () => {
    expect(deriveCardState(null, undefined, LOCKED)).toBe("locked");
  });

  it("live match → live state", () => {
    expect(deriveCardState(saved, sameAsaved, LIVE)).toBe("live");
  });

  it("confirmed match → confirmed state", () => {
    expect(deriveCardState(saved, sameAsaved, CONFIRMED)).toBe("confirmed");
  });
});

// ---------------------------------------------------------------------------
// REQ-07 / dirty helpers: isDirty + dirtySet
// ---------------------------------------------------------------------------

describe("isDirty (REQ-07)", () => {
  const base: PredictionInput = {
    homeScore: 1,
    awayScore: 0,
    advancerTeamId: null,
  };

  it("false when working is undefined (untouched)", () => {
    expect(isDirty(base, undefined)).toBe(false);
    expect(isDirty(null, undefined)).toBe(false);
  });

  it("false when working deep-equals saved", () => {
    const same: PredictionInput = {
      homeScore: 1,
      awayScore: 0,
      advancerTeamId: null,
    };
    expect(isDirty(base, same)).toBe(false);
  });

  it("true when working differs from saved (home score changed)", () => {
    const changed: PredictionInput = {
      homeScore: 2,
      awayScore: 0,
      advancerTeamId: null,
    };
    expect(isDirty(base, changed)).toBe(true);
  });

  it("true when working differs from saved (away score changed)", () => {
    const changed: PredictionInput = {
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: null,
    };
    expect(isDirty(base, changed)).toBe(true);
  });

  it("true when working differs from saved (advancerTeamId changed)", () => {
    const withAdvancer: PredictionInput = {
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: "team-a",
    };
    const diffAdvancer: PredictionInput = {
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: "team-b",
    };
    expect(isDirty(withAdvancer, diffAdvancer)).toBe(true);
  });

  it("true when saved is null but working is defined", () => {
    expect(
      isDirty(null, { homeScore: 0, awayScore: 0, advancerTeamId: null }),
    ).toBe(true);
  });
});

describe("dirtySet (REQ-07)", () => {
  it("returns empty set when no working entries", () => {
    const savedMap: Record<string, PredictionInput> = {
      m1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    };
    expect(dirtySet(savedMap, {})).toEqual(new Set());
  });

  it("returns matchId when working differs from saved", () => {
    const savedMap: Record<string, PredictionInput> = {
      m1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    };
    const workingMap: Record<string, PredictionInput> = {
      m1: { homeScore: 2, awayScore: 0, advancerTeamId: null },
    };
    expect(dirtySet(savedMap, workingMap)).toEqual(new Set(["m1"]));
  });

  it("does not include matchId when working equals saved", () => {
    const pred: PredictionInput = {
      homeScore: 1,
      awayScore: 0,
      advancerTeamId: null,
    };
    const savedMap: Record<string, PredictionInput> = { m1: pred };
    const workingMap: Record<string, PredictionInput> = {
      m1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    };
    expect(dirtySet(savedMap, workingMap)).toEqual(new Set());
  });

  it("includes unsaved match with a working value (saved not in savedMap)", () => {
    const workingMap: Record<string, PredictionInput> = {
      m1: { homeScore: 0, awayScore: 0, advancerTeamId: null },
    };
    expect(dirtySet({}, workingMap)).toEqual(new Set(["m1"]));
  });
});

// ---------------------------------------------------------------------------
// REQ-04 / REQ-07: selectBatch
// ---------------------------------------------------------------------------

describe("selectBatch (REQ-04, REQ-07)", () => {
  const base: PredictionInput = {
    homeScore: 1,
    awayScore: 0,
    advancerTeamId: null,
  };
  const changed: PredictionInput = {
    homeScore: 2,
    awayScore: 0,
    advancerTeamId: null,
  };

  it("returns empty array when working map is empty", () => {
    expect(selectBatch({}, { m1: base }, new Set())).toEqual([]);
  });

  it("returns dirty non-locked items only", () => {
    const workingMap: Record<string, PredictionInput> = {
      m1: changed,
      m2: { homeScore: 1, awayScore: 0, advancerTeamId: null }, // same as saved → not dirty
    };
    const savedMap: Record<string, PredictionInput> = {
      m1: base,
      m2: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    };
    const result = selectBatch(workingMap, savedMap, new Set());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      matchId: "m1",
      homeScore: 2,
      awayScore: 0,
    });
  });

  it("excludes locked match even if dirty (REQ-07 scenario)", () => {
    const workingMap: Record<string, PredictionInput> = {
      m1: changed,
    };
    const savedMap: Record<string, PredictionInput> = {
      m1: base,
    };
    const lockSet = new Set(["m1"]);
    expect(selectBatch(workingMap, savedMap, lockSet)).toEqual([]);
  });

  it("includes unsaved (no saved entry) dirty match", () => {
    const workingMap: Record<string, PredictionInput> = {
      m1: { homeScore: 0, awayScore: 0, advancerTeamId: null },
    };
    const result = selectBatch(workingMap, {}, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].matchId).toBe("m1");
  });

  it("preserves advancerTeamId in the batch item", () => {
    const withAdvancer: PredictionInput = {
      homeScore: 1,
      awayScore: 1,
      advancerTeamId: "team-a",
    };
    const workingMap: Record<string, PredictionInput> = {
      m1: withAdvancer,
    };
    const result = selectBatch(workingMap, {}, new Set());
    expect(result[0].advancerTeamId).toBe("team-a");
  });
});

// ---------------------------------------------------------------------------
// REQ-05: filterPredicate
// ---------------------------------------------------------------------------

describe("filterPredicate (REQ-05)", () => {
  const OPEN: LockInfo = { editable: true };
  const LOCKED: LockInfo = { editable: false, reason: "kickoff" };

  const NOW = new Date("2026-06-15T12:00:00.000Z");
  const FUTURE_24H = new Date("2026-06-16T11:00:00.000Z"); // within 24h of NOW
  const FUTURE_FAR = new Date("2026-06-20T18:00:00.000Z"); // outside 24h
  const PAST = new Date("2026-06-14T18:00:00.000Z");

  const savedPred: PredictionInput = {
    homeScore: 1,
    awayScore: 0,
    advancerTeamId: null,
  };

  // "todos" filter
  it("todos: includes every match regardless of state", () => {
    expect(filterPredicate("todos", "m1", {}, {}, OPEN, FUTURE_FAR, NOW)).toBe(
      true,
    );
    expect(
      filterPredicate(
        "todos",
        "m1",
        { m1: savedPred },
        {},
        OPEN,
        FUTURE_FAR,
        NOW,
      ),
    ).toBe(true);
    expect(filterPredicate("todos", "m1", {}, {}, LOCKED, PAST, NOW)).toBe(
      true,
    );
  });

  // "pendientes" filter
  it("pendientes: includes empty (sin-cargar) matches", () => {
    expect(
      filterPredicate("pendientes", "m1", {}, {}, OPEN, FUTURE_FAR, NOW),
    ).toBe(true);
  });

  it("pendientes: includes dirty (sin-guardar) matches", () => {
    const workingMap: Record<string, PredictionInput> = {
      m1: { homeScore: 2, awayScore: 0, advancerTeamId: null },
    };
    expect(
      filterPredicate(
        "pendientes",
        "m1",
        { m1: savedPred },
        workingMap,
        OPEN,
        FUTURE_FAR,
        NOW,
      ),
    ).toBe(true);
  });

  it("pendientes: excludes guardado matches", () => {
    const sameAsaved: PredictionInput = {
      homeScore: 1,
      awayScore: 0,
      advancerTeamId: null,
    };
    const workingMap: Record<string, PredictionInput> = { m1: sameAsaved };
    expect(
      filterPredicate(
        "pendientes",
        "m1",
        { m1: savedPred },
        workingMap,
        OPEN,
        FUTURE_FAR,
        NOW,
      ),
    ).toBe(false);
  });

  it("pendientes: locked match with no saved prediction IS included (REQ-05)", () => {
    // A match that locked before the user saved it is still "pending"
    expect(filterPredicate("pendientes", "m1", {}, {}, LOCKED, PAST, NOW)).toBe(
      true,
    );
  });

  it("pendientes: locked match WITH a saved prediction is NOT pendiente", () => {
    const sameAsaved: PredictionInput = {
      homeScore: 1,
      awayScore: 0,
      advancerTeamId: null,
    };
    const workingMap: Record<string, PredictionInput> = { m1: sameAsaved };
    expect(
      filterPredicate(
        "pendientes",
        "m1",
        { m1: savedPred },
        workingMap,
        LOCKED,
        PAST,
        NOW,
      ),
    ).toBe(false);
  });

  // "cierran-pronto" filter
  it("cierran-pronto: includes match within next 24h", () => {
    expect(
      filterPredicate("cierran-pronto", "m1", {}, {}, OPEN, FUTURE_24H, NOW),
    ).toBe(true);
  });

  it("cierran-pronto: excludes match further than 24h away", () => {
    expect(
      filterPredicate("cierran-pronto", "m1", {}, {}, OPEN, FUTURE_FAR, NOW),
    ).toBe(false);
  });

  it("cierran-pronto: excludes past matches (already kicked off)", () => {
    expect(
      filterPredicate("cierran-pronto", "m1", {}, {}, LOCKED, PAST, NOW),
    ).toBe(false);
  });

  // "guardados" filter
  it("guardados: includes saved match (working = saved)", () => {
    const sameAsaved: PredictionInput = {
      homeScore: 1,
      awayScore: 0,
      advancerTeamId: null,
    };
    const workingMap: Record<string, PredictionInput> = { m1: sameAsaved };
    expect(
      filterPredicate(
        "guardados",
        "m1",
        { m1: savedPred },
        workingMap,
        OPEN,
        FUTURE_FAR,
        NOW,
      ),
    ).toBe(true);
  });

  it("guardados: includes a dirty match that has a saved prediction", () => {
    // The user re-edited an already-saved match. The saved prediction still
    // exists in savedMap (saved !== null), so the match stays in "guardados"
    // even though the working value differs. PRODUCT DECISION: guardados =
    // saved-existence, consistent with the "cargados X/72" counter.
    const workingMap: Record<string, PredictionInput> = {
      m1: { homeScore: 2, awayScore: 0, advancerTeamId: null },
    };
    expect(
      filterPredicate(
        "guardados",
        "m1",
        { m1: savedPred },
        workingMap,
        OPEN,
        FUTURE_FAR,
        NOW,
      ),
    ).toBe(true);
  });

  it("guardados: excludes empty (never loaded) match", () => {
    expect(
      filterPredicate("guardados", "m1", {}, {}, OPEN, FUTURE_FAR, NOW),
    ).toBe(false);
  });

  it("guardados: includes a locked match that has a saved prediction (PRODUCT DECISION)", () => {
    // A match that kicked off but already had a saved prediction must appear in
    // the "guardados" tab. The filter is based on saved-existence (saved !== null),
    // not on deriveCardState, because deriveCardState returns "locked" for such
    // matches — not "saved".
    expect(
      filterPredicate(
        "guardados",
        "m1",
        { m1: savedPred },
        {},
        LOCKED,
        PAST,
        NOW,
      ),
    ).toBe(true);
  });

  it("guardados: excludes a locked match with NO saved prediction", () => {
    expect(filterPredicate("guardados", "m1", {}, {}, LOCKED, PAST, NOW)).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// REQ-06: deriveGroupProgress
// ---------------------------------------------------------------------------

describe("deriveGroupProgress (REQ-06)", () => {
  const GROUP_A = {
    groupLabel: "A",
    matchIds: ["m1", "m2", "m3", "m4", "m5", "m6"],
  };

  it("empty: 0/6 when no saved predictions in group", () => {
    const result = deriveGroupProgress(GROUP_A, {});
    expect(result.loaded).toBe(0);
    expect(result.total).toBe(6);
    expect(result.status).toBe("empty");
    expect(result.label).toBe("A");
  });

  it("partial: 4/6 when 4 matches in group are saved (REQ-06 scenario)", () => {
    const savedMap = { m1: {}, m2: {}, m3: {}, m4: {} };
    const result = deriveGroupProgress(GROUP_A, savedMap);
    expect(result.loaded).toBe(4);
    expect(result.total).toBe(6);
    expect(result.status).toBe("partial");
  });

  it("done: 6/6 when all matches are saved", () => {
    const savedMap = {
      m1: {},
      m2: {},
      m3: {},
      m4: {},
      m5: {},
      m6: {},
    };
    const result = deriveGroupProgress(GROUP_A, savedMap);
    expect(result.loaded).toBe(6);
    expect(result.status).toBe("done");
  });

  it("partial: 1/6 is partial, not empty", () => {
    const result = deriveGroupProgress(GROUP_A, { m1: {} });
    expect(result.status).toBe("partial");
  });

  it("only counts matches that belong to this group (keys in savedMap that are not in group are ignored)", () => {
    // m7 and m8 belong to a different group — should not inflate loaded count
    const savedMap = { m1: {}, m7: {}, m8: {} };
    const result = deriveGroupProgress(GROUP_A, savedMap);
    expect(result.loaded).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// REQ-07: deriveLock
// ---------------------------------------------------------------------------

describe("deriveLock (REQ-07)", () => {
  const KICKOFF = new Date("2026-06-15T18:00:00.000Z");
  const BEFORE = new Date("2026-06-15T17:59:59.000Z");
  const AT_KICKOFF = new Date("2026-06-15T18:00:00.000Z");
  const AFTER = new Date("2026-06-15T18:00:01.000Z");

  it("editable when client clock is before kickoff (scheduled)", () => {
    const lock = deriveLock(
      { kickoffAt: KICKOFF, status: "scheduled" },
      BEFORE,
    );
    expect(lock.editable).toBe(true);
    expect(lock.reason).toBeUndefined();
  });

  it("locked at kickoff (now >= kickoff_at, client hint)", () => {
    const lock = deriveLock(
      { kickoffAt: KICKOFF, status: "scheduled" },
      AT_KICKOFF,
    );
    expect(lock.editable).toBe(false);
    expect(lock.reason).toBe("kickoff");
  });

  it("locked after kickoff", () => {
    const lock = deriveLock({ kickoffAt: KICKOFF, status: "scheduled" }, AFTER);
    expect(lock.editable).toBe(false);
    expect(lock.reason).toBe("kickoff");
  });

  it("live match is locked with reason=live", () => {
    const lock = deriveLock({ kickoffAt: KICKOFF, status: "live" }, AFTER);
    expect(lock.editable).toBe(false);
    expect(lock.reason).toBe("live");
  });

  it("finished match is locked with reason=live", () => {
    const lock = deriveLock({ kickoffAt: KICKOFF, status: "finished" }, AFTER);
    expect(lock.editable).toBe(false);
    expect(lock.reason).toBe("live");
  });

  it("confirmed match is locked with reason=confirmed", () => {
    const lock = deriveLock({ kickoffAt: KICKOFF, status: "confirmed" }, AFTER);
    expect(lock.editable).toBe(false);
    expect(lock.reason).toBe("confirmed");
  });
});
