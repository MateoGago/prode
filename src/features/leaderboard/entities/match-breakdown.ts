import { deriveHit } from "@/features/predictions/entities/match-card-state";
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
    home_team: { name: string } | null;
    away_team: { name: string } | null;
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
