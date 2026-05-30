"use server";

/**
 * saveBatchPredictions — persists many predictions in ONE server roundtrip.
 *
 * Thin I/O shell around the pure `decideBatch`:
 * 1. Derive userId from the session (`auth.getUser()`), NEVER from client params
 *    (constraint E — the client can't impersonate another user).
 * 2. Load every referenced match in a single `.in('id', …)` query (design §1).
 * 3. Decide each item purely; upsert only the accepted ones under the user's
 *    session so RLS enforces ownership + the kickoff lock (the real authority).
 *
 * A single rejection never fails the whole batch (constraint C): rejected items
 * come back as `{ ok:false, reason }` while the rest still persist.
 */

import { createClient } from "@/shared/supabase/server";
import {
  type BatchSaveInput,
  type BatchSaveResult,
  decideBatch,
} from "../entities/batch";
import {
  type MatchContextRow,
  predictionToRow,
  rowToContext,
} from "../entities/rows";

export async function saveBatchPredictions(
  input: BatchSaveInput,
): Promise<BatchSaveResult> {
  const { items } = input;
  if (items.length === 0) return { results: [] };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      results: items.map((item) => ({
        matchId: item.matchId,
        ok: false as const,
        reason: "locked" as const,
      })),
    };
  }

  const matchIds = items.map((item) => item.matchId);
  const { data, error } = await supabase
    .from("matches")
    .select("id, round, home_team_id, away_team_id, kickoff_at")
    .in("id", matchIds);
  if (error) throw new Error(`read matches failed: ${error.message}`);

  const contextsByMatchId: Record<string, ReturnType<typeof rowToContext>> = {};
  for (const row of data ?? []) {
    const { id, ...rest } = row as MatchContextRow & { id: string };
    contextsByMatchId[id] = rowToContext(rest);
  }

  const results = decideBatch(items, contextsByMatchId, new Date());

  const accepted = items.filter((_, i) => results[i].ok === true);
  if (accepted.length > 0) {
    const { error: upsertError } = await supabase.from("predictions").upsert(
      accepted.map((item) => predictionToRow({ ...item, userId: user.id })),
      { onConflict: "user_id,match_id" },
    );
    if (upsertError) {
      throw new Error(`upsert predictions failed: ${upsertError.message}`);
    }
  }

  return { results };
}
