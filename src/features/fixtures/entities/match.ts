/**
 * Pure domain types for the fixtures feature — the heart of the domain.
 * No infra/framework imports.
 */

/** FIFA World Cup 2026 match rounds. */
export type Round =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third_place"
  | "final";

/** Multiplier applied to base points per round. */
export const ROUND_MULTIPLIERS: Record<Round, number> = {
  group: 1,
  r32: 1,
  r16: 2,
  qf: 3,
  sf: 4,
  third_place: 4,
  final: 5,
};

/** A national team participating in the tournament. */
export interface Team {
  id: string;
  /** Stable external key (provider-defined) — idempotent upsert key. */
  externalRef: string;
  name: string;
  /** Group label 'A'..'L'; null for knockout-only placeholders. */
  groupLabel: string | null;
  flagUrl: string | null;
}

/**
 * Match status lifecycle.
 * - scheduled: not yet started
 * - live: in progress
 * - finished: final whistle; scores available but not yet admin-confirmed
 * - confirmed: admin (or cron) has confirmed the result; scoring engine runs
 */
export type MatchStatus = "scheduled" | "live" | "finished" | "confirmed";

/**
 * A single fixture in the tournament.
 *
 * home/away team refs are nullable because knockout slots are known before
 * the qualifying teams are — placeholder strings fill the gap.
 */
export interface Match {
  id: string;
  /** Stable external key (provider-defined) — idempotent upsert key. */
  externalRef: string;
  round: Round;
  /** Denormalized from round so scoring never needs to re-derive it. */
  multiplier: number;
  /** Group-stage matchday (1-3); null for knockout rounds. */
  matchday: number | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  /** Human-readable slot label when team is still unknown (e.g. '1A', 'W of R32-1'). */
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  /** UTC kickoff instant. */
  kickoffAt: Date;
  status: MatchStatus;
  /** Final score including extra time (120'); null until finished. */
  homeScore: number | null;
  awayScore: number | null;
  /**
   * Set only when the knockout match ends level after 120' and goes to
   * penalties — holds the team that advanced via spot-kicks.
   */
  penaltyWinnerTeam: Team | null;
  /** Resolved advancer for knockout matches (winner or penalty winner). */
  advancerTeam: Team | null;
  resultConfirmedAt: Date | null;
}

/**
 * Snapshot of a confirmed match result used by the scoring engine.
 * Carries only what the scoring engine needs — no UI concerns.
 */
export interface MatchResult {
  matchId: string;
  round: Round;
  multiplier: number;
  homeScore: number;
  awayScore: number;
  /** Non-null only when penalties were needed to decide the advancer. */
  penaltyWinnerId: string | null;
  advancerId: string | null;
}

/**
 * The unique teams referenced by a fixture list, deduplicated by externalRef.
 * Null (placeholder knockout) slots are skipped — there is no team to seed yet.
 * Pure: the seed action upserts the result (teams before matches, FK order).
 */
export function collectUniqueTeams(matches: Match[]): Team[] {
  const byRef = new Map<string, Team>();
  for (const match of matches) {
    if (match.homeTeam !== null) {
      byRef.set(match.homeTeam.externalRef, match.homeTeam);
    }
    if (match.awayTeam !== null) {
      byRef.set(match.awayTeam.externalRef, match.awayTeam);
    }
  }
  return Array.from(byRef.values());
}
