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
 *  - Group view (`group` set): every group-stage match of that group across the
 *    whole tournament. This is the escape hatch for a late-night game: a 23:00
 *    ART kickoff still belongs to its own kickoff day, so once midnight passes
 *    the "today" view drops it — the admin picks the group and corrects it
 *    anyway, no clock pressure.
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
   * When set (e.g. "D"), return ALL group-stage matches of that group across the
   * tournament, ignoring the day filter — the escape hatch for a late-night game
   * whose AR kickoff day is no longer "today".
   */
  group?: string;
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
  const { group, now = new Date() } = options;
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

  // Group view narrows to the group stage in SQL; the group_label match itself
  // happens in memory below (≤72 group matches — cheaper and simpler than an
  // embedded PostgREST filter on the joined teams resource). Applied while the
  // builder is still a filter builder, before .order() turns it into a transform.
  if (group) query = query.eq("round", "group");

  const { data, error } = await query.order("kickoff_at", { ascending: true });
  if (error) throw new Error(error.message);

  // Supabase infers embedded objects as arrays when it cannot determine FK
  // cardinality; cast through unknown to our one-to-one domain shape (same
  // approach as getMatchBreakdown).
  const rows = (data as unknown as CorrectableMatchRow[] | null) ?? [];

  if (group) {
    // Both teams of a group match share the group, so the home side's label
    // identifies the whole fixture.
    return rows
      .filter((row) => row.home_team?.group_label === group)
      .map(toCorrectableMatch);
  }

  // Keep only the matches whose AR-local kickoff day is today — the same day
  // definition the cards display in, so grouping never drifts from the labels.
  const todayKey = arDayParts(now).key;
  return rows
    .filter((row) => arDayParts(row.kickoff_at).key === todayKey)
    .map(toCorrectableMatch);
}
