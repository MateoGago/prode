/**
 * Results sync — refreshes matches from the LIVE openfootball dataset.
 *
 * Run: bun run sync   (Bun auto-loads .env.local; CI passes env explicitly)
 *
 * Unlike `seed` (which reads the vendored snapshot), this fetches the dataset
 * live, so it picks up scores AND the resolved knockout bracket as the
 * tournament progresses. Idempotent upsert by external_ref — safe to run on a
 * schedule. Meant to be triggered by .github/workflows/sync-results.yml.
 *
 * Requires (server-only): NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE.
 */

import { createClient } from "@supabase/supabase-js";
import { StaticFixtureProvider } from "../src/features/fixtures/infra/openfootball-provider";
import { SupabaseMatchesRepo } from "../src/features/fixtures/infra/supabase-matches-repo";
import { syncFixtures } from "../src/features/fixtures/use-case/sync-fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!url || !serviceRole) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE.",
  );
  process.exit(1);
}

const client = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("Syncing results + bracket from live openfootball dataset…");
const provider = await StaticFixtureProvider.fromRemote();
const repo = new SupabaseMatchesRepo(client);
// Matches only — teams are seeded once (with localized names + flags) and never
// re-touched here, so a scheduled sync can never clobber that display data.
await syncFixtures({ provider, repo });

const { count } = await client
  .from("matches")
  .select("*", { count: "exact", head: true })
  .neq("status", "scheduled");

console.log(`Done. matches with a result=${count ?? 0}`);
