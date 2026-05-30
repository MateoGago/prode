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
 * Slice 4 wires saveBatch() with the real Server Action + useTransition.
 * This scaffold exposes saveBatch() as a no-op stub.
 */

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  selectBatch,
} from "@/features/predictions/entities/predictions-board";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

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
  /** Scroll the viewport to the group's section anchor. */
  jumpToGroup(label: string): void;
  /**
   * Persist dirty, non-locked predictions.
   * Stub in Slice 1 — wired to the real Server Action in Slice 4.
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
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PredictionsProvider({
  initialPredictions,
  groups,
  children,
}: PredictionsProviderProps) {
  // _setSavedMap: promoted to a real setter in Slice 4 when batch results arrive
  const [savedMap, _setSavedMap] =
    useState<Record<string, PredictionInput>>(initialPredictions);
  const [workingMap, setWorkingMap] = useState<Record<string, PredictionInput>>(
    {},
  );
  const [filter, setFilter] = useState<FilterKind>("todos");
  const [errorsByMatchId, setErrorsByMatchId] = useState<
    Record<string, string>
  >({});
  // _setPending: set to true during batch save transition in Slice 4
  const [pending, _setPending] = useState(false);

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
    () => deriveProgress(allMatches, savedMap, new Date()),
    [allMatches, savedMap],
  );

  const groupProgress = useMemo(
    () => groupMatchIds.map((g) => deriveGroupProgress(g, savedMap)),
    [groupMatchIds, savedMap],
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function setPrediction(matchId: string, next: PredictionInput) {
    setWorkingMap((current) => ({ ...current, [matchId]: next }));
    // Clear any previous error for this match on edit
    setErrorsByMatchId((current) => {
      const { [matchId]: _, ...rest } = current;
      return rest;
    });
  }

  function getLock(matchId: string, kickoffAt: Date): LockInfo {
    // Find match status from groups
    let status: "scheduled" | "live" | "finished" | "confirmed" | undefined;
    for (const group of groups) {
      const match = group.matches.find((m) => m.id === matchId);
      if (match) {
        status = match.status as typeof status;
        break;
      }
    }
    return deriveLock({ kickoffAt, status }, new Date());
  }

  function getCardState(matchId: string, kickoffAt: Date): CardState {
    const saved = savedMap[matchId] ?? null;
    const working = workingMap[matchId];
    const lock = getLock(matchId, kickoffAt);
    return deriveCardState(saved, working, lock);
  }

  function getBatch(): UpsertItem[] {
    // Build lock set from current client time
    const now = new Date();
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
  }

  function jumpToGroup(label: string) {
    const el = document.getElementById(label);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /** Stub — replaced in Slice 4 with the real Server Action + useTransition. */
  async function saveBatch(): Promise<void> {
    // no-op in Slice 1
  }

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value: PredictionsBoardContext = {
    savedMap,
    workingMap,
    dirty,
    progress,
    groupProgress,
    filter,
    errorsByMatchId,
    pending,
    setPrediction,
    getLock,
    getCardState,
    getBatch,
    setFilter,
    jumpToGroup,
    saveBatch,
  };

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
