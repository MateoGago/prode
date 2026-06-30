/**
 * Pure domain: knockout bracket derivation from match data.
 * No I/O — the page (Server Component) feeds raw domain Match/Team objects.
 *
 * `KNOCKOUT_ROUND_ORDER` and `KNOCKOUT_ROUND_LABELS` mirror the constants in
 * predictions-page.ts. They are local here because those originals are not
 * exported and the bracket domain does not depend on the predictions feature.
 */

import type { Match, Round, Team } from "@/features/fixtures/entities/match";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export type BracketSlot =
  | { kind: "team"; team: Team }
  | { kind: "placeholder"; label: string };

/** Which side advanced from a knockout match (null while undecided). */
export type BracketWinner = "home" | "away" | null;

export interface BracketMatch {
  id: string;
  home: BracketSlot;
  away: BracketSlot;
  /** Final score; null until the match is finished/confirmed. */
  homeScore: number | null;
  awayScore: number | null;
  /** Resolved advancer side, so the UI can emphasise it and dim the loser. */
  winner: BracketWinner;
  /** True when the tie was settled on penalties (level after 120'). */
  decidedByPenalties: boolean;
  /**
   * ISO 8601 UTC string. Kept as a string (not Date) so the whole
   * BracketRound[] is serializable across the RSC→Client boundary;
   * formatKickoffLong() parses it for display.
   */
  kickoffAt: string;
  status: string;
}

export interface BracketRound {
  round: Round;
  label: string;
  matches: BracketMatch[];
}

// ---------------------------------------------------------------------------
// Constants (mirrors predictions-page.ts — kept local, not re-exported)
// ---------------------------------------------------------------------------

const KNOCKOUT_ROUND_LABELS: Partial<Record<Round, string>> = {
  r32: "16avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinal",
  third_place: "Tercer puesto",
  final: "Final",
};

/** Bracket order for stable round ordering in the Fixture view. */
const KNOCKOUT_ROUND_ORDER: Round[] = [
  "r32",
  "r16",
  "qf",
  "sf",
  "third_place",
  "final",
];

/**
 * Canonical TOP-TO-BOTTOM order of each knockout round, by FIFA match number.
 *
 * The bracket TREE — not the calendar — decides a card's vertical position:
 * round-N match k is fed by round-(N-1) matches at slots 2k and 2k+1, so those
 * two feeders MUST sit adjacent (and in this order) for the connector lines to
 * land on the right card. Kickoff order does NOT match the tree (e.g. P73 kicks
 * off first but sits 3rd in R32), so ordering a round by kickoff drew the wrong
 * crossings.
 *
 * Derived straight from the seed's winner placeholders, walked back from the
 * final: P101=W97/W98, P102=W99/W100 → QF order 97,98,99,100; each QF names its
 * two R16 feeders (P97=W89/W90 …) → R16 order; each R16 names its two R32
 * feeders (P89=W74/W77 …) → R32 order. Final / third-place hold a single match,
 * so they need no entry (they fall back to kickoff, a no-op for one match).
 */
const BRACKET_POSITION: Partial<Record<Round, number[]>> = {
  r32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  r16: [89, 90, 93, 94, 91, 92, 95, 96],
  qf: [97, 98, 99, 100],
  sf: [101, 102],
};

/**
 * Extracts the FIFA match number from a knockout externalRef
 * (`wc2026-ko-89` → 89). Returns null for refs without one (group-fallback
 * refs like the final's `wc2026-g-x-w101-vs-w102`), which then sort last.
 */
function fifaMatchNumber(externalRef: string): number | null {
  const match = /-ko-(\d+)$/.exec(externalRef);
  return match ? Number(match[1]) : null;
}

/**
 * Orders a round's matches by their canonical bracket position so the visual
 * crossings line up with the tournament tree. Matches whose number isn't in the
 * round's order (or rounds with no canonical order) fall back to kickoff —
 * a stable no-op for the single-match final / third-place rounds.
 */
function orderByBracketPosition(round: Round, matches: Match[]): Match[] {
  const order = BRACKET_POSITION[round];
  const positionOf = (m: Match): number => {
    if (!order) return Number.MAX_SAFE_INTEGER;
    const num = fifaMatchNumber(m.externalRef);
    const index = num === null ? -1 : order.indexOf(num);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  return [...matches].sort((a, b) => {
    const pa = positionOf(a);
    const pb = positionOf(b);
    if (pa !== pb) return pa - pb;
    return a.kickoffAt.getTime() - b.kickoffAt.getTime();
  });
}

// ---------------------------------------------------------------------------
// formatPlaceholder
// ---------------------------------------------------------------------------

/**
 * Maps a raw slot placeholder string to its Spanish display label.
 *
 * Vocabulary:
 * - `1X`           → "1° Grupo X"
 * - `2X`           → "2° Grupo X"
 * - `3A/B/C/D/F`   → "Mejor 3° (A/B/C/D/F)"
 * - `WN`           → "Ganador PN"
 * - `LN`           → "Perdedor PN"
 *
 * Falls back to the raw string when none of the patterns match.
 */
export function formatPlaceholder(raw: string): string {
  // Best-third: "3A/B/..." — must be checked before "3X" (single group) to
  // avoid a partial match. The slash separates multiple group letters.
  const bestThirdMatch = /^3([A-Z](?:\/[A-Z])+)$/.exec(raw);
  if (bestThirdMatch) return `Mejor 3° (${bestThirdMatch[1]})`;

  // Group position 1 or 2: "1A", "2B", etc.
  const groupPositionMatch = /^([12])([A-Z])$/.exec(raw);
  if (groupPositionMatch)
    return `${groupPositionMatch[1]}° Grupo ${groupPositionMatch[2]}`;

  // Winner: "W74"
  const winnerMatch = /^W(\d+)$/.exec(raw);
  if (winnerMatch) return `Ganador P${winnerMatch[1]}`;

  // Loser: "L101"
  const loserMatch = /^L(\d+)$/.exec(raw);
  if (loserMatch) return `Perdedor P${loserMatch[1]}`;

  return raw;
}

// ---------------------------------------------------------------------------
// groupsForPlaceholder
// ---------------------------------------------------------------------------

/**
 * Derives the group letters a knockout slot can be filled from, for the admin
 * team selector. Lets the dropdown show only the teams that could legitimately
 * occupy a slot instead of all 48.
 *
 * - `1J` / `2H`     → `["J"]` / `["H"]` (a single group's 1st/2nd place)
 * - `3A/B/C/D/F`    → `["A","B","C","D","F"]` (best-third: several groups)
 * - `W74` / `L101`  → `null` (a match winner/loser can be ANY team — no filter)
 * - anything else   → `null` (unknown shape → no filter, show every team)
 */
export function groupsForPlaceholder(raw: string): string[] | null {
  // Best-third first (so "3A/B/…" isn't read as group position "3X").
  const bestThirdMatch = /^3([A-Z](?:\/[A-Z])+)$/.exec(raw);
  if (bestThirdMatch) return bestThirdMatch[1].split("/");

  const groupPositionMatch = /^[12]([A-Z])$/.exec(raw);
  if (groupPositionMatch) return [groupPositionMatch[1]];

  return null;
}

// ---------------------------------------------------------------------------
// buildBracket
// ---------------------------------------------------------------------------

function resolveSlot(
  team: Team | null,
  placeholder: string | null,
): BracketSlot {
  if (team !== null) return { kind: "team", team };
  return {
    kind: "placeholder",
    label: formatPlaceholder(placeholder ?? ""),
  };
}

/**
 * Resolves which side advanced from a knockout match for UI emphasis.
 *
 * Priority:
 * 1. The persisted `advancerTeam` (authoritative — covers penalty wins where
 *    the 120' score is level), matched against the resolved home/away team.
 * 2. Otherwise compare scores (a plain regulation/ET result).
 * 3. `null` when undecided (no advancer, no scores, or a draw with no advancer).
 *
 * Exported for unit testing.
 */
export function deriveBracketWinner(match: Match): BracketWinner {
  const advancerId = match.advancerTeam?.id ?? null;
  if (advancerId !== null) {
    if (match.homeTeam?.id === advancerId) return "home";
    if (match.awayTeam?.id === advancerId) return "away";
  }

  if (match.homeScore !== null && match.awayScore !== null) {
    if (match.homeScore > match.awayScore) return "home";
    if (match.awayScore > match.homeScore) return "away";
  }

  return null;
}

/**
 * Organises knockout matches into ordered `BracketRound[]`.
 *
 * - Group-stage matches are ignored.
 * - Rounds are returned in `KNOCKOUT_ROUND_ORDER`.
 * - Matches within a round are ordered by `kickoffAt` ascending.
 * - A null team ID produces a `placeholder` slot via `formatPlaceholder`.
 * - Returns `[]` for empty or all-group input.
 */
// `teams` is accepted to match the design's function signature (mirrors
// `computeStandings`) but is not needed here — team data is already embedded
// in each Match's homeTeam/awayTeam fields.
function toBracketMatch(match: Match): BracketMatch {
  return {
    id: match.id,
    home: resolveSlot(match.homeTeam, match.homePlaceholder),
    away: resolveSlot(match.awayTeam, match.awayPlaceholder),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    winner: deriveBracketWinner(match),
    decidedByPenalties: match.penaltyWinnerTeam !== null,
    kickoffAt: match.kickoffAt.toISOString(),
    status: match.status,
  };
}

export function buildBracket(matches: Match[], _teams: Team[]): BracketRound[] {
  const byRound = new Map<Round, Match[]>();

  for (const match of matches) {
    if (match.round === "group") continue;
    const bucket = byRound.get(match.round);
    if (bucket) {
      bucket.push(match);
    } else {
      byRound.set(match.round, [match]);
    }
  }

  return KNOCKOUT_ROUND_ORDER.filter((round) => byRound.has(round)).map(
    (round) => ({
      round,
      label: KNOCKOUT_ROUND_LABELS[round] ?? round,
      // Ordered by the canonical bracket tree (not kickoff) so the connector
      // lines join each card to its real feeders.
      matches: orderByBracketPosition(round, byRound.get(round) ?? []).map(
        toBracketMatch,
      ),
    }),
  );
}
