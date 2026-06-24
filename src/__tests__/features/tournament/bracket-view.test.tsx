// @vitest-environment jsdom

/**
 * Tests for <BracketView> — FIFA-style connected knockout bracket.
 *
 * Covers: round labels, resolved teams, placeholders, AR-timezone kickoff,
 * horizontal scroll, round-filter chips, score + winner + penalty rendering,
 * the live state, and the standalone third-place card.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  BracketMatch,
  BracketRound,
  BracketSlot,
} from "@/features/tournament/entities/bracket";
import { BracketView } from "@/features/tournament/components/bracket-view";
import type { Team } from "@/features/fixtures/entities/match";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(id: string, name: string): Team {
  return {
    id,
    externalRef: id.toUpperCase(),
    name,
    groupLabel: null,
    flagUrl: null,
  };
}

function teamSlot(id: string, name: string): BracketSlot {
  return { kind: "team", team: makeTeam(id, name) };
}

function makeMatch(
  overrides: Partial<BracketMatch> & { id: string },
): BracketMatch {
  return {
    home: teamSlot("ar", "Argentina"),
    away: teamSlot("br", "Brasil"),
    homeScore: null,
    awayScore: null,
    winner: null,
    decidedByPenalties: false,
    kickoffAt: "2026-06-10T18:00:00Z", // 15:00 ART
    status: "scheduled",
    ...overrides,
  };
}

const RESOLVED_ROUND: BracketRound[] = [
  { round: "qf", label: "Cuartos", matches: [makeMatch({ id: "m1" })] },
];

const PLACEHOLDER_ROUND: BracketRound[] = [
  {
    round: "r32",
    label: "16avos",
    matches: [
      makeMatch({
        id: "m2",
        home: { kind: "placeholder", label: "1° Grupo A" },
        away: { kind: "placeholder", label: "2° Grupo B" },
      }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BracketView", () => {
  it("renders the round label (column header + filter chip)", () => {
    render(<BracketView rounds={RESOLVED_ROUND} />);
    expect(screen.getAllByText("Cuartos").length).toBeGreaterThanOrEqual(1);
  });

  it("renders team names for resolved slots", () => {
    render(<BracketView rounds={RESOLVED_ROUND} />);
    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("Brasil")).toBeInTheDocument();
  });

  it("renders placeholder text for unresolved slots", () => {
    render(<BracketView rounds={PLACEHOLDER_ROUND} />);
    expect(screen.getByText("1° Grupo A")).toBeInTheDocument();
    expect(screen.getByText("2° Grupo B")).toBeInTheDocument();
  });

  it("does not crash for an empty rounds array", () => {
    const { container } = render(<BracketView rounds={[]} />);
    expect(container).toBeInTheDocument();
  });

  it("renders the kickoff time in AR timezone (UTC-3 = 15:00)", () => {
    render(<BracketView rounds={RESOLVED_ROUND} />);
    expect(screen.getByText(/15:00/)).toBeInTheDocument();
  });

  it("wraps the bracket in an overflow-x-auto scroller", () => {
    const { container } = render(<BracketView rounds={RESOLVED_ROUND} />);
    expect(container.querySelector(".overflow-x-auto")).toBeInTheDocument();
  });

  it("renders a filter chip (tab) per round", () => {
    render(<BracketView rounds={RESOLVED_ROUND} />);
    expect(screen.getAllByRole("tab").length).toBeGreaterThanOrEqual(1);
  });

  it("shows scores once a match is played", () => {
    const rounds: BracketRound[] = [
      {
        round: "qf",
        label: "Cuartos",
        matches: [
          makeMatch({
            id: "m1",
            status: "confirmed",
            homeScore: 2,
            awayScore: 1,
            winner: "home",
          }),
        ],
      },
    ];
    render(<BracketView rounds={rounds} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("marks a penalty-decided winner", () => {
    const rounds: BracketRound[] = [
      {
        round: "sf",
        label: "Semifinal",
        matches: [
          makeMatch({
            id: "m1",
            status: "confirmed",
            homeScore: 1,
            awayScore: 1,
            winner: "away",
            decidedByPenalties: true,
          }),
        ],
      },
    ];
    render(<BracketView rounds={rounds} />);
    expect(screen.getByText("pen")).toBeInTheDocument();
  });

  it("shows the live state", () => {
    const rounds: BracketRound[] = [
      {
        round: "final",
        label: "Final",
        matches: [
          makeMatch({ id: "m1", status: "live", homeScore: 0, awayScore: 0 }),
        ],
      },
    ];
    render(<BracketView rounds={rounds} />);
    expect(screen.getByText(/en vivo/i)).toBeInTheDocument();
  });

  it("renders the third-place match as its own labelled card + chip", () => {
    const rounds: BracketRound[] = [
      { round: "final", label: "Final", matches: [makeMatch({ id: "f" })] },
      {
        round: "third_place",
        label: "Tercer puesto",
        matches: [makeMatch({ id: "tp" })],
      },
    ];
    render(<BracketView rounds={rounds} />);
    expect(screen.getByText("3er puesto")).toBeInTheDocument(); // chip
    expect(screen.getByText("Tercer puesto")).toBeInTheDocument(); // header
  });
});
