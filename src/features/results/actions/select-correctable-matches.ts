"use server";

/**
 * Read the matches an admin can load or correct, UI-ready for ConfirmResultForm
 * (PRO-28). Precomputed server-side so nothing non-serializable crosses the RSC
 * boundary, mirroring the LeaderboardRow.href pattern. Thin additive I/O only:
 * no business logic.
 *
 * Two views, one for each way an admin reaches the panel:
 *  - Default ("today"): every match whose AR-local kickoff day is today,
 *    regardless of status. The day boundary uses arDayParts — the SAME
 *    America/Argentina/Buenos_Aires definition the rest of the UI shows kickoffs
 *    in — so a 21:00 ART kickoff lands under the ART day, never the UTC one.
 *  - Round view (`round` set): every match of that knockout round across the
 *    whole tournament. This is the escape hatch once the group stage is over:
 *    the admin picks a phase (16avos, Octavos, …) and loads/corrects its results
 *    regardless of the calendar day, no clock pressure.
 *
 * Why no status filter: the panel is the manual fallback when the openfootball
 * sync hasn't loaded results. Filtering to finished/confirmed hid every match
 * still `scheduled`, so an admin had nowhere to enter a result by hand. The
 * authority is the admin, not the cron — every match shows up regardless of
 * status, as long as both teams are known (knockout placeholders are resolved
 * in the bracket-slot section instead).
 */

import type { MatchStatus, Round } from "@/features/fixtures/entities/match";
import { arDayParts } from "@/shared/datetime";
import { createClient } from "@/shared/supabase/server";
import type { CorrectableMatch } from "../entities/correctable-match";

interface CorrectableMatchRow {
  id: string;
  round: string;
  status: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { id: string; name: string; group_label: string | null } | null;
  away_team: { id: string; name: string } | null;
}

export interface SelectCorrectableMatchesOptions {
  /**
   * When set (e.g. "r16"), return ALL matches of that round across the
   * tournament, ignoring the day filter — the escape hatch for loading a
   * knockout phase's results regardless of the calendar day.
   */
  round?: Round;
  /** Injectable clock for the default "today" view (kept for tests). */
  now?: Date;
}

function toCorrectableMatch(row: CorrectableMatchRow): CorrectableMatch {
  return {
    matchId: row.id,
    round: row.round as Round,
    homeTeam: row.home_team
      ? { id: row.home_team.id, name: row.home_team.name }
      : null,
    awayTeam: row.away_team
      ? { id: row.away_team.id, name: row.away_team.name }
      : null,
    homeScore: row.home_score,
    awayScore: row.away_score,
    kickoffAt: row.kickoff_at,
    status: row.status as MatchStatus,
  };
}

export async function selectCorrectableMatches(
  options: SelectCorrectableMatchesOptions = {},
): Promise<CorrectableMatch[]> {
  const { round, now = new Date() } = options;
  const supabase = await createClient();

  let query = supabase
    .from("matches")
    .select(
      `id,
       round,
       status,
       kickoff_at,
       home_score,
       away_score,
       home_team:teams!matches_home_team_id_fkey(id, name, group_label),
       away_team:teams!matches_away_team_id_fkey(id, name)`,
    )
    // Both teams known: a result can only be entered for a real fixture.
    // Unresolved knockout slots live in the bracket-slot section instead.
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null);

  // Round view narrows to a single round (e.g. "r16") in SQL. Applied while the
  // builder is still a filter builder, before .order() turns it into a transform.
  if (round) query = query.eq("round", round);

  const { data, error } = await query.order("kickoff_at", { ascending: true });
  if (error) throw new Error(error.message);

  // Supabase infers embedded objects as arrays when it cannot determine FK
  // cardinality; cast through unknown to our one-to-one domain shape (same
  // approach as getMatchBreakdown).
  const rows = (data as unknown as CorrectableMatchRow[] | null) ?? [];

  if (round) {
    // The round filter is fully resolved in SQL — return every match of it.
    return rows.map(toCorrectableMatch);
  }

  // Keep only the matches whose AR-local kickoff day is today — the same day
  // definition the cards display in, so grouping never drifts from the labels.
  const todayKey = arDayParts(now).key;
  return rows
    .filter((row) => arDayParts(row.kickoff_at).key === todayKey)
    .map(toCorrectableMatch);
}
