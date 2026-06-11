/**
 * UI-ready shape of a match an admin can correct (PRO-28). Pure types only — it
 * lives here, NOT in the "use server" reader, because Turbopack turns every
 * export of a "use server" module into a Server Action binding; a type exported
 * from there (or re-exported through the barrel) breaks the build.
 */

import type { MatchStatus, Round } from "@/features/fixtures/entities/match";

/** A competing team rendered in the override form's advancer selector. */
export interface CorrectableMatchTeam {
  id: string;
  name: string;
}

/**
 * A match the admin can load or correct from the panel. No longer limited to
 * finished/confirmed: the panel is the manual fallback when the openfootball
 * sync hasn't run, so a still-`scheduled` group match must show up too. The
 * admin is the authority, not the cron.
 */
export interface CorrectableMatch {
  matchId: string;
  round: Round;
  homeTeam: CorrectableMatchTeam | null;
  awayTeam: CorrectableMatchTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  /** UTC kickoff instant (ISO) — identifies the match and orders the list. */
  kickoffAt: string;
  /** Lifecycle status, so the card can flag what's already confirmed. */
  status: MatchStatus;
}
