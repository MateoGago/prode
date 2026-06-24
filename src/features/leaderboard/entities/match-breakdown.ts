import { deriveHit } from "@/features/predictions/entities/match-card-state";
import { arDayParts } from "@/shared/datetime";
import type { MatchBreakdownItem } from "../components/match-breakdown-list";

export type BreakdownPredictionRow = {
  match_id: string;
  home_score: number | string;
  away_score: number | string;
  points_awarded: number | string;
  match: {
    home_score: number | string | null;
    away_score: number | string | null;
    multiplier?: number | null;
    status?: string | null;
    kickoff_at?: string | null;
    home_team: { name: string; flag_url?: string | null } | null;
    away_team: { name: string; flag_url?: string | null } | null;
  } | null;
};

export function mapMatchBreakdown(
  rows: BreakdownPredictionRow[] | null | undefined,
): MatchBreakdownItem[] {
  if (!rows) return [];

  return rows.reduce<MatchBreakdownItem[]>((acc, row) => {
    if (!row.match) return acc;

    const homeName = row.match.home_team?.name ?? "Equipo";
    const awayName = row.match.away_team?.name ?? "Equipo";

    const predictedHomeScore = Number(row.home_score);
    const predictedAwayScore = Number(row.away_score);
    const actualHomeScore = Number(row.match.home_score);
    const actualAwayScore = Number(row.match.away_score);

    acc.push({
      matchId: row.match_id,
      matchLabel: `${homeName} vs ${awayName}`,
      kickoffAt: row.match.kickoff_at ?? "",
      homeTeamName: homeName,
      awayTeamName: awayName,
      homeFlagUrl: row.match.home_team?.flag_url ?? null,
      awayFlagUrl: row.match.away_team?.flag_url ?? null,
      predictedHomeScore,
      predictedAwayScore,
      actualHomeScore,
      actualAwayScore,
      pointsAwarded: Number(row.points_awarded),
      hitType: deriveHit(
        { homeScore: predictedHomeScore, awayScore: predictedAwayScore },
        { homeScore: actualHomeScore, awayScore: actualAwayScore },
      ),
      multiplier: row.match.multiplier ?? 1,
    });

    return acc;
  }, []);
}

/** A calendar-day bucket of breakdown rows (AR-local), newest day first. */
export interface BreakdownDayBlock {
  /** AR-local "YYYY-MM-DD" — anchor id + sort key. */
  dateKey: string;
  /** Day of month, unpadded (badge). */
  day: string;
  /** Capitalized AR weekday (e.g. "Jueves"). */
  weekday: string;
  /** Capitalized AR month (e.g. "Junio"). */
  month: string;
  items: MatchBreakdownItem[];
}

/**
 * Groups breakdown rows by their AR-local kickoff day, newest first — so the
 * latest results lead and the user doesn't scroll past old fixtures. Days are
 * ordered descending by date key; rows within a day descend by kickoff too.
 * Rows missing a kickoff fall into a trailing "Sin fecha" bucket.
 */
export function groupMatchBreakdownByDay(
  items: MatchBreakdownItem[],
): BreakdownDayBlock[] {
  const buckets = new Map<string, BreakdownDayBlock>();

  for (const item of items) {
    const parts = item.kickoffAt
      ? arDayParts(item.kickoffAt)
      : { key: "0000-00-00", day: "–", weekday: "Sin fecha", month: "" };

    let block = buckets.get(parts.key);
    if (!block) {
      block = {
        dateKey: parts.key,
        day: parts.day,
        weekday: parts.weekday,
        month: parts.month,
        items: [],
      };
      buckets.set(parts.key, block);
    }
    block.items.push(item);
  }

  // "YYYY-MM-DD" strings sort lexicographically — descending gives newest-first.
  const blocks = Array.from(buckets.values()).sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey),
  );
  for (const block of blocks) {
    block.items.sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt));
  }

  return blocks;
}
