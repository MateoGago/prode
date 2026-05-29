import { redirect } from "next/navigation";

import type {
  Match,
  MatchStatus,
  Round,
  Team,
} from "@/features/fixtures/entities/match";
import { PredictionsPageClient, type GroupBlock } from "@/features/predictions";
import type { PredictionInput } from "@/features/predictions/entities/prediction";
import { createClient } from "@/shared/supabase/server";

type TeamRow = {
  id: string;
  external_ref: string;
  name: string;
  group_label: string | null;
  flag_url: string | null;
} | null;

type TeamRelationRow = TeamRow | Exclude<TeamRow, null>[];

type MatchRow = {
  id: string;
  external_ref: string;
  round: string;
  multiplier: number;
  matchday: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  result_confirmed_at: string | null;
  home_team: TeamRelationRow;
  away_team: TeamRelationRow;
  penalty_winner_team: TeamRelationRow;
  advancer_team: TeamRelationRow;
};

type PredictionRow = {
  match_id: string;
  home_score: number;
  away_score: number;
  advancer_team_id: string | null;
};

function mapTeamRow(row: TeamRow): Team | null {
  if (!row) return null;

  return {
    id: row.id,
    externalRef: row.external_ref,
    name: row.name,
    groupLabel: row.group_label,
    flagUrl: row.flag_url,
  };
}

function normalizeTeamRelation(row: TeamRelationRow): TeamRow {
  if (Array.isArray(row)) return row[0] ?? null;
  return row;
}

function mapMatchRow(row: MatchRow): Match {
  return {
    id: row.id,
    externalRef: row.external_ref,
    round: row.round as Round,
    multiplier: row.multiplier,
    matchday: row.matchday,
    homeTeam: mapTeamRow(normalizeTeamRelation(row.home_team)),
    awayTeam: mapTeamRow(normalizeTeamRelation(row.away_team)),
    homePlaceholder: row.home_placeholder,
    awayPlaceholder: row.away_placeholder,
    kickoffAt: new Date(row.kickoff_at),
    status: row.status as MatchStatus,
    homeScore: row.home_score,
    awayScore: row.away_score,
    penaltyWinnerTeam: mapTeamRow(
      normalizeTeamRelation(row.penalty_winner_team),
    ),
    advancerTeam: mapTeamRow(normalizeTeamRelation(row.advancer_team)),
    resultConfirmedAt: row.result_confirmed_at
      ? new Date(row.result_confirmed_at)
      : null,
  };
}

function buildPredictionsByMatchId(
  rows: PredictionRow[],
): Record<string, PredictionInput | null> {
  const byMatchId: Record<string, PredictionInput | null> = {};

  for (const row of rows) {
    byMatchId[row.match_id] = {
      homeScore: row.home_score,
      awayScore: row.away_score,
      advancerTeamId: row.advancer_team_id,
    };
  }

  return byMatchId;
}

function groupMatches(matches: Match[]): GroupBlock[] {
  const grouped = new Map<string, Match[]>();

  for (const match of matches) {
    if (match.round !== "group") continue;
    const groupLabel =
      match.homeTeam?.groupLabel ?? match.awayTeam?.groupLabel ?? "Sin grupo";
    const list = grouped.get(groupLabel);
    if (list) {
      list.push(match);
    } else {
      grouped.set(groupLabel, [match]);
    }
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([groupLabel, groupMatchesList]) => ({
      groupLabel,
      matches: [...groupMatchesList].sort((a, b) => {
        const matchdayA = a.matchday ?? Number.MAX_SAFE_INTEGER;
        const matchdayB = b.matchday ?? Number.MAX_SAFE_INTEGER;
        if (matchdayA !== matchdayB) return matchdayA - matchdayB;
        return a.kickoffAt.getTime() - b.kickoffAt.getTime();
      }),
    }));
}

export default async function PrediccionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(
      `
      id,
      external_ref,
      round,
      multiplier,
      matchday,
      home_placeholder,
      away_placeholder,
      kickoff_at,
      status,
      home_score,
      away_score,
      result_confirmed_at,
      home_team:teams!matches_home_team_id_fkey (
        id, external_ref, name, group_label, flag_url
      ),
      away_team:teams!matches_away_team_id_fkey (
        id, external_ref, name, group_label, flag_url
      ),
      penalty_winner_team:teams!matches_penalty_winner_team_id_fkey (
        id, external_ref, name, group_label, flag_url
      ),
      advancer_team:teams!matches_advancer_team_id_fkey (
        id, external_ref, name, group_label, flag_url
      )
    `,
    )
    .order("kickoff_at", { ascending: true });

  if (matchesError) {
    throw new Error(`load matches failed: ${matchesError.message}`);
  }

  const { data: predictionsData, error: predictionsError } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score, advancer_team_id")
    .eq("user_id", user.id);

  if (predictionsError) {
    throw new Error(`load predictions failed: ${predictionsError.message}`);
  }

  const matchRows = (matchesData ?? []) as MatchRow[];
  const predictionRows = (predictionsData ?? []) as PredictionRow[];
  const matches = matchRows.map(mapMatchRow);
  const initialPredictionsByMatchId = buildPredictionsByMatchId(predictionRows);
  const groups = groupMatches(matches);

  return (
    <section className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Predicciones</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Cargá y guardá tus resultados partido por partido. Podés avanzar de
          forma progresiva por grupo y jornada.
        </p>
      </header>

      <PredictionsPageClient
        userId={user.id}
        groups={groups}
        initialPredictionsByMatchId={initialPredictionsByMatchId}
      />
    </section>
  );
}
