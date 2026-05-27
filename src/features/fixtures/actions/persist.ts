/**
 * Persistence (I/O) for fixtures — talks to Supabase directly. Run by the seed
 * and sync scripts with the service_role key, which bypasses RLS. The pure row
 * mappers live in entities/rows.ts; this is the thin shell that issues the
 * upserts, verified by running a seed.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Match, Team } from "../entities/match";
import { matchToRow, teamToRow } from "../entities/rows";

/** Idempotent upsert of teams by external_ref. */
export async function upsertTeams(
  client: SupabaseClient,
  teams: Team[],
): Promise<void> {
  const { error } = await client
    .from("teams")
    .upsert(teams.map(teamToRow), { onConflict: "external_ref" });
  if (error) throw new Error(`upsertTeams failed: ${error.message}`);
}

/**
 * Idempotent upsert of matches by external_ref. Matches FK-reference teams by
 * uuid, so we resolve each team's externalRef against the already-seeded rows.
 */
export async function upsertMatches(
  client: SupabaseClient,
  matches: Match[],
): Promise<void> {
  const { data, error } = await client.from("teams").select("id, external_ref");
  if (error) throw new Error(`resolving team ids failed: ${error.message}`);

  const rows = data as Array<{ id: string; external_ref: string }>;
  const teamIdByRef = new Map(rows.map((t) => [t.external_ref, t.id]));

  const { error: upsertError } = await client.from("matches").upsert(
    matches.map((m) => matchToRow(m, teamIdByRef)),
    {
      onConflict: "external_ref",
    },
  );
  if (upsertError) {
    throw new Error(`upsertMatches failed: ${upsertError.message}`);
  }
}
