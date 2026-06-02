/**
 * View-model for the predictions page: pure mappers + grouping that turn the
 * matches/predictions read rows into what the page renders. No I/O — the page
 * (Server Component) runs the queries and feeds these the raw rows.
 *
 * Read-side mappers live here (not in fixtures/rows.ts) because that file's
 * TeamRow/MatchRow are write shapes for seed/sync (home_ref/away_ref, no joins).
 */

import type {
  Match,
  MatchStatus,
  Round,
  Team,
} from "@/features/fixtures/entities/match";
import { arDayParts } from "@/shared/datetime";

import type { PredictionInput } from "./prediction";
import type { PredictionRow } from "./rows";

export type TeamJoinRow = {
  id: string;
  external_ref: string;
  name: string;
  group_label: string | null;
  flag_url: string | null;
} | null;

/** PostgREST can surface a to-one relation as the object or a one-element array. */
export type TeamRelation = TeamJoinRow | Exclude<TeamJoinRow, null>[];

export interface MatchWithTeamsRow {
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
  home_team: TeamRelation;
  away_team: TeamRelation;
  /** Knockout-only joins; the group-stage view does not fetch them. */
  penalty_winner_team?: TeamRelation;
  advancer_team?: TeamRelation;
}

/** A PostgREST to-one relation typed as an array → unwrap to the single row. */
export function normalizeTeamRelation(
  relation: TeamRelation | undefined,
): TeamJoinRow {
  if (!relation) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

export function mapTeamRow(row: TeamJoinRow): Team | null {
  if (!row) return null;

  return {
    id: row.id,
    externalRef: row.external_ref,
    name: row.name,
    groupLabel: row.group_label,
    flagUrl: row.flag_url,
  };
}

export function mapMatchRow(row: MatchWithTeamsRow): Match {
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

/** What the page reads back for a user's predictions (PredictionRow minus user_id). */
export type PredictionReadRow = Pick<
  PredictionRow,
  "match_id" | "home_score" | "away_score" | "advancer_team_id"
>;

export function buildPredictionsByMatchId(
  rows: PredictionReadRow[],
): Record<string, PredictionInput> {
  const byMatchId: Record<string, PredictionInput> = {};

  for (const row of rows) {
    byMatchId[row.match_id] = {
      homeScore: row.home_score,
      awayScore: row.away_score,
      advancerTeamId: row.advancer_team_id,
    };
  }

  return byMatchId;
}

export interface GroupBlock {
  groupLabel: string;
  matches: Match[];
}

/** Defensive fallback for a group-stage match with no resolvable group label. */
const UNASSIGNED_GROUP = "Sin asignar";

export function groupMatches(matches: Match[]): GroupBlock[] {
  const grouped = new Map<string, Match[]>();

  for (const match of matches) {
    if (match.round !== "group") continue;
    const groupLabel =
      match.homeTeam?.groupLabel ??
      match.awayTeam?.groupLabel ??
      UNASSIGNED_GROUP;
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

/**
 * A calendar-day bucket for the "por día" predictions view: every match whose
 * AR-local kickoff falls on the same date, with the display parts needed for
 * the day header. `dateKey` doubles as the section anchor id and sort key.
 */
export interface DayBlock {
  /** AR-local "YYYY-MM-DD" — stable anchor id + sort key. */
  dateKey: string;
  /** Day of month, unpadded (badge). */
  day: string;
  /** Capitalized AR weekday (e.g. "Jueves"). */
  weekday: string;
  /** Capitalized AR month (e.g. "Junio"). */
  month: string;
  matches: Match[];
}

/**
 * Group matches by their AR-local kickoff date. Unlike `groupMatches`, this is
 * round-agnostic — it buckets whatever it's given — so the day view stays
 * correct if knockout fixtures are loaded alongside the group stage later.
 * Days are ordered chronologically; matches within a day by kickoff instant.
 */
export function groupMatchesByDay(matches: Match[]): DayBlock[] {
  const grouped = new Map<
    string,
    { parts: ArDayPartsLike; matches: Match[] }
  >();

  for (const match of matches) {
    const parts = arDayParts(match.kickoffAt);
    const bucket = grouped.get(parts.key);
    if (bucket) {
      bucket.matches.push(match);
    } else {
      grouped.set(parts.key, { parts, matches: [match] });
    }
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, { parts, matches: dayMatches }]) => ({
      dateKey,
      day: parts.day,
      weekday: parts.weekday,
      month: parts.month,
      matches: [...dayMatches].sort(
        (a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime(),
      ),
    }));
}

/** Local alias so the map value stays self-documenting without re-importing. */
type ArDayPartsLike = ReturnType<typeof arDayParts>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whether a day section should render collapsed by default in the "Día" view.
 *
 * Rule (per UX request): days strictly BEFORE yesterday start collapsed; today
 * and yesterday stay open, and future days stay open. Comparison is done on the
 * AR-local "YYYY-MM-DD" key (lexicographically sortable), so the boundary is
 * resolved in America/Argentina/Buenos_Aires — never the server's UTC day.
 *
 * Pure: the caller owns `now` (a single client-side `new Date()` per render),
 * which keeps it trivially testable and consistent across all sections.
 */
export function shouldCollapseDayByDefault(
  dateKey: string,
  now: Date,
): boolean {
  const yesterdayKey = arDayParts(new Date(now.getTime() - MS_PER_DAY)).key;
  return dateKey < yesterdayKey;
}
