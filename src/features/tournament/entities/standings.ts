/**
 * Pure domain: per-group standings derivation from confirmed match data.
 * No I/O — the page (Server Component) feeds raw domain Match/Team objects.
 *
 * H2H tiebreaker is explicitly deferred to v2: `resolveHeadToHead` exists as
 * a separately-testable seam but is NOT wired into `computeStandings`.
 * Stable v1 tiebreaker: Pts → DG → GF → team.name localeCompare.
 */

import type { Match, Team } from "@/features/fixtures/entities/match";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TeamStanding {
  team: Team;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

export interface GroupStandings {
  groupLabel: string;
  /** Teams sorted by the v1 comparator: Pts → DG → GF → name localeCompare. */
  rows: TeamStanding[];
}

// ---------------------------------------------------------------------------
// H2H seam (v2 placeholder)
// ---------------------------------------------------------------------------

/**
 * Head-to-head tiebreaker seam.
 * Returns 0 in v1 — deliberately not called by `computeStandings`.
 * Replace the body in v2 once the deferred H2H logic is ready.
 */
export function resolveHeadToHead(
  _a: TeamStanding,
  _b: TeamStanding,
  _matches: Match[],
): number {
  return 0;
}

// ---------------------------------------------------------------------------
// Comparator
// ---------------------------------------------------------------------------

/**
 * Stable v1 comparator for rows inside a group:
 * Pts DESC → DG DESC → GF DESC → team.name localeCompare (ascending, Spanish).
 */
function compareRows(a: TeamStanding, b: TeamStanding): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.dg !== a.dg) return b.dg - a.dg;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.team.name.localeCompare(b.team.name, "es");
}

// ---------------------------------------------------------------------------
// computeStandings
// ---------------------------------------------------------------------------

const ELIGIBLE_STATUSES = new Set<string>(["finished", "confirmed"]);

/** Mutate a stat accumulator for one team's side of a match. */
function applyResult(
  stat: Omit<TeamStanding, "team">,
  goalsFor: number,
  goalsAgainst: number,
): void {
  stat.pj++;
  stat.gf += goalsFor;
  stat.gc += goalsAgainst;
  stat.dg += goalsFor - goalsAgainst;
  if (goalsFor > goalsAgainst) {
    stat.pg++;
    stat.pts += 3;
  } else if (goalsFor === goalsAgainst) {
    stat.pe++;
    stat.pts += 1;
  } else stat.pp++;
}

/**
 * Derives `GroupStandings[]` from the full match list.
 *
 * Rules:
 * - Only `round === 'group'` matches are considered.
 * - Only matches with `status IN ('finished', 'confirmed')` contribute to stats.
 * - Teams with no group label are silently skipped.
 * - Each group's rows are sorted by the v1 comparator.
 */
export function computeStandings(
  matches: Match[],
  teams: Team[],
): GroupStandings[] {
  if (teams.length === 0) return [];

  // Index teams by id for fast lookup
  const teamById = new Map<string, Team>(teams.map((t) => [t.id, t]));

  // Collect group labels from the provided teams
  const groupTeams = new Map<string, Set<string>>();
  for (const t of teams) {
    if (!t.groupLabel) continue;
    let members = groupTeams.get(t.groupLabel);
    if (!members) {
      members = new Set();
      groupTeams.set(t.groupLabel, members);
    }
    members.add(t.id);
  }

  if (groupTeams.size === 0) return [];

  // Zero-initialise stat accumulators
  const stats = new Map<string, Omit<TeamStanding, "team">>();
  for (const t of teams) {
    if (!t.groupLabel) continue;
    stats.set(t.id, {
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      pts: 0,
    });
  }

  // Accumulate stats from eligible group matches
  for (const match of matches) {
    if (match.round !== "group") continue;
    if (!ELIGIBLE_STATUSES.has(match.status)) continue;
    if (match.homeScore === null || match.awayScore === null) continue;

    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    if (!homeTeam || !awayTeam) continue;

    // Only process teams that were passed in (belong to the standings set)
    const homeStat = stats.get(homeTeam.id);
    const awayStat = stats.get(awayTeam.id);
    if (!homeStat && !awayStat) continue;

    const hs = match.homeScore;
    const as_ = match.awayScore;

    if (homeStat) applyResult(homeStat, hs, as_);
    if (awayStat) applyResult(awayStat, as_, hs);
  }

  // Build GroupStandings sorted by group label (Spanish locale for A..L)
  return Array.from(groupTeams.entries())
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([groupLabel, teamIds]) => {
      const rows: TeamStanding[] = [];
      for (const id of teamIds) {
        const t = teamById.get(id);
        const s = stats.get(id);
        if (!t || !s) continue;
        rows.push({ team: t, ...s });
      }
      rows.sort(compareRows);
      return { groupLabel, rows };
    });
}

// ---------------------------------------------------------------------------
// selectBestThirds
// ---------------------------------------------------------------------------

/**
 * Returns the 8 best third-placed teams across all groups, ordered
 * Pts DESC → DG DESC → GF DESC (same comparator as group standings, v1).
 *
 * Returns `[]` when no group has at least 3 rows (pre-tournament state).
 */
export function selectBestThirds(standings: GroupStandings[]): TeamStanding[] {
  const thirds: TeamStanding[] = [];

  for (const group of standings) {
    if (group.rows.length >= 3) {
      thirds.push(group.rows[2]);
    }
  }

  if (thirds.length === 0) return [];

  thirds.sort(compareRows);

  return thirds.slice(0, 8);
}
