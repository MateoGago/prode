/**
 * Port for reading the authoritative match context needed to validate and lock
 * a prediction. Kickoff comes from the DB (server time), never the client.
 */

import type { MatchContext } from "../domain/prediction-rules";

export interface MatchKickoffContext extends MatchContext {
  kickoffAt: Date;
}

export interface MatchReader {
  /** Returns the match context, or null when the match does not exist. */
  getContext(matchId: string): Promise<MatchKickoffContext | null>;
}
