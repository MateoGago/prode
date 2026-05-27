/**
 * StaticFixtureProvider — implements MatchDataProvider from the public-domain
 * openfootball/worldcup.json dataset (vendored at ./data/worldcup-2026.json).
 *
 * Chosen over a live football API because every free tier walls off the 2026
 * season. This dataset is public domain, key-less and pinned in the repo, so
 * seeding is deterministic and costs nothing. Knockout slots arrive as
 * placeholder strings ("1A", "2B", "W73") — exactly what the schema models via
 * home/away_placeholder + nullable team ids. Resolving those placeholders into
 * real teams is the admin's job during the tournament, not this provider's.
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

interface OpenFootballMatch {
  round: string; // "Matchday 1".."Matchday 17", "Round of 32", ... "Final"
  num?: number; // present only on knockout matches (FIFA match number 73-104)
  date: string; // "YYYY-MM-DD"
  time: string; // "13:00 UTC-6" (local time with explicit offset)
  team1: string; // real team name (group) or slot placeholder (knockout)
  team2: string;
  group?: string; // "Group A".."Group L"; absent on knockout matches
  ground: string;
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

function toMatches(data: OpenFootballData): Match[] {
  const matchdayByRef = buildMatchdayByRef(data.matches);
  const teamByRef = new Map<string, Team>();

  const teamFor = (name: string, group: string): Team => {
    const externalRef = slugifyTeamName(name);
    const existing = teamByRef.get(externalRef);
    if (existing) return existing;
    const team: Team = {
      id: "", // assigned by the repo on upsert
      externalRef,
      name,
      groupLabel: parseGroupLabel(group),
      flagUrl: null, // openfootball does not carry crests
    };
    teamByRef.set(externalRef, team);
    return team;
  };

  return data.matches.map((raw) => {
    const round = mapOpenFootballRound(raw.round);
    const isGroup = round === "group" && raw.group !== undefined;
    const externalRef = buildMatchRef(raw);

    const homeTeam =
      isGroup && raw.group ? teamFor(raw.team1, raw.group) : null;
    const awayTeam =
      isGroup && raw.group ? teamFor(raw.team2, raw.group) : null;

    return {
      id: "",
      externalRef,
      round,
      multiplier: ROUND_MULTIPLIERS[round],
      matchday: isGroup ? (matchdayByRef.get(externalRef) ?? null) : null,
      homeTeam,
      awayTeam,
      homePlaceholder: homeTeam ? null : raw.team1,
      awayPlaceholder: awayTeam ? null : raw.team2,
      kickoffAt: parseKickoff(raw.date, raw.time),
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      penaltyWinnerTeam: null,
      advancerTeam: null,
      resultConfirmedAt: null,
    } satisfies Match;
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class StaticFixtureProvider implements MatchDataProvider {
  private readonly data: OpenFootballData;

  constructor(data: OpenFootballData = worldcup2026 as OpenFootballData) {
    this.data = data;
  }

  getFixtures(): Promise<Match[]> {
    return Promise.resolve(toMatches(this.data));
  }

  /**
   * The static dataset is a fixture schedule, not a live results feed. Results
   * during the tournament are entered by the admin (see knockout decision), so
   * there is no live result source here.
   */
  getResults(): Promise<MatchResult[]> {
    return Promise.resolve([]);
  }
}
