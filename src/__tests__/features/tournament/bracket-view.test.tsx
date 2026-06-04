// @vitest-environment jsdom

/**
 * Tests for <BracketView> — knockout bracket display.
 *
 * Spec scenarios covered:
 * - "Resolved team shown" → TeamFlag + team name rendered
 * - "Empty bracket (all placeholders)" → placeholder text rendered, no crash
 * - "UTC date converted to AR display" → kickoff shown in UTC-3
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BracketRound } from "@/features/tournament/entities/bracket";
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

const RESOLVED_ROUND: BracketRound[] = [
  {
    round: "qf",
    label: "Cuartos",
    matches: [
      {
        id: "m1",
        home: { kind: "team", team: makeTeam("ar", "Argentina") },
        away: { kind: "team", team: makeTeam("br", "Brasil") },
        kickoffAt: "2026-06-10T18:00:00Z", // 15:00 ART
        status: "scheduled",
      },
    ],
  },
];

const PLACEHOLDER_ROUND: BracketRound[] = [
  {
    round: "r32",
    label: "16avos",
    matches: [
      {
        id: "m2",
        home: { kind: "placeholder", label: "1° Grupo A" },
        away: { kind: "placeholder", label: "2° Grupo B" },
        kickoffAt: "2026-06-10T18:00:00Z",
        status: "scheduled",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BracketView", () => {
  it("renders round labels", () => {
    render(<BracketView rounds={RESOLVED_ROUND} />);

    expect(screen.getByText("Cuartos")).toBeInTheDocument();
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

  it("does not crash for empty rounds array", () => {
    const { container } = render(<BracketView rounds={[]} />);
    expect(container).toBeInTheDocument();
  });

  it("renders the kickoff time in AR timezone (UTC-3 = 15:00)", () => {
    render(<BracketView rounds={RESOLVED_ROUND} />);

    // 2026-06-10T18:00:00Z → 15:00 in America/Argentina/Buenos_Aires
    expect(screen.getByText(/15:00/)).toBeInTheDocument();
  });

  it("renders 16avos round label for r32", () => {
    render(<BracketView rounds={PLACEHOLDER_ROUND} />);
    expect(screen.getByText("16avos")).toBeInTheDocument();
  });

  it("wraps content in an overflow-x-auto container for horizontal scroll", () => {
    const { container } = render(<BracketView rounds={RESOLVED_ROUND} />);
    const scrollable = container.querySelector(".overflow-x-auto");
    expect(scrollable).toBeInTheDocument();
  });
});
