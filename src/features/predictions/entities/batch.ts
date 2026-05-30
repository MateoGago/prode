/**
 * Batch-save domain: types + the pure batch decision. No infra/framework
 * imports (REQ-XCUT-1). The Server Action is a thin I/O shell that loads match
 * contexts, calls `decideBatch`, then upserts only the accepted items.
 *
 * `decideBatch` mirrors `decideSave` but over N items and NEVER throws: a single
 * rejection (locked / invalid / missing match) is reported per-item and does not
 * poison the rest of the batch (constraint C).
 */

import {
  decideSave,
  type MatchKickoffContext,
  type PredictionError,
} from "./prediction";
import type { UpsertItem } from "./predictions-board";

/** Payload sent from the client to the batch-save action (serializable). */
export interface BatchSaveInput {
  items: UpsertItem[];
}

/** Per-item outcome of a batch save. */
export type BatchResultEntry =
  | { matchId: string; ok: true }
  | {
      matchId: string;
      ok: false;
      reason:
        | PredictionError
        | "locked"
        | "match_not_found"
        | "unauthenticated";
    };

/** Result of a batch save: one entry per submitted item, in input order. */
export interface BatchSaveResult {
  results: BatchResultEntry[];
}

/**
 * Decides each item against its authoritative match context (existence →
 * kickoff lock → shape validation), reusing the pure `decideSave`. Returns one
 * entry per item in input order; never throws.
 */
export function decideBatch(
  items: UpsertItem[],
  contextsByMatchId: Record<string, MatchKickoffContext>,
  now: Date,
): BatchResultEntry[] {
  return items.map((item) => {
    const context = contextsByMatchId[item.matchId] ?? null;
    const decision = decideSave(item, context, now);
    if (decision.ok) {
      return { matchId: item.matchId, ok: true };
    }
    return { matchId: item.matchId, ok: false, reason: decision.reason };
  });
}
