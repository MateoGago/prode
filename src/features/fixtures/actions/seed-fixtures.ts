/**
 * seedFixtures — populates teams + matches from the openfootball dataset.
 *
 * Teams are upserted BEFORE matches to satisfy the FK constraint. Idempotent by
 * external_ref, so re-running is safe. Defaults to the vendored snapshot; pass
 * live data to seed from a fresh fetch.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { collectUniqueTeams } from "../entities/match";
import {
  datasetToFixtures,
  type OpenFootballData,
} from "../entities/openfootball";
import { loadVendoredDataset } from "./dataset";
import { upsertMatches, upsertTeams } from "./persist";

export async function seedFixtures(
  client: SupabaseClient,
  data: OpenFootballData = loadVendoredDataset(),
): Promise<void> {
  const matches = datasetToFixtures(data);
  await upsertTeams(client, collectUniqueTeams(matches));
  await upsertMatches(client, matches);
}
