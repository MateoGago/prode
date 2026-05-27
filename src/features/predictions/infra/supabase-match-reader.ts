/**
 * SupabaseMatchReader — reads the authoritative match context for a prediction.
 *
 * kickoff_at and round come from the DB (server time / source of truth), never
 * the client. The pure mapper is tested; the query is a thin shell.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Round } from "../../fixtures/model";
import type { MatchKickoffContext, MatchReader } from "../ports/match-reader";

export interface MatchContextRow {
  round: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string;
}

/** Maps a `matches` row to the domain MatchKickoffContext. */
export function rowToContext(row: MatchContextRow): MatchKickoffContext {
  return {
    round: row.round as Round,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    kickoffAt: new Date(row.kickoff_at),
  };
}

export class SupabaseMatchReader implements MatchReader {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getContext(matchId: string): Promise<MatchKickoffContext | null> {
    const { data, error } = await this.client
      .from("matches")
      .select("round, home_team_id, away_team_id, kickoff_at")
      .eq("id", matchId)
      .maybeSingle();
    if (error) throw new Error(`read match failed: ${error.message}`);
    if (!data) return null;
    return rowToContext(data as MatchContextRow);
  }
}
