/**
 * UI-ready shape of a match an admin can correct (PRO-28). Pure types only — it
 * lives here, NOT in the "use server" reader, because Turbopack turns every
 * export of a "use server" module into a Server Action binding; a type exported
 * from there (or re-exported through the barrel) breaks the build.
 */

import type { Round } from "@/features/fixtures/entities/match";

/** A competing team rendered in the override form's advancer selector. */
export interface CorrectableMatchTeam {
  id: string;
  name: string;
}

/** A finished/confirmed match with the data the override form needs. */
export interface CorrectableMatch {
  matchId: string;
  round: Round;
  homeTeam: CorrectableMatchTeam | null;
  awayTeam: CorrectableMatchTeam | null;
  homeScore: number | null;
  awayScore: number | null;
}
