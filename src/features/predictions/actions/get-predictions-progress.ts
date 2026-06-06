import { cache } from "react";

import { getCachedGroupStageMatchCount } from "@/features/fixtures/actions/get-global-matches";
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
 * Two lightweight count reads (head + count: 'exact'): the group-stage total and
 * the user's predictions on those matches. `loaded` filters predictions by the
 * embedded match's round via an inner join, so we never round-trip the ~72 match
 * ids back to JS just to feed an `.in()`. deriveProgress needs full arrays and is
 * overkill for a denominator/numerator pair.
 */
export const getPredictionsProgress = cache(
  async function getPredictionsProgress(
    userId: string,
  ): Promise<PredictionProgress> {
    const supabase = await createClient();

    // The denominator (group-stage match count) is GLOBAL — served from the
    // cross-request cache. The numerator (this user's predictions) is per-user and
    // stays a live RLS read. Independent, so run them together.
    // predictions → matches is N:1, so the inner join yields one row per
    // prediction; counting it gives the user's group-stage predictions directly.
    const [total, { count: loaded, error: loadedError }] = await Promise.all([
      getCachedGroupStageMatchCount(),
      supabase
        .from("predictions")
        .select("match_id, matches!inner(round)", {
          count: "exact",
          head: true,
        })
        .eq("user_id", userId)
        .eq("matches.round", "group"),
    ]);
    if (loadedError) {
      throw new Error(
        `count loaded predictions failed: ${loadedError.message}`,
      );
    }

    if (!total) return { loaded: 0, total: 0 };

    return { loaded: loaded ?? 0, total };
  },
);
