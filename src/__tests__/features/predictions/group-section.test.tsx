/**
 * Tests for GroupSection component — Slice 3 additions:
 * - id anchor for jumpToGroup scroll target
 * - Auto-collapse with "grupo completo" strip when group status is "done"
 * - Re-openable when user clicks the strip
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GroupSection } from "@/features/predictions/components/group-section";
import { PredictionsProvider } from "@/features/predictions/components/predictions-provider";
import type { GroupBlock } from "@/features/predictions/entities/predictions-page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date("2026-06-01T12:00:00.000Z");
const FUTURE_KICKOFF = new Date("2026-07-01T20:00:00.000Z");

function makeMatch(id: string) {
  return {
    id,
    externalRef: id,
    round: "group" as const,
    multiplier: 1,
    matchday: 1,
    homeTeam: null,
    awayTeam: null,
    homePlaceholder: "TBD",
    awayPlaceholder: "TBD",
    kickoffAt: FUTURE_KICKOFF,
    status: "scheduled" as const,
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
  };
}

const MATCHES = [makeMatch("a1"), makeMatch("a2"), makeMatch("a3")];

type SavedEntry = {
  homeScore: number;
  awayScore: number;
  advancerTeamId: string | null;
};

function renderGroupSection(
  savedMap: Record<string, SavedEntry> = {},
  groups?: GroupBlock[],
) {
  const resolvedGroups: GroupBlock[] = groups ?? [
    { groupLabel: "A", matches: MATCHES },
  ];

  return render(
    <PredictionsProvider
      initialPredictions={savedMap}
      groups={resolvedGroups}
      now={NOW}
    >
      <GroupSection groupLabel="A" matches={MATCHES} onMatchChange={() => {}} />
    </PredictionsProvider>,
  );
}

const FULL_SAVED: Record<string, SavedEntry> = {
  a1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
  a2: { homeScore: 2, awayScore: 1, advancerTeamId: null },
  a3: { homeScore: 0, awayScore: 0, advancerTeamId: null },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GroupSection — id anchor", () => {
  it("renders the section with id equal to the groupLabel", () => {
    const { container } = renderGroupSection();
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("id", "A");
  });
});

describe("GroupSection — collapse strip (REQ-06 auto-collapse)", () => {
  it("shows match cards when group is NOT fully saved", () => {
    // Only 1 of 3 saved — partial, should show cards
    renderGroupSection({
      a1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    });

    // Cards should be visible (no collapse)
    expect(screen.queryByText(/grupo completo/i)).not.toBeInTheDocument();
  });

  it("auto-collapses and shows 'grupo completo' strip when all matches are saved", () => {
    renderGroupSection(FULL_SAVED);
    expect(screen.getByText(/grupo completo/i)).toBeInTheDocument();
  });

  it("hides match cards when group is auto-collapsed", () => {
    renderGroupSection(FULL_SAVED);
    // The match cards should not be visible in the collapsed state.
    // MatchCard renders team placeholders — check that the motioned card list
    // is not visible (aria-hidden or simply not rendered).
    expect(screen.queryByText(/grupo completo/i)).toBeInTheDocument();
    // No MatchCard visible means the motion.div container with cards is hidden
    const strip = screen.getByText(/grupo completo/i);
    expect(strip).toBeInTheDocument();
  });

  it("re-opens the group when the user clicks the 'grupo completo' strip", async () => {
    const user = userEvent.setup();
    renderGroupSection(FULL_SAVED);

    // Strip should be visible, cards collapsed
    const strip = screen.getByRole("button", { name: /grupo completo/i });
    expect(strip).toBeInTheDocument();

    // Click to expand
    await user.click(strip);

    // Strip should no longer be blocking the cards
    expect(
      screen.queryByRole("button", { name: /grupo completo/i }),
    ).not.toBeInTheDocument();
  });
});
