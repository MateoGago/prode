"use server";

/**
 * Admin-only Server Action to assign a team to an unresolved knockout bracket
 * slot (home_team_id or away_team_id). The role gate is enforced server-side
 * (defense-in-depth); the matches_admin_write RLS policy is the backstop — the
 * same pattern as confirmResultAction, but using the USER client (not
 * service_role) because this write does NOT need to bypass any trigger.
 */

import { revalidatePath } from "next/cache";

import type { Match, Team } from "@/features/fixtures/entities/match";
import { createClient } from "@/shared/supabase/server";
import type {
  ResolveSlotInput,
  ResolveSlotResult,
} from "../entities/resolve-slot";
import { validateResolveSlot } from "../entities/resolve-slot";

export async function resolveSlotAction(
  input: ResolveSlotInput,
): Promise<ResolveSlotResult> {
  const supabase = await createClient();

  // ── Auth + admin gate ──────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "forbidden" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return { ok: false, reason: "forbidden" };

  // ── Fetch match ────────────────────────────────────────────────────────────
  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select(
      `id,
       round,
       home_team:teams!matches_home_team_id_fkey(id, name, external_ref, group_label, flag_url),
       away_team:teams!matches_away_team_id_fkey(id, name, external_ref, group_label, flag_url)`,
    )
    .eq("id", input.matchId)
    .maybeSingle();

  if (matchError) throw new Error(`read match failed: ${matchError.message}`);
  if (!matchRow) return { ok: false, reason: "match_not_found" };

  // ── Fetch all teams for referential check ─────────────────────────────────
  const { data: teamRows, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, external_ref, group_label, flag_url");

  if (teamsError) throw new Error(`read teams failed: ${teamsError.message}`);

  const teams: Team[] = (teamRows ?? []).map((t) => ({
    id: t.id,
    externalRef: t.external_ref,
    name: t.name,
    groupLabel: t.group_label,
    flagUrl: t.flag_url,
  }));

  // Build a minimal Match for the pure validator (only `round` is needed).
  const match: Match = {
    id: matchRow.id,
    externalRef: matchRow.id,
    round: matchRow.round as Match["round"],
    multiplier: 1,
    matchday: null,
    homeTeam: null,
    awayTeam: null,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date(0),
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
  };

  // ── Pure validation ────────────────────────────────────────────────────────
  const validation = validateResolveSlot(input, match, teams);
  if (!validation.ok) return validation;

  // ── Persist ────────────────────────────────────────────────────────────────
  const column = input.slot === "home" ? "home_team_id" : "away_team_id";

  const { error: updateError } = await supabase
    .from("matches")
    .update({ [column]: input.teamId })
    .eq("id", input.matchId);

  if (updateError)
    throw new Error(`update match failed: ${updateError.message}`);

  revalidatePath("/fixture");
  revalidatePath("/admin");

  return {
    ok: true,
    matchId: input.matchId,
    slot: input.slot,
    teamId: input.teamId,
  };
}
