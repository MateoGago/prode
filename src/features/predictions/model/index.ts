/**
 * Pure domain types for the predictions feature.
 * No infra/framework imports.
 */

/**
 * A user's prediction for a single match.
 *
 * advancerTeamId is required ONLY when:
 *   - the match is a knockout round (round !== 'group'), AND
 *   - the user predicts a draw (homeScore === awayScore).
 * In all other cases it must be null.
 *
 * This constraint is enforced at the application layer (use-case) and
 * backed by RLS/trigger at the DB layer — NOT here (pure types can't run logic).
 */
export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  /**
   * The team the user believes will advance when they predict a knockout draw.
   * Must be one of the two competing teams (validated server-side).
   */
  advancerTeamId: string | null;
  /** Denormalized points from the scoring engine; 0 until result is confirmed. */
  pointsAwarded: number;
  scoredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
