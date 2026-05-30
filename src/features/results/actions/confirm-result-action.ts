"use server";

/**
 * Admin-only Server Action to confirm a match result. The role gate is enforced
 * here server-side, never by hiding the button (REQ-RES-5); the
 * matches_admin_write RLS policy is the backstop.
 */

import { revalidatePath } from "next/cache";

import type { Round } from "@/features/fixtures/entities/match";
import { createAdminClient } from "@/shared/supabase/admin";
import { createClient } from "@/shared/supabase/server";
import {
  type ConfirmActionResult,
  type ResultInput,
  validateResultInput,
} from "../entities/confirm-result";
import { confirmResult } from "./confirm-result";

export type { ConfirmActionResult };

export async function confirmResultAction(
  input: ResultInput,
): Promise<ConfirmActionResult> {
  const supabase = await createClient();

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

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("round, home_team_id, away_team_id")
    .eq("id", input.matchId)
    .maybeSingle();
  if (matchError) throw new Error(`read match failed: ${matchError.message}`);
  if (!match) return { ok: false, reason: "match_not_found" };

  const validation = validateResultInput(input, {
    round: match.round as Round,
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
  });
  if (!validation.ok) return { ok: false, reason: validation.reason };

  // service_role bypasses the guard trigger — the only path that can write points.
  const admin = createAdminClient();
  const { recomputed } = await confirmResult(admin, {
    matchId: input.matchId,
    round: match.round as Round,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    advancerTeamId: input.advancerTeamId,
  });

  revalidatePath("/admin");
  return { ok: true, recomputed };
}
