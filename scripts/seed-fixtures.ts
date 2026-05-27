/**
 * Seed script (T-10) — populates teams + matches from the vendored
 * openfootball/worldcup.json dataset.
 *
 * Run: bun run seed   (Bun auto-loads .env.local)
 *
 * Requires (server-only): NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE.
 * The service_role key bypasses RLS so teams/matches can be written directly.
 * Idempotent: re-running upserts by external_ref, so it is safe to run twice.
 */

import { createClient } from "@supabase/supabase-js";
import { StaticFixtureProvider } from "../src/features/fixtures/infra/openfootball-provider";
import { SupabaseMatchesRepo } from "../src/features/fixtures/infra/supabase-matches-repo";
import { seedFixtures } from "../src/features/fixtures/use-case/seed-fixtures";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!url || !serviceRole) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE in .env.local.",
  );
  process.exit(1);
}

const client = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const provider = new StaticFixtureProvider();
const repo = new SupabaseMatchesRepo(client);

console.log("Seeding Mundial 2026 fixtures from openfootball dataset…");
await seedFixtures({ provider, repo });

const [{ count: teamsCount }, { count: matchesCount }] = await Promise.all([
  client.from("teams").select("*", { count: "exact", head: true }),
  client.from("matches").select("*", { count: "exact", head: true }),
]);

console.log(`Done. teams=${teamsCount} matches=${matchesCount}`);
