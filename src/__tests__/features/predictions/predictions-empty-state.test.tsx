/**
 * Tests for the empty-state UX in predictions-page-client.
 *
 * When the active filter produces zero visible matches (getFilterCount === 0),
 * the groups list must be replaced by the shared EmptyState with a per-filter
 * Spanish message. When count > 0, groups render and EmptyState is absent.
 *
 * Strategy: render PredictionsProvider + FilterEmptyState (the inner guard
 * component exported for testing) directly, controlling savedMap and filter
 * via the provider's initialPredictions + a helper that sets the active filter.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FilterSegment } from "@/features/predictions/components/filter-segment";
import { FilteredGroupsOrEmpty } from "@/features/predictions/components/filtered-groups-or-empty";
import { PredictionsProvider } from "@/features/predictions/components/predictions-provider";
import type { GroupBlock } from "@/features/predictions/entities/predictions-page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date("2026-06-01T12:00:00.000Z");
// Future kickoff (48 h) → not "cierran pronto", not locked
const KICKS_LATER = new Date(NOW.getTime() + 48 * 60 * 60 * 1000);
// Near kickoff (12 h) → within "cierran pronto" window
const KICKS_SOON = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);

function makeMatch(
  id: string,
  kickoffAt: Date = KICKS_LATER,
  status: "scheduled" | "live" | "confirmed" = "scheduled",
) {
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
    kickoffAt,
    status,
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
  };
}

function makeGroups(matches: ReturnType<typeof makeMatch>[]): GroupBlock[] {
  return [{ groupLabel: "A", matches }];
}

type SavedEntry = {
  homeScore: number;
  awayScore: number;
  advancerTeamId: string | null;
};

/**
 * Renders FilterSegment + FilteredGroupsOrEmpty inside PredictionsProvider.
 * FilterSegment lets tests drive filter changes via userEvent clicks.
 * FilteredGroupsOrEmpty is the component under test.
 */
function renderScene(
  groups: GroupBlock[],
  savedMap: Record<string, SavedEntry> = {},
) {
  return render(
    <PredictionsProvider
      initialPredictions={savedMap}
      groups={groups}
      now={NOW}
    >
      <FilterSegment />
      <FilteredGroupsOrEmpty>
        {/* Sentinel: a recognisable element that represents the groups list */}
        <div data-testid="groups-list">grupos aquí</div>
      </FilteredGroupsOrEmpty>
    </PredictionsProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FilteredGroupsOrEmpty — Guardados filter with 0 saved predictions", () => {
  it("shows EmptyState (not groups) when Guardados filter has count 0", async () => {
    const user = userEvent.setup();
    // 1 match, no saved predictions → guardados count = 0
    const groups = makeGroups([makeMatch("m1")]);
    renderScene(groups);

    await user.click(screen.getByRole("button", { name: /guardados/i }));

    expect(
      screen.getByText(/todavía no guardaste ningún pronóstico/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("groups-list")).not.toBeInTheDocument();
  });

  it("shows groups (not EmptyState) when Guardados filter has count > 0", async () => {
    const user = userEvent.setup();
    // 1 match saved → guardados count = 1
    const groups = makeGroups([makeMatch("m1")]);
    renderScene(groups, {
      m1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    });

    await user.click(screen.getByRole("button", { name: /guardados/i }));

    expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    expect(
      screen.queryByText(/todavía no guardaste ningún pronóstico/i),
    ).not.toBeInTheDocument();
  });
});

describe("FilteredGroupsOrEmpty — Pendientes filter with 0 pending", () => {
  it("shows EmptyState with pendientes message when count is 0", async () => {
    const user = userEvent.setup();
    // 1 match, saved → pendientes count = 0
    const groups = makeGroups([makeMatch("m1")]);
    renderScene(groups, {
      m1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    });

    await user.click(screen.getByRole("button", { name: /pendientes/i }));

    expect(screen.getByText(/no te queda nada pendiente/i)).toBeInTheDocument();
    expect(screen.queryByTestId("groups-list")).not.toBeInTheDocument();
  });

  it("shows groups when Pendientes filter has count > 0", async () => {
    const user = userEvent.setup();
    // 1 match not saved → pendientes count = 1
    const groups = makeGroups([makeMatch("m1")]);
    renderScene(groups);

    await user.click(screen.getByRole("button", { name: /pendientes/i }));

    expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    expect(
      screen.queryByText(/no te queda nada pendiente/i),
    ).not.toBeInTheDocument();
  });
});

describe("FilteredGroupsOrEmpty — Cierran pronto filter with 0 matches", () => {
  it("shows EmptyState with cierran-pronto message when count is 0", async () => {
    const user = userEvent.setup();
    // Match kickoff 48 h away → outside cierran-pronto window
    const groups = makeGroups([makeMatch("m1", KICKS_LATER)]);
    renderScene(groups);

    await user.click(screen.getByRole("button", { name: /cierran pronto/i }));

    expect(
      screen.getByText(/no hay partidos que cierren pronto/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("groups-list")).not.toBeInTheDocument();
  });

  it("shows groups when Cierran pronto filter has count > 0", async () => {
    const user = userEvent.setup();
    // Match kickoff 12 h away → inside cierran-pronto window
    const groups = makeGroups([makeMatch("m1", KICKS_SOON)]);
    renderScene(groups);

    await user.click(screen.getByRole("button", { name: /cierran pronto/i }));

    expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    expect(
      screen.queryByText(/no hay partidos que cierren pronto/i),
    ).not.toBeInTheDocument();
  });
});

describe("FilteredGroupsOrEmpty — Todos filter", () => {
  it("always shows groups under Todos filter (default state)", () => {
    const groups = makeGroups([makeMatch("m1")]);
    renderScene(groups);

    // Default filter is "todos" — groups must be visible
    expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    expect(
      screen.queryByText(/no hay partidos para mostrar/i),
    ).not.toBeInTheDocument();
  });
});
