/**
 * StaticFixtureProvider — implements MatchDataProvider from the public-domain
 * openfootball/worldcup.json dataset (vendored at ./data/worldcup-2026.json).
 *
 * Chosen over a live football API because every free tier walls off the 2026
 * season. This dataset is public domain, key-less and pinned in the repo for a
 * deterministic initial seed. The same dataset is re-fetched live (fromRemote)
 * to sync results: once matches are played it gains scores, and knockout slots
 * flip from placeholders ("1A", "W73") to real team names — so re-pulling both
 * records results and resolves the bracket automatically.
 *
 * The PURE FUNCTIONS (mapOpenFootballRound, parseKickoff, slugifyTeamName,
 * parseGroupLabel) are exported for unit testing without touching the dataset.
 */

import type { Match, MatchResult, Round, Team } from "../model";
import { ROUND_MULTIPLIERS } from "../model";
import type { MatchDataProvider } from "../ports/match-data-provider";
import worldcup2026 from "./data/worldcup-2026.json";

// ---------------------------------------------------------------------------
// Raw dataset shape (openfootball/worldcup.json)
// ---------------------------------------------------------------------------

/** Score arrays are [team1, team2]. Present only once a match has finished. */
interface OpenFootballScore {
  ht?: [number, number]; // half-time
  ft: [number, number]; // 90 minutes
  et?: [number, number]; // after extra time (cumulative, knockouts only)
  p?: [number, number]; // penalty shootout (knockouts only)
}

interface OpenFootballMatch {
  round: string; // "Matchday 1".."Matchday 17", "Round of 32", ... "Final"
  num?: number; // present only on knockout matches (FIFA match number 73-104)
  date: string; // "YYYY-MM-DD"
  time: string; // "13:00 UTC-6" (local time with explicit offset)
  team1: string; // real team name (group, or knockout once resolved) or slot placeholder
  team2: string;
  group?: string; // "Group A".."Group L"; absent on knockout matches
  ground: string;
  score?: OpenFootballScore; // present once the match is played
}

interface OpenFootballData {
  name: string;
  matches: OpenFootballMatch[];
}

// ---------------------------------------------------------------------------
// Pure mapping helpers
// ---------------------------------------------------------------------------

/** Maps an openfootball round label to our domain Round. */
export function mapOpenFootballRound(round: string): Round {
  if (round.startsWith("Matchday")) return "group";

  switch (round) {
    case "Round of 32":
      return "r32";
    case "Round of 16":
      return "r16";
    case "Quarter-final":
      return "qf";
    case "Semi-final":
      return "sf";
    case "Match for third place":
      return "third_place";
    case "Final":
      return "final";
    default:
      throw new Error(`Unknown openfootball round label: "${round}".`);
  }
}

/**
 * Parses an openfootball date + local time into a UTC instant.
 * @example parseKickoff("2026-06-11", "13:00 UTC-6") // 2026-06-11T19:00:00Z
 */
export function parseKickoff(date: string, time: string): Date {
  const m = /^(\d{2}):(\d{2})\s+UTC([+-]\d{1,2})$/.exec(time);
  if (!m) throw new Error(`Unparseable openfootball time: "${time}".`);

  const [, hh, mm, rawOffset] = m;
  const sign = rawOffset.startsWith("-") ? "-" : "+";
  const offsetHours = Math.abs(Number(rawOffset)).toString().padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00${sign}${offsetHours}:00`);
}

/** Slugifies a team name into a stable, key-safe externalRef. */
export function slugifyTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/['’]/g, "") // drop apostrophes without inserting a separator
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extracts the single-letter group label from "Group A". */
export function parseGroupLabel(group: string): string {
  const m = /^Group\s+([A-L])$/.exec(group);
  if (!m) throw new Error(`Unparseable openfootball group: "${group}".`);
  return m[1];
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

/**
 * Group matches carry a calendar "Matchday N" label, not the 1-3 round number
 * we store — and a round's two games can fall on different calendar dates. So
 * derive the round by chronology: within each group the six matches, sorted by
 * kickoff, are two of matchday 1, then two of matchday 2, then two of matchday
 * 3 (group rounds never overlap). Keyed by each match's externalRef.
 */
function buildMatchdayByRef(matches: OpenFootballMatch[]): Map<string, number> {
  const byGroup = new Map<string, OpenFootballMatch[]>();
  for (const m of matches) {
    if (!m.group) continue;
    const list = byGroup.get(m.group) ?? [];
    list.push(m);
    byGroup.set(m.group, list);
  }

  const index = new Map<string, number>();
  for (const [, groupMatches] of byGroup) {
    const ordered = [...groupMatches].sort(
      (a, b) =>
        parseKickoff(a.date, a.time).getTime() -
        parseKickoff(b.date, b.time).getTime(),
    );
    for (let i = 0; i < ordered.length; i++) {
      index.set(buildMatchRef(ordered[i]), Math.floor(i / 2) + 1);
    }
  }
  return index;
}

/** Stable externalRef per match: FIFA number for knockouts, content key for groups. */
function buildMatchRef(raw: OpenFootballMatch): string {
  if (typeof raw.num === "number") return `wc2026-ko-${raw.num}`;
  const group = raw.group ? parseGroupLabel(raw.group).toLowerCase() : "x";
  return `wc2026-g-${group}-${slugifyTeamName(raw.team1)}-vs-${slugifyTeamName(raw.team2)}`;
}

/** Final scoreline excluding penalties: extra-time result if any, else 90'. */
function finalScore(raw: OpenFootballMatch): [number, number] | null {
  if (!raw.score) return null;
  return raw.score.et ?? raw.score.ft;
}

/**
 * Resolves a knockout match's penalty winner and advancer from its score.
 * Group matches and unplayed matches have neither.
 */
function resolveOutcome(
  raw: OpenFootballMatch,
  round: Round,
  homeTeam: Team | null,
  awayTeam: Team | null,
): { penaltyWinnerTeam: Team | null; advancerTeam: Team | null } {
  const none = { penaltyWinnerTeam: null, advancerTeam: null };
  if (round === "group" || !raw.score) return none;

  if (raw.score.p) {
    const [ph, pa] = raw.score.p;
    const winner = ph > pa ? homeTeam : awayTeam;
    return { penaltyWinnerTeam: winner, advancerTeam: winner };
  }
  const [h, a] = raw.score.et ?? raw.score.ft;
  if (h > a) return { penaltyWinnerTeam: null, advancerTeam: homeTeam };
  if (a > h) return { penaltyWinnerTeam: null, advancerTeam: awayTeam };
  return none;
}

function toMatches(data: OpenFootballData): Match[] {
  const matchdayByRef = buildMatchdayByRef(data.matches);

  // Pass 1: register the 48 real teams from the group stage (only group matches
  // carry the group label). Knockout matches reference these same teams once
  // openfootball resolves the bracket from placeholders to real names.
  const teamByName = new Map<string, Team>();
  for (const raw of data.matches) {
    if (!raw.group) continue;
    for (const name of [raw.team1, raw.team2]) {
      if (teamByName.has(name)) continue;
      teamByName.set(name, {
        id: "", // assigned by the repo on upsert
        externalRef: slugifyTeamName(name),
        name,
        groupLabel: parseGroupLabel(raw.group),
        flagUrl: null, // openfootball does not carry crests
      });
    }
  }

  // A slot resolves to a real team when its label matches a known team name;
  // otherwise it is still a placeholder ("1A", "W73", "3A/B/C/D/F").
  const resolveTeam = (label: string): Team | null =>
    teamByName.get(label) ?? null;

  return data.matches.map((raw) => {
    const round = mapOpenFootballRound(raw.round);
    const externalRef = buildMatchRef(raw);
    const homeTeam = resolveTeam(raw.team1);
    const awayTeam = resolveTeam(raw.team2);
    const score = finalScore(raw);
    const { penaltyWinnerTeam, advancerTeam } = resolveOutcome(
      raw,
      round,
      homeTeam,
      awayTeam,
    );

    return {
      id: "",
      externalRef,
      round,
      multiplier: ROUND_MULTIPLIERS[round],
      matchday:
        round === "group" ? (matchdayByRef.get(externalRef) ?? null) : null,
      homeTeam,
      awayTeam,
      homePlaceholder: homeTeam ? null : raw.team1,
      awayPlaceholder: awayTeam ? null : raw.team2,
      kickoffAt: parseKickoff(raw.date, raw.time),
      status: raw.score ? "finished" : "scheduled",
      homeScore: score ? score[0] : null,
      awayScore: score ? score[1] : null,
      penaltyWinnerTeam,
      advancerTeam,
      resultConfirmedAt: null,
    } satisfies Match;
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Live openfootball dataset — re-fetched on every results sync. */
const REMOTE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

export class StaticFixtureProvider implements MatchDataProvider {
  private readonly data: OpenFootballData;

  /** Defaults to the vendored snapshot; pass live data (or use fromRemote) to sync. */
  constructor(data: OpenFootballData = worldcup2026 as OpenFootballData) {
    this.data = data;
  }

  /** Builds a provider from the live openfootball dataset (for the results sync). */
  static async fromRemote(
    url: string = REMOTE_URL,
  ): Promise<StaticFixtureProvider> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `openfootball fetch failed: ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as OpenFootballData;
    return new StaticFixtureProvider(data);
  }

  getFixtures(): Promise<Match[]> {
    return Promise.resolve(toMatches(this.data));
  }

  /** Results for finished matches; team refs (slugs) are resolved by the repo. */
  getResults(): Promise<MatchResult[]> {
    const results = toMatches(this.data).flatMap<MatchResult>((m) => {
      if (
        m.status !== "finished" ||
        m.homeScore === null ||
        m.awayScore === null
      ) {
        return [];
      }
      return [
        {
          matchId: m.externalRef,
          round: m.round,
          multiplier: m.multiplier,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          penaltyWinnerId: m.penaltyWinnerTeam?.externalRef ?? null,
          advancerId: m.advancerTeam?.externalRef ?? null,
        },
      ];
    });
    return Promise.resolve(results);
  }
}
