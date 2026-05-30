import type { MatchBreakdownItem } from "../components/match-breakdown-list";

export type BreakdownPredictionRow = {
  match_id: string;
  home_score: number | string;
  away_score: number | string;
  points_awarded: number | string;
  match: {
    home_score: number | string | null;
    away_score: number | string | null;
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

    acc.push({
      matchId: row.match_id,
      matchLabel: `${homeName} vs ${awayName}`,
      predictedHomeScore: Number(row.home_score),
      predictedAwayScore: Number(row.away_score),
      actualHomeScore: Number(row.match.home_score),
      actualAwayScore: Number(row.match.away_score),
      pointsAwarded: Number(row.points_awarded),
    });

    return acc;
  }, []);
}
