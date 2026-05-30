/**
 * Tests for GroupNav component (Slice 3).
 *
 * GroupNav reads groupProgress from PredictionsProvider context and renders
 * a horizontally scrollable row of chips — one per group (A–L).
 * Each chip shows loaded/total and has a visual state: done / partial / empty.
 * Tapping a chip calls jumpToGroup(label) via context.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GroupNav } from "@/features/predictions/components/group-nav";
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

function makeGroups(): GroupBlock[] {
  // Groups A and B, each with 3 matches (total not 6 to keep test fixtures small)
  return [
    {
      groupLabel: "A",
      matches: [makeMatch("a1"), makeMatch("a2"), makeMatch("a3")],
    },
    {
      groupLabel: "B",
      matches: [makeMatch("b1"), makeMatch("b2"), makeMatch("b3")],
    },
  ];
}

function renderWithProvider(
  groups: GroupBlock[],
  savedMap: Record<
    string,
    { homeScore: number; awayScore: number; advancerTeamId: string | null }
  >,
) {
  return render(
    <PredictionsProvider
      initialPredictions={savedMap}
      groups={groups}
      now={NOW}
    >
      <GroupNav />
    </PredictionsProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GroupNav", () => {
  it("renders a chip for each group", () => {
    const groups = makeGroups();
    renderWithProvider(groups, {});

    expect(
      screen.getByRole("button", { name: /grupo a/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /grupo b/i }),
    ).toBeInTheDocument();
  });

  it("shows loaded/total fraction on each chip", () => {
    const groups = makeGroups();
    // Save 1 of 3 in group A, 0 of 3 in group B
    renderWithProvider(groups, {
      a1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    });

    // Group A chip should show "1/3"
    const chipA = screen.getByRole("button", { name: /grupo a/i });
    expect(chipA).toHaveTextContent("1/3");

    // Group B chip should show "0/3"
    const chipB = screen.getByRole("button", { name: /grupo b/i });
    expect(chipB).toHaveTextContent("0/3");
  });

  it("marks a fully loaded group as done", () => {
    const groups = makeGroups();
    // All 3 of group A saved
    renderWithProvider(groups, {
      a1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
      a2: { homeScore: 2, awayScore: 1, advancerTeamId: null },
      a3: { homeScore: 0, awayScore: 0, advancerTeamId: null },
    });

    const chipA = screen.getByRole("button", { name: /grupo a/i });
    expect(chipA).toHaveAttribute("data-status", "done");
  });

  it("marks a partially loaded group as partial", () => {
    const groups = makeGroups();
    renderWithProvider(groups, {
      a1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    });

    const chipA = screen.getByRole("button", { name: /grupo a/i });
    expect(chipA).toHaveAttribute("data-status", "partial");
  });

  it("marks an empty group as empty", () => {
    const groups = makeGroups();
    renderWithProvider(groups, {});

    const chipA = screen.getByRole("button", { name: /grupo a/i });
    expect(chipA).toHaveAttribute("data-status", "empty");
  });

  it("calls jumpToGroup with the group label when a chip is clicked", async () => {
    const user = userEvent.setup();

    // Spy on scrollIntoView via a mocked element
    const scrollIntoViewMock = vi.fn();
    vi.spyOn(document, "getElementById").mockReturnValue({
      scrollIntoView: scrollIntoViewMock,
    } as unknown as HTMLElement);

    const groups = makeGroups();
    renderWithProvider(groups, {});

    await user.click(screen.getByRole("button", { name: /grupo a/i }));

    expect(document.getElementById).toHaveBeenCalledWith("A");
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    vi.restoreAllMocks();
  });

  it("renders the nav row with horizontal scroll", () => {
    const groups = makeGroups();
    const { container } = renderWithProvider(groups, {});

    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
  });
});
