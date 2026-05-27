/**
 * syncFixtures — refreshes match state from the live dataset.
 *
 * Upserts MATCHES ONLY. It deliberately does NOT touch teams: the 48 teams are
 * a fixed set seeded once with their localized (Spanish) names and flags, so a
 * scheduled sync can never clobber that display data. What changes over the
 * tournament — scores, status, and the bracket resolving from placeholders to
 * real teams — all lives on matches. Idempotent by external_ref.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  datasetToFixtures,
  type OpenFootballData,
} from "../entities/openfootball";
import { upsertMatches } from "./persist";

export async function syncFixtures(
  client: SupabaseClient,
  data: OpenFootballData,
): Promise<void> {
  await upsertMatches(client, datasetToFixtures(data));
}
