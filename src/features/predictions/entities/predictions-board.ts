/**
 * Pure domain module for the predictions board state model.
 * NO React, NO infra imports — all derivations are unit-testable in isolation.
 *
 * Separation of concerns (off-by-one guard):
 * - "cargados" counts SAVED-set cardinality (savedMap keys) — independent of
 *   workingMap. Re-editing a saved match does NOT decrement it; re-saving does
 *   NOT re-increment it.
 * - dirty-set logic (isDirty / dirtySet / selectBatch) is completely separate.
 */

import type { PredictionInput } from "./prediction";
import { isPredictionOpen } from "./prediction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal match shape needed by the board derivations. */
export interface BoardMatch {
  id: string;
  kickoffAt: Date;
  /**
   * Match status — when present, a locked match (confirmed/live/finished, or
   * past kickoff) is no longer counted as "faltan" (you can't load it anymore).
   */
  status?: MatchStatus;
}

/**
 * User-visible card states: three editable states (empty/dirty/saved) plus
 * three frozen states for matches that have kicked off or been confirmed.
 */
export type CardState =
  | "empty"
  | "dirty"
  | "saved"
  | "locked"
  | "live"
  | "confirmed";

/**
 * Result of deriveLock: whether the match is editable from the client's
 * perspective. NOTE: this is a HINT only — the authoritative lock is the
 * Postgres RLS policy `now() < kickoff_at` (constraint E).
 */
export interface LockInfo {
  editable: boolean;
  reason?: "live" | "confirmed" | "kickoff";
}

/** Match-status values used for lock derivation. */
export type MatchStatus = "scheduled" | "live" | "finished" | "confirmed";

/** Minimal match shape for lock derivation. */
export interface LockableMatch {
  kickoffAt: Date;
  status?: MatchStatus;
}

/** Item to send to the batch save action. */
export interface UpsertItem {
  matchId: string;
  homeScore: number;
  awayScore: number;
  advancerTeamId: string | null;
}

/** Progress summary for the predictions board header. */
export interface Progress {
  cargados: number;
  total: number;
  faltan: number;
  cierranHoy: number;
}

/**
 * Cross-app group-stage progress ("X/72 cargadas"): the single shape echoed
 * outside /predicciones (app nav badge + Inicio dashboard). `loaded` ≤ `total`.
 */
export interface PredictionProgress {
  loaded: number;
  total: number;
}

/** Per-group progress chip data. */
export interface GroupProgress {
  label: string;
  loaded: number;
  total: number;
  status: "done" | "partial" | "empty";
}

/** Minimal group shape needed for deriveGroupProgress. */
export interface GroupMatchIds {
  groupLabel: string;
  matchIds: string[];
}

/** Filter tab options. */
export type FilterKind =
  | "todos"
  | "pendientes"
  | "cierran-pronto"
  | "guardados";

// ---------------------------------------------------------------------------
// REQ-01: deriveProgress
// ---------------------------------------------------------------------------

/**
 * Derives the progress summary from the saved-prediction set.
 * cargados = number of matchIds that have an entry in savedMap (set cardinality).
 * faltan   = matches still OPEN (editable) AND unsaved — i.e. what you can still
 *            load. A locked match (confirmed/live/past kickoff) is no longer
 *            counted: once the group stage is over those aren't pending work.
 *            (When a match has no `status`, lock falls back to kickoff vs now,
 *            preserving the original behaviour for callers that omit it.)
 * cierranHoy = matches whose kickoffAt falls within the UTC calendar day of `now`.
 */
export function deriveProgress(
  matches: BoardMatch[],
  savedMap: Record<string, unknown>,
  now: Date,
): Progress {
  const cargados = Object.keys(savedMap).length;
  const total = matches.length;
  const faltan = matches.filter(
    (m) =>
      !(m.id in savedMap) &&
      deriveLock({ kickoffAt: m.kickoffAt, status: m.status }, now).editable,
  ).length;

  const startOfDayMs = utcStartOfDay(now);
  const endOfDayMs = startOfDayMs + 24 * 60 * 60 * 1000;

  const cierranHoy = matches.filter((m) => {
    const ms = m.kickoffAt.getTime();
    return ms >= startOfDayMs && ms < endOfDayMs;
  }).length;

  return { cargados, total, faltan, cierranHoy };
}

/** Returns the UTC timestamp for 00:00:00.000 of the same day as `date`. */
function utcStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

// ---------------------------------------------------------------------------
// REQ-02 / REQ-03: deriveCardState
// ---------------------------------------------------------------------------

/**
 * Derives the user-visible card state from saved value, working value, and lock.
 * - "empty":  no saved AND no working value.
 * - "dirty":  working value exists AND differs from saved (or saved is null).
 * - "saved":  working equals saved AND saved is not null.
 * - "locked" / "live" / "confirmed": frozen states (lock.editable = false).
 */
export function deriveCardState(
  saved: PredictionInput | null,
  working: PredictionInput | undefined,
  lock: LockInfo,
): CardState {
  if (!lock.editable) {
    if (lock.reason === "live") return "live";
    if (lock.reason === "confirmed") return "confirmed";
    return "locked";
  }

  if (saved === null && working === undefined) {
    return "empty";
  }

  if (working !== undefined && !predictionsEqual(saved, working)) {
    return "dirty";
  }

  return "saved";
}

// ---------------------------------------------------------------------------
// REQ-07 / REQ-03: isDirty + dirtySet
// ---------------------------------------------------------------------------

/**
 * True when the working value exists AND differs from the saved value.
 * A null saved + defined working is always dirty.
 */
export function isDirty(
  saved: PredictionInput | null,
  working: PredictionInput | undefined,
): boolean {
  if (working === undefined) return false;
  return !predictionsEqual(saved, working);
}

/**
 * Returns the set of matchIds that have a dirty working value.
 * Locked matches are NOT excluded here — exclusion from batch is selectBatch's job.
 */
export function dirtySet(
  savedMap: Record<string, PredictionInput>,
  workingMap: Record<string, PredictionInput>,
): Set<string> {
  const dirty = new Set<string>();
  for (const matchId of Object.keys(workingMap)) {
    const saved = savedMap[matchId] ?? null;
    if (isDirty(saved, workingMap[matchId])) {
      dirty.add(matchId);
    }
  }
  return dirty;
}

/** Returns the effective value for display: working ?? saved ?? null. */
export function effectivePrediction(
  saved: PredictionInput | null,
  working: PredictionInput | undefined,
): PredictionInput | null {
  if (working !== undefined) return working;
  return saved;
}

// ---------------------------------------------------------------------------
// REQ-04 / REQ-07: selectBatch
// ---------------------------------------------------------------------------

/**
 * Returns only the dirty, non-locked items ready to send to the server.
 * A locked match is excluded even when its working value differs from saved.
 */
export function selectBatch(
  workingMap: Record<string, PredictionInput>,
  savedMap: Record<string, PredictionInput>,
  lockSet: Set<string>,
): UpsertItem[] {
  const items: UpsertItem[] = [];

  for (const matchId of Object.keys(workingMap)) {
    if (lockSet.has(matchId)) continue;
    const saved = savedMap[matchId] ?? null;
    const working = workingMap[matchId];
    if (isDirty(saved, working)) {
      items.push({
        matchId,
        homeScore: working.homeScore,
        awayScore: working.awayScore,
        advancerTeamId: working.advancerTeamId,
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// REQ-05: filterPredicate
// ---------------------------------------------------------------------------

/**
 * Returns true when the match should be visible under the given filter.
 * `cierranPronto` is a 24-hour window from `now` (client hint; constraint E).
 */
export function filterPredicate(
  filter: FilterKind,
  matchId: string,
  savedMap: Record<string, PredictionInput>,
  workingMap: Record<string, PredictionInput>,
  lock: LockInfo,
  kickoffAt: Date,
  now: Date,
): boolean {
  switch (filter) {
    case "todos":
      return true;

    case "pendientes": {
      const saved = savedMap[matchId] ?? null;
      const working = workingMap[matchId];
      // "Pendientes" = work you can STILL do. A locked match (confirmed/live/
      // past kickoff) can no longer be loaded, so it is never pending — even if
      // it was never saved (you missed it; there's nothing left to do). This
      // mirrors deriveProgress's "faltan", which also drops locked matches.
      if (!lock.editable) {
        return false;
      }
      const state = deriveCardState(saved, working, lock);
      return state === "empty" || state === "dirty";
    }

    case "cierran-pronto": {
      const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return (
        kickoffAt.getTime() > now.getTime() &&
        kickoffAt.getTime() <= windowEnd.getTime()
      );
    }

    case "guardados": {
      // A match is "guardado" if it has a saved prediction, regardless of lock
      // status. A locked match that was saved before kickoff must still appear
      // here — deriveCardState would return "locked" for it, not "saved", so we
      // test saved-existence directly (same criterion as the "cargados X/72"
      // counter — both = saved-map cardinality). PRODUCT DECISION, confirmed.
      const saved = savedMap[matchId] ?? null;
      return saved !== null;
    }
  }
}

// ---------------------------------------------------------------------------
// REQ-06: deriveGroupProgress
// ---------------------------------------------------------------------------

/**
 * Derives the per-group chip data: loaded count, total, and status.
 * "loaded" counts matches in the group that have a saved prediction.
 */
export function deriveGroupProgress(
  group: GroupMatchIds,
  savedMap: Record<string, unknown>,
): GroupProgress {
  const total = group.matchIds.length;
  const loaded = group.matchIds.filter((id) => id in savedMap).length;

  let status: GroupProgress["status"];
  if (loaded === 0) {
    status = "empty";
  } else if (loaded >= total) {
    status = "done";
  } else {
    status = "partial";
  }

  return { label: group.groupLabel, loaded, total, status };
}

// ---------------------------------------------------------------------------
// REQ-07: deriveLock
// ---------------------------------------------------------------------------

/**
 * Derives the client-side lock state for a match.
 * NOTE: This is a HINT only (constraint E). The authoritative lock is
 * the Postgres RLS policy `now() < kickoff_at`. Client clock may drift.
 */
export function deriveLock(match: LockableMatch, now: Date): LockInfo {
  if (match.status === "confirmed") {
    return { editable: false, reason: "confirmed" };
  }

  if (match.status === "live" || match.status === "finished") {
    return { editable: false, reason: "live" };
  }

  const open = isPredictionOpen(match.kickoffAt, now);
  if (!open) {
    return { editable: false, reason: "kickoff" };
  }

  return { editable: true };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function predictionsEqual(
  a: PredictionInput | null,
  b: PredictionInput | null | undefined,
): boolean {
  if (a === null && (b === null || b === undefined)) return true;
  if (a === null || b === null || b === undefined) return false;
  return (
    a.homeScore === b.homeScore &&
    a.awayScore === b.awayScore &&
    a.advancerTeamId === b.advancerTeamId
  );
}
