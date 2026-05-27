/**
 * ApiFootballProvider — implements MatchDataProvider using api-sports.io.
 *
 * The PURE MAPPING FUNCTIONS (mapRoundLabel, mapApiTeamToTeam, mapApiFixtureToMatch)
 * are exported so they can be unit-tested without any HTTP calls.
 *
 * The class itself requires a real API key and a leagueId/season — only used
 * in the seed script which needs credentials (T-10, blocked).
 *
 * API reference: https://www.api-football.com/documentation-v3
 */

import type { Match, MatchResult, MatchStatus, Round, Team } from "../model";
import { ROUND_MULTIPLIERS } from "../model";
import type { MatchDataProvider } from "../ports/match-data-provider";

// ---------------------------------------------------------------------------
// Raw API shapes
// ---------------------------------------------------------------------------

/** Shape of a single team object inside an API-Football fixture response. */
export interface ApiTeam {
  id: number | null;
  name: string;
  logo: string | null;
  winner: boolean | null;
}

/** Shape of the score object inside an API-Football fixture response. */
interface ApiScore {
  halftime: { home: number | null; away: number | null };
  fulltime: { home: number | null; away: number | null };
  extratime: { home: number | null; away: number | null };
  penalty: { home: number | null; away: number | null };
}

/** Shape of a single fixture in the API-Football /fixtures response. */
export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string; // NS, 1H, HT, 2H, ET, P, FT, AET, PEN, SUSP, INT, PST, CANC, ABD, AWD, WO
    };
  };
  league: {
    round: string; // e.g. "Group Stage - 1", "Round of 16", "Final"
  };
  teams: {
    home: ApiTeam;
    away: ApiTeam;
  };
  goals: { home: number | null; away: number | null };
  score: ApiScore;
}

// ---------------------------------------------------------------------------
// Round label mapping
// ---------------------------------------------------------------------------

/**
 * Maps API-Football round label strings to our domain Round enum.
 *
 * TODO: verify R32 shape against live API — api-football may use "Round of 32"
 * or a different label for the new 2026 format. The mapping below is based on
 * reasonable inference from their v3 patterns and official tournament naming.
 * Adjust the "r32" case once a live key is available.
 */
export function mapRoundLabel(apiRound: string): Round {
  // Group stage: "Group Stage - 1", "Group Stage - 2", "Group Stage - 3"
  if (apiRound.startsWith("Group Stage")) return "group";

  // Knockout rounds — exact strings to be verified with live API key.
  // TODO: verify R32 shape against live API
  switch (apiRound) {
    case "Round of 32":
      return "r32";
    case "Round of 16":
      return "r16";
    case "Quarter-finals":
      return "qf";
    case "Semi-finals":
      return "sf";
    case "3rd Place Final":
      return "third_place";
    case "Final":
      return "final";
    default:
      throw new Error(
        `Unknown API-Football round label: "${apiRound}". ` +
          "Update mapRoundLabel once the live API shape is confirmed.",
      );
  }
}

/**
 * Extracts the group-stage matchday number from an API round label.
 * Returns null for knockout rounds.
 *
 * @example
 *   parseMatchday("Group Stage - 2") // 2
 *   parseMatchday("Round of 16")     // null
 */
function parseMatchday(apiRound: string): number | null {
  const match = /Group Stage - (\d+)/.exec(apiRound);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Maps an API-Football status short code to our domain MatchStatus.
 * We collapse all live states to "live" and treat AET/PEN as "finished".
 */
function mapStatus(short: string): MatchStatus {
  switch (short) {
    case "NS":
    case "TBD":
    case "PST": // postponed — still scheduled
      return "scheduled";
    case "1H":
    case "HT":
    case "2H":
    case "ET":
    case "P": // penalty in progress
    case "BT": // break time
    case "LIVE":
    case "INT": // interrupted
      return "live";
    case "FT":
    case "AET": // after extra time
    case "PEN": // after penalties
      return "finished";
    default:
      // SUSP, CANC, ABD, AWD, WO — treat as finished for now; admin can override
      return "finished";
  }
}

// ---------------------------------------------------------------------------
// Team mapping
// ---------------------------------------------------------------------------

/**
 * Maps an API-Football team object to our domain Team type.
 * Returns null when the team id is null (placeholder slot — team not yet decided).
 *
 * Note: groupLabel is not available from the fixtures endpoint.
 * The teams feature must enrich this separately from the /teams endpoint,
 * or from the league standings endpoint which includes group info.
 */
export function mapApiTeamToTeam(apiTeam: ApiTeam): Team | null {
  if (apiTeam.id === null) return null;

  return {
    // We do not have a local uuid yet — the repo generates it on upsert.
    // Use a placeholder that the repo will replace; seed process handles this.
    id: "",
    externalRef: String(apiTeam.id),
    name: apiTeam.name,
    groupLabel: null, // enriched separately from standings endpoint
    flagUrl: apiTeam.logo,
  };
}

// ---------------------------------------------------------------------------
// Fixture mapping
// ---------------------------------------------------------------------------

/**
 * Maps a single API-Football fixture response object to our domain Match type.
 *
 * This is the core mapping function — all edge cases are handled here:
 * - Placeholder teams (null id)
 * - Penalty winners (status "PEN", winner flag on the winning team)
 * - Extra time scores (extratime field) vs regular time (fulltime)
 * - Matchday extraction from group round label
 */
export function mapApiFixtureToMatch(raw: ApiFixture): Match {
  const round = mapRoundLabel(raw.league.round);
  const multiplier = ROUND_MULTIPLIERS[round];
  const matchday = parseMatchday(raw.league.round);
  const status = mapStatus(raw.fixture.status.short);

  const homeTeam = mapApiTeamToTeam(raw.teams.home);
  const awayTeam = mapApiTeamToTeam(raw.teams.away);

  // Placeholder label: when the team id is null, the name field carries the slot
  // label (e.g. "1A", "2B", "W of R32-1"). Use it as the placeholder string.
  const homePlaceholder = homeTeam === null ? raw.teams.home.name : null;
  const awayPlaceholder = awayTeam === null ? raw.teams.away.name : null;

  // Final score: prefer fulltime score for finished matches.
  // We do NOT use penalty goals in homeScore/awayScore — those are ET results.
  // Extra time goals are already included in the fulltime field by api-football
  // for AET/PEN statuses (they report the final score after 120', not 90').
  const homeScore = status === "finished" ? (raw.goals.home ?? null) : null;
  const awayScore = status === "finished" ? (raw.goals.away ?? null) : null;

  // Penalty winner: only set when status is PEN (after penalty shootout).
  // The team with winner=true is the advancer; the scoreline remains the ET draw.
  let penaltyWinnerTeam: Team | null = null;
  let advancerTeam: Team | null = null;

  if (raw.fixture.status.short === "PEN") {
    // Determine which team won the penalty shootout via the winner flag.
    if (raw.teams.home.winner === true && homeTeam !== null) {
      penaltyWinnerTeam = homeTeam;
      advancerTeam = homeTeam;
    } else if (raw.teams.away.winner === true && awayTeam !== null) {
      penaltyWinnerTeam = awayTeam;
      advancerTeam = awayTeam;
    }
  } else if (status === "finished" && round !== "group") {
    // For non-penalty knockout conclusions, the advancer is simply the winner.
    if (raw.teams.home.winner === true && homeTeam !== null) {
      advancerTeam = homeTeam;
    } else if (raw.teams.away.winner === true && awayTeam !== null) {
      advancerTeam = awayTeam;
    }
  }

  return {
    id: "", // assigned by repo on upsert
    externalRef: String(raw.fixture.id),
    round,
    multiplier,
    matchday,
    homeTeam,
    awayTeam,
    homePlaceholder,
    awayPlaceholder,
    kickoffAt: new Date(raw.fixture.date),
    status,
    homeScore,
    awayScore,
    penaltyWinnerTeam,
    advancerTeam,
    resultConfirmedAt: null, // set by the confirmar-resultado use-case, not by the provider
  };
}

// ---------------------------------------------------------------------------
// Provider class (HTTP layer — requires API key)
// ---------------------------------------------------------------------------

interface ApiFootballConfig {
  apiKey: string;
  leagueId: number;
  season: number;
}

const API_BASE = "https://v3.football.api-sports.io";

/**
 * Concrete implementation of MatchDataProvider backed by api-sports.io v3.
 *
 * Usage requires an API key stored in the APIFOOTBALL_KEY environment variable.
 * Only used in the seed script (T-10) — which is blocked on credentials.
 */
export class ApiFootballProvider implements MatchDataProvider {
  private readonly config: ApiFootballConfig;

  constructor(config: ApiFootballConfig) {
    this.config = config;
  }

  private async fetchFixtures(
    params: Record<string, string>,
  ): Promise<ApiFixture[]> {
    const url = new URL(`${API_BASE}/fixtures`);
    url.searchParams.set("league", String(this.config.leagueId));
    url.searchParams.set("season", String(this.config.season));
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url.toString(), {
      headers: {
        "x-apisports-key": this.config.apiKey,
      },
    });

    if (!res.ok) {
      throw new Error(
        `API-Football request failed: ${res.status} ${res.statusText}`,
      );
    }

    const body = (await res.json()) as { response: ApiFixture[] };
    return body.response;
  }

  async getFixtures(): Promise<Match[]> {
    const raw = await this.fetchFixtures({});
    return raw.map(mapApiFixtureToMatch);
  }

  async getResults(): Promise<MatchResult[]> {
    const raw = await this.fetchFixtures({ status: "FT-AET-PEN" });

    return raw
      .filter((f) => f.goals.home !== null && f.goals.away !== null)
      .map((f) => {
        const round = mapRoundLabel(f.league.round);
        const isPenalty = f.fixture.status.short === "PEN";

        let penaltyWinnerId: string | null = null;
        let advancerId: string | null = null;

        if (isPenalty) {
          if (f.teams.home.winner && f.teams.home.id !== null) {
            penaltyWinnerId = String(f.teams.home.id);
            advancerId = penaltyWinnerId;
          } else if (f.teams.away.winner && f.teams.away.id !== null) {
            penaltyWinnerId = String(f.teams.away.id);
            advancerId = penaltyWinnerId;
          }
        } else if (round !== "group") {
          if (f.teams.home.winner && f.teams.home.id !== null) {
            advancerId = String(f.teams.home.id);
          } else if (f.teams.away.winner && f.teams.away.id !== null) {
            advancerId = String(f.teams.away.id);
          }
        }

        return {
          matchId: String(f.fixture.id),
          round,
          multiplier: ROUND_MULTIPLIERS[round],
          homeScore: f.goals.home!,
          awayScore: f.goals.away!,
          penaltyWinnerId,
          advancerId,
        } satisfies MatchResult;
      });
  }
}
