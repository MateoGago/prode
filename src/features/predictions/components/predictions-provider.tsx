"use client";

/**
 * PredictionsProvider — client context island that owns WORKING state.
 *
 * Architecture:
 * - SAVED state is seeded from the server (initialPredictions, authoritative).
 * - WORKING state lives here: user edits create entries in workingMap.
 * - All derivations (progress, dirty set, card states, group chips) are pure
 *   functions from predictions-board.ts — no logic lives in this file.
 *
 * Slice 4 wires saveBatch() with the real Server Action + useTransition:
 * it collects the dirty, non-locked batch via getBatch() and persists it in one
 * roundtrip, promoting accepted matches working→saved locally.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { saveBatchPredictions } from "@/features/predictions/actions/save-batch-predictions";
import type { PredictionInput } from "@/features/predictions/entities/prediction";
import type { GroupBlock } from "@/features/predictions/entities/predictions-page";
import {
  type CardState,
  type FilterKind,
  type GroupProgress,
  type LockInfo,
  type Progress,
  type UpsertItem,
  deriveCardState,
  deriveGroupProgress,
  deriveLock,
  deriveProgress,
  dirtySet,
  filterPredicate,
  selectBatch,
} from "@/features/predictions/entities/predictions-board";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

/**
 * How the board groups its matches. "dia" buckets by AR-local kickoff date;
 * "etapa" buckets by group (A–L). Defaults to "dia" (see provider).
 */
export type ViewMode = "dia" | "etapa";

interface PredictionsBoardState {
  /** Authoritative saved predictions (from server seed + batch-save promotions). */
  savedMap: Record<string, PredictionInput>;
  /** Working (in-flight edits) — a match is "dirty" iff it has an entry here that differs from saved. */
  workingMap: Record<string, PredictionInput>;
  /** Derived: set of matchIds with dirty working values. */
  dirty: Set<string>;
  /** Derived: overall progress (cargados, faltan, cierranHoy, total). */
  progress: Progress;
  /** Derived: per-group chip data. */
  groupProgress: GroupProgress[];
  /** Active filter tab. */
  filter: FilterKind;
  /** Active grouping view ("dia" | "etapa"). */
  viewMode: ViewMode;
  /** Per-match save errors (from batch rejection). */
  errorsByMatchId: Record<string, string>;
  /** True while a batch save is in-flight. */
  pending: boolean;
}

interface PredictionsBoardActions {
  /** Set or update the working prediction for a match. */
  setPrediction(matchId: string, next: PredictionInput): void;
  /** Derive the lock state for a given match (uses client clock as hint). */
  getLock(matchId: string, kickoffAt: Date): LockInfo;
  /** Derive the card state for a given match. */
  getCardState(matchId: string, kickoffAt: Date): CardState;
  /** Select the batch items that are dirty and unlocked. */
  getBatch(): UpsertItem[];
  /** Update the active filter. */
  setFilter(kind: FilterKind): void;
  /** Switch the grouping view ("dia" | "etapa"). */
  setViewMode(mode: ViewMode): void;
  /** Scroll the viewport to the group's section anchor. */
  jumpToGroup(label: string): void;
  /**
   * Returns the count of matches that match the given filter kind.
   * Used by FilterSegment to show live counts without re-deriving match lists.
   */
  getFilterCount(kind: FilterKind): number;
  /**
   * Persist the dirty, non-locked predictions via the saveBatchPredictions
   * Server Action, promoting accepted matches working→saved locally.
   */
  saveBatch(): Promise<void>;
}

export type PredictionsBoardContext = PredictionsBoardState &
  PredictionsBoardActions;

const PredictionsBoardCtx = createContext<PredictionsBoardContext | null>(null);

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

export interface PredictionsProviderProps {
  /** Saved predictions from the server (matchId → PredictionInput). */
  initialPredictions: Record<string, PredictionInput>;
  /** Grouped matches (used for progress + group-chip derivations). */
  groups: GroupBlock[];
  children: ReactNode;
  /**
   * Optional fixed clock for deterministic rendering in tests.
   * Production callers omit this prop — the provider defaults to new Date()
   * at the call boundary (inside the render, not at import time).
   */
  now?: Date;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PredictionsProvider({
  initialPredictions,
  groups,
  children,
  now = new Date(),
}: PredictionsProviderProps) {
  const [savedMap, setSavedMap] =
    useState<Record<string, PredictionInput>>(initialPredictions);
  const [workingMap, setWorkingMap] = useState<Record<string, PredictionInput>>(
    {},
  );
  const [filter, setFilter] = useState<FilterKind>("todos");
  // Default to the calendar-day view (matches the Cocos-style "DÍA" default).
  const [viewMode, setViewMode] = useState<ViewMode>("dia");
  const [errorsByMatchId, setErrorsByMatchId] = useState<
    Record<string, string>
  >({});
  const [pending, startTransition] = useTransition();

  // All matches flattened (needed for deriveProgress's BoardMatch array)
  const allMatches = useMemo(
    () =>
      groups.flatMap((g) =>
        g.matches.map((m) => ({ id: m.id, kickoffAt: m.kickoffAt })),
      ),
    [groups],
  );

  // Group chip data (matchIds per group)
  const groupMatchIds = useMemo(
    () =>
      groups.map((g) => ({
        groupLabel: g.groupLabel,
        matchIds: g.matches.map((m) => m.id),
      })),
    [groups],
  );

  // Derived state — recomputed whenever savedMap or workingMap changes
  const dirty = useMemo(
    () => dirtySet(savedMap, workingMap),
    [savedMap, workingMap],
  );

  const progress = useMemo(
    () => deriveProgress(allMatches, savedMap, now),
    [allMatches, savedMap, now],
  );

  const groupProgress = useMemo(
    () => groupMatchIds.map((g) => deriveGroupProgress(g, savedMap)),
    [groupMatchIds, savedMap],
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const setPrediction = useCallback(
    (matchId: string, next: PredictionInput) => {
      setWorkingMap((current) => ({ ...current, [matchId]: next }));
      // Clear any previous error for this match on edit
      setErrorsByMatchId((current) => {
        const { [matchId]: _, ...rest } = current;
        return rest;
      });
    },
    [],
  );

  const getLock = useCallback(
    (matchId: string, kickoffAt: Date): LockInfo => {
      // Find match status from groups
      let status: "scheduled" | "live" | "finished" | "confirmed" | undefined;
      for (const group of groups) {
        const match = group.matches.find((m) => m.id === matchId);
        if (match) {
          status = match.status as typeof status;
          break;
        }
      }
      return deriveLock({ kickoffAt, status }, now);
    },
    [groups, now],
  );

  const getCardState = useCallback(
    (matchId: string, kickoffAt: Date): CardState => {
      const saved = savedMap[matchId] ?? null;
      const working = workingMap[matchId];
      const lock = getLock(matchId, kickoffAt);
      return deriveCardState(saved, working, lock);
    },
    [savedMap, workingMap, getLock],
  );

  const getBatch = useCallback((): UpsertItem[] => {
    // Build lock set using the injected clock (now prop, defaults to new Date())
    const lockSet = new Set<string>();
    for (const group of groups) {
      for (const match of group.matches) {
        const lock = deriveLock(
          {
            kickoffAt: match.kickoffAt,
            status: match.status as Parameters<typeof deriveLock>[0]["status"],
          },
          now,
        );
        if (!lock.editable) lockSet.add(match.id);
      }
    }
    return selectBatch(workingMap, savedMap, lockSet);
  }, [groups, now, workingMap, savedMap]);

  const getFilterCount = useCallback(
    (kind: FilterKind): number => {
      let count = 0;
      for (const group of groups) {
        for (const match of group.matches) {
          const lock = deriveLock(
            {
              kickoffAt: match.kickoffAt,
              status: match.status as Parameters<
                typeof deriveLock
              >[0]["status"],
            },
            now,
          );
          if (
            filterPredicate(
              kind,
              match.id,
              savedMap,
              workingMap,
              lock,
              match.kickoffAt,
              now,
            )
          ) {
            count++;
          }
        }
      }
      return count;
    },
    [groups, now, savedMap, workingMap],
  );

  const jumpToGroup = useCallback((label: string) => {
    const el = document.getElementById(label);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /**
   * Persist the dirty, non-locked batch in one roundtrip. On per-match ok:true
   * we promote working→saved LOCALLY — this is what updates THIS page's saved
   * state and badge (no optimistic flip, design §2); on per-match failure we
   * record the reason and leave the edit dirty. The action's
   * revalidatePath("/predicciones") refreshes server-derived data for other
   * views and for the next full navigation/remount — it does NOT re-seed this
   * provider's in-memory savedMap, which is useState(initialPredictions) and
   * will not pick up new props on a normal re-render.
   */
  const saveBatch = useCallback(async (): Promise<void> => {
    const items = getBatch();
    if (items.length === 0) return;

    startTransition(async () => {
      const { results } = await saveBatchPredictions({ items });

      const itemById = new Map(items.map((item) => [item.matchId, item]));
      const okIds = results.filter((r) => r.ok).map((r) => r.matchId);
      const failed = results.filter(
        (r): r is Extract<typeof r, { ok: false }> => !r.ok,
      );

      if (okIds.length > 0) {
        setSavedMap((current) => {
          const next = { ...current };
          for (const id of okIds) {
            const item = itemById.get(id);
            if (item) {
              next[id] = {
                homeScore: item.homeScore,
                awayScore: item.awayScore,
                advancerTeamId: item.advancerTeamId,
              };
            }
          }
          return next;
        });
        setWorkingMap((current) => {
          const next = { ...current };
          for (const id of okIds) delete next[id];
          return next;
        });
      }

      if (failed.length > 0) {
        setErrorsByMatchId((current) => {
          const next = { ...current };
          for (const f of failed) next[f.matchId] = f.reason;
          return next;
        });
      }
    });
  }, [getBatch]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value: PredictionsBoardContext = useMemo(
    () => ({
      savedMap,
      workingMap,
      dirty,
      progress,
      groupProgress,
      filter,
      viewMode,
      errorsByMatchId,
      pending,
      setPrediction,
      getLock,
      getCardState,
      getBatch,
      setFilter,
      setViewMode,
      getFilterCount,
      jumpToGroup,
      saveBatch,
    }),
    [
      savedMap,
      workingMap,
      dirty,
      progress,
      groupProgress,
      filter,
      viewMode,
      errorsByMatchId,
      pending,
      setPrediction,
      getLock,
      getCardState,
      getBatch,
      getFilterCount,
      jumpToGroup,
      saveBatch,
    ],
  );

  return (
    <PredictionsBoardCtx.Provider value={value}>
      {children}
    </PredictionsBoardCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePredictionsBoard(): PredictionsBoardContext {
  const ctx = useContext(PredictionsBoardCtx);
  if (!ctx) {
    throw new Error(
      "usePredictionsBoard must be used inside <PredictionsProvider>",
    );
  }
  return ctx;
}
