import { createClient } from "@/shared/supabase/server";

import type { PredictionProgress } from "../entities/predictions-board";

/**
 * Cross-app single source of truth for the "X/72 cargadas" indicator.
 *
 * The nav badge and the Inicio dashboard BOTH read from here so the number is
 * identical everywhere. Scoped to the group stage on purpose:
 *  - `total`  = group-stage matches (round = 'group') — the "72".
 *  - `loaded` = the user's saved predictions on those group-stage matches, so
 *    `loaded ≤ total` always holds (knockout predictions never inflate it).
 *
 * A lightweight count read (head + count: 'exact'); deriveProgress needs full
 * arrays and is overkill for a denominator/numerator pair.
 */
export async function getPredictionsProgress(
  userId: string,
): Promise<PredictionProgress> {
  const supabase = await createClient();

  const { count: total, error: totalError } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("round", "group");
  if (totalError) {
    throw new Error(`count group matches failed: ${totalError.message}`);
  }

  // No group-stage match ids → nothing can be loaded; skip the second read.
  if (!total) return { loaded: 0, total: 0 };

  const { data: groupMatches, error: idsError } = await supabase
    .from("matches")
    .select("id")
    .eq("round", "group");
  if (idsError) {
    throw new Error(`load group match ids failed: ${idsError.message}`);
  }

  const groupMatchIds = ((groupMatches ?? []) as { id: string }[]).map(
    (m) => m.id,
  );

  const { count: loaded, error: loadedError } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("match_id", groupMatchIds);
  if (loadedError) {
    throw new Error(`count loaded predictions failed: ${loadedError.message}`);
  }

  return { loaded: loaded ?? 0, total };
}
