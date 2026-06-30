/**
 * Regression: knockout cards must reflect their real status.
 *
 * The provider used to read each match's status by scanning `groups` only.
 * Knockout matches live in `days`/`rounds`, never in `groups`, so their status
 * was always undefined → deriveLock fell back to the kickoff check → a CONFIRMED
 * knockout card stayed frozen on "Este partido ya empezó" instead of closing.
 *
 * Now the provider takes `boardMatches` (group + resolved knockout) and keys
 * lock/state off it, so a confirmed knockout card closes like a group one.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MatchCardConnected } from "@/features/predictions/components/match-card-connected";
import { PredictionsProvider } from "@/features/predictions/components/predictions-provider";
import type { Match, MatchStatus, Round, Team } from "@/features/fixtures/entities/match";

const NOW = new Date("2026-06-30T12:00:00.000Z");
// Kickoff in the past → without a real status, the card would lock as "kickoff".
const KICKED_OFF = new Date("2026-06-29T17:00:00.000Z");

function team(id: string, name: string): Team {
  return { id, externalRef: id, name, groupLabel: null, flagUrl: null };
}

const BRA = team("bra", "Brasil");
const JPN = team("jpn", "Japón");

function knockout(status: MatchStatus, scores?: [number, number]): Match {
  return {
    id: "ko-76",
    externalRef: "wc2026-ko-76",
    round: "r16" as Round,
    multiplier: 2,
    matchday: null,
    homeTeam: BRA,
    awayTeam: JPN,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: KICKED_OFF,
    status,
    homeScore: scores ? scores[0] : null,
    awayScore: scores ? scores[1] : null,
    penaltyWinnerTeam: null,
    advancerTeam: scores && scores[0] > scores[1] ? BRA : null,
    resultConfirmedAt: status === "confirmed" ? KICKED_OFF : null,
  };
}

function renderCard(match: Match) {
  // groups is EMPTY on purpose — the only way the provider can see this match's
  // status is via boardMatches. This is exactly the knockout-in-Día scenario.
  return render(
    <PredictionsProvider
      initialPredictions={{
        [match.id]: { homeScore: 2, awayScore: 1, advancerTeamId: BRA.id },
      }}
      groups={[]}
      boardMatches={[match]}
      now={NOW}
    >
      <MatchCardConnected match={match} />
    </PredictionsProvider>,
  );
}

describe("PredictionsProvider — knockout card status (boardMatches)", () => {
  it("closes a CONFIRMED knockout card instead of showing 'ya empezó'", () => {
    renderCard(knockout("confirmed", [2, 1]));

    expect(screen.getByText(/confirmado/i)).toBeInTheDocument();
    expect(screen.getByText(/tu pronóstico/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/este partido ya empezó/i),
    ).not.toBeInTheDocument();
  });

  it("still locks a SCHEDULED knockout card that has already kicked off", () => {
    renderCard(knockout("scheduled"));

    expect(screen.getByText(/este partido ya empezó/i)).toBeInTheDocument();
    expect(screen.queryByText(/✓ confirmado/i)).not.toBeInTheDocument();
  });
});
