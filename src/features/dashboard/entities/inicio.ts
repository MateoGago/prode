/**
 * View-model for the "Inicio" dashboard: pure derivation + mappers that turn
 * cross-feature reads (fixtures, leaderboard, predictions) into what the page
 * renders. No I/O — the page (Server Component) runs the queries and feeds
 * these the already-mapped domain objects.
 */

import type { Match } from "@/features/fixtures/entities/match";
import type {
  LeaderboardRow,
  MatchBreakdownItem,
} from "@/features/leaderboard";
import { rankByPoints } from "@/features/leaderboard/entities/leaderboard";

/**
 * The player's next pronosticable match: the soonest `scheduled` fixture whose
 * kickoff is still in the future and whose teams are both known (placeholders
 * can't be shown or predicted). Returns null when nothing qualifies.
 */
export function selectNextMatch(matches: Match[], now: Date): Match | null {
  const nowMs = now.getTime();

  const candidates = matches
    .filter(
      (m) =>
        m.status === "scheduled" &&
        m.kickoffAt.getTime() > nowMs &&
        m.homeTeam !== null &&
        m.awayTeam !== null,
    )
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

  return candidates[0] ?? null;
}

/**
 * How many still-open matches the player has NOT predicted yet. Drives the
 * honest "Te faltan N pronósticos" nudge (replaces the proof's fabricated
 * streak — there is no streak data model).
 */
export function countPendingPredictions(
  matches: Match[],
  predictedMatchIds: Set<string>,
  now: Date,
): number {
  const nowMs = now.getTime();

  return matches.filter(
    (m) =>
      m.status === "scheduled" &&
      m.kickoffAt.getTime() > nowMs &&
      !predictedMatchIds.has(m.id),
  ).length;
}

export interface PlayerStats {
  /** Sequential position in the leaderboard; null until the player scores. */
  position: number | null;
  points: number;
}

/**
 * The current player's leaderboard position and points. Ranking mirrors the
 * leaderboard table exactly: total points DESC, sequential positions (ties
 * broken by name), so "tu puesto" matches the table row. A player absent from
 * the board (no points yet) gets null position and 0 points.
 */
export function derivePlayerStats(
  rows: LeaderboardRow[],
  userId: string,
): PlayerStats {
  const own = rankByPoints(rows).find((row) => row.playerId === userId);
  return own
    ? { position: own.rank, points: own.totalPoints }
    : { position: null, points: 0 };
}

/** Result-pill flavour, mirrors the proof's `.pts win|part|zero`. */
export type LastResultKind = "win" | "partial" | "zero";

export interface LastResultRow {
  matchId: string;
  /** Mono score pill, e.g. "2–1" (en dash, matches the proof). */
  score: string;
  matchLabel: string;
  /** Signed points label, e.g. "+3" / "0". */
  points: string;
  kind: LastResultKind;
  /** "Pronosticaste X–Y · …" honesty line. */
  detail: string;
}

function classify(item: MatchBreakdownItem): LastResultKind {
  if (item.pointsAwarded <= 0) return "zero";
  const exact =
    item.predictedHomeScore === item.actualHomeScore &&
    item.predictedAwayScore === item.actualAwayScore;
  return exact ? "win" : "partial";
}

function detailFor(item: MatchBreakdownItem, kind: LastResultKind): string {
  const predicted = `${item.predictedHomeScore}–${item.predictedAwayScore}`;
  if (kind === "win") {
    return `Pronosticaste ${predicted} · resultado exacto`;
  }
  if (kind === "partial") {
    return `Pronosticaste ${predicted} · acertaste el ganador`;
  }
  return `Pronosticaste ${predicted} · no salió`;
}

/**
 * Map confirmed-prediction breakdown items into "Últimos resultados" rows,
 * newest first (the underlying query is ascending by kickoff), limited to
 * `limit`. Only data we can actually back: score, prediction, and the points
 * already awarded by the scoring engine.
 */
export function mapLastResults(
  items: MatchBreakdownItem[],
  limit = 5,
): LastResultRow[] {
  return [...items]
    .reverse()
    .slice(0, limit)
    .map((item) => {
      const kind = classify(item);
      return {
        matchId: item.matchId,
        score: `${item.actualHomeScore}–${item.actualAwayScore}`,
        matchLabel: item.matchLabel,
        points: item.pointsAwarded > 0 ? `+${item.pointsAwarded}` : "0",
        kind,
        detail: detailFor(item, kind),
      };
    });
}
