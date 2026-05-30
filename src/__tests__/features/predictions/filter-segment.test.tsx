/**
 * Tests for FilterSegment component (Slice 3).
 *
 * FilterSegment reads filter + all match state from PredictionsProvider context,
 * renders 4 tab buttons (Todos / Pendientes / Cierran pronto / Guardados),
 * shows live counts per tab, and calls setFilter(kind) on click.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FilterSegment } from "@/features/predictions/components/filter-segment";
import { PredictionsProvider } from "@/features/predictions/components/predictions-provider";
import type { GroupBlock } from "@/features/predictions/entities/predictions-page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date("2026-06-01T12:00:00.000Z");
// Kickoff 12 hours from now = within the 24h "cierran pronto" window
const KICKS_SOON = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);
// Kickoff 48 hours from now = outside window
const KICKS_LATER = new Date(NOW.getTime() + 48 * 60 * 60 * 1000);

function makeMatch(
  id: string,
  kickoffAt: Date,
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

function renderWithProvider(
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
    </PredictionsProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FilterSegment", () => {
  it("renders all four filter tabs", () => {
    const groups = makeGroups([makeMatch("m1", KICKS_LATER)]);
    renderWithProvider(groups);

    expect(screen.getByRole("button", { name: /todos/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /pendientes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cierran pronto/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /guardados/i }),
    ).toBeInTheDocument();
  });

  it("activates the 'todos' tab by default", () => {
    const groups = makeGroups([makeMatch("m1", KICKS_LATER)]);
    renderWithProvider(groups);

    const todosBtn = screen.getByRole("button", { name: /todos/i });
    expect(todosBtn).toHaveAttribute("data-active", "true");
  });

  it("shows 'todos' count equal to total matches", () => {
    const groups = makeGroups([
      makeMatch("m1", KICKS_LATER),
      makeMatch("m2", KICKS_LATER),
    ]);
    renderWithProvider(groups);

    const todosBtn = screen.getByRole("button", { name: /todos/i });
    expect(todosBtn).toHaveTextContent("2");
  });

  it("shows 'pendientes' count — unsaved matches only", () => {
    // 2 matches: 1 saved, 1 not → 1 pendiente
    const groups = makeGroups([
      makeMatch("m1", KICKS_LATER),
      makeMatch("m2", KICKS_LATER),
    ]);
    renderWithProvider(groups, {
      m1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    });

    const pendientesBtn = screen.getByRole("button", { name: /pendientes/i });
    expect(pendientesBtn).toHaveTextContent("1");
  });

  it("shows 'guardados' count — saved matches", () => {
    const groups = makeGroups([
      makeMatch("m1", KICKS_LATER),
      makeMatch("m2", KICKS_LATER),
    ]);
    renderWithProvider(groups, {
      m1: { homeScore: 1, awayScore: 0, advancerTeamId: null },
      m2: { homeScore: 2, awayScore: 1, advancerTeamId: null },
    });

    const guardadosBtn = screen.getByRole("button", { name: /guardados/i });
    expect(guardadosBtn).toHaveTextContent("2");
  });

  it("shows 'cierran pronto' count — matches kicking off within 24 hours", () => {
    const groups = makeGroups([
      makeMatch("m1", KICKS_SOON), // within 24h
      makeMatch("m2", KICKS_LATER), // outside 24h
    ]);
    renderWithProvider(groups);

    const cierranBtn = screen.getByRole("button", { name: /cierran pronto/i });
    expect(cierranBtn).toHaveTextContent("1");
  });

  it("updates the active tab when a tab is clicked", async () => {
    const user = userEvent.setup();
    const groups = makeGroups([makeMatch("m1", KICKS_LATER)]);
    renderWithProvider(groups);

    const pendientesBtn = screen.getByRole("button", { name: /pendientes/i });
    await user.click(pendientesBtn);

    expect(pendientesBtn).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: /todos/i })).toHaveAttribute(
      "data-active",
      "false",
    );
  });
});
