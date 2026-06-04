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

export interface BracketMatch {
  id: string;
  home: BracketSlot;
  away: BracketSlot;
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
export function buildBracket(matches: Match[], _teams: Team[]): BracketRound[] {
  const byRound = new Map<Round, BracketMatch[]>();

  for (const match of matches) {
    if (match.round === "group") continue;

    const bMatch: BracketMatch = {
      id: match.id,
      home: resolveSlot(match.homeTeam, match.homePlaceholder),
      away: resolveSlot(match.awayTeam, match.awayPlaceholder),
      kickoffAt: match.kickoffAt.toISOString(),
      status: match.status,
    };

    const bucket = byRound.get(match.round);
    if (bucket) {
      bucket.push(bMatch);
    } else {
      byRound.set(match.round, [bMatch]);
    }
  }

  return KNOCKOUT_ROUND_ORDER.filter((round) => byRound.has(round)).map(
    (round) => ({
      round,
      label: KNOCKOUT_ROUND_LABELS[round] ?? round,
      // ISO 8601 UTC strings sort lexicographically in chronological order.
      matches: [...(byRound.get(round) ?? [])].sort((a, b) =>
        a.kickoffAt.localeCompare(b.kickoffAt),
      ),
    }),
  );
}
