// @vitest-environment jsdom

/**
 * Tests for <FixtureClient> — the client-side toggle shell that switches
 * between the Grupos (standings) and Llave (bracket) views.
 *
 * Spec scenarios covered:
 * - "Default view on load" → Grupos tab active, standings visible
 * - "Toggle to bracket" → clicking Llave renders bracket, no extra fetch
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { GroupStandings } from "@/features/tournament/entities/standings";
import type { BracketRound } from "@/features/tournament/entities/bracket";

// Minimal mocks — FixtureClient delegates rendering to child components.
// We only care that the right child is shown per tab state.
vi.mock("@/features/tournament/components/standings-table", () => ({
  StandingsTable: ({ standings }: { standings: GroupStandings[] }) => (
    <div data-testid="standings-table">StandingsTable:{standings.length}</div>
  ),
}));

vi.mock("@/features/tournament/components/bracket-view", () => ({
  BracketView: ({ rounds }: { rounds: BracketRound[] }) => (
    <div data-testid="bracket-view">BracketView:{rounds.length}</div>
  ),
}));

import { FixtureClient } from "@/features/tournament/components/fixture-client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STANDINGS: GroupStandings[] = [];
const BRACKET: BracketRound[] = [];
const QUALIFIED_IDS: string[] = [];

function renderFixtureClient() {
  return render(
    <FixtureClient
      standings={STANDINGS}
      bracket={BRACKET}
      qualifiedTeamIds={QUALIFIED_IDS}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FixtureClient", () => {
  it("shows the Grupos tab as active by default", () => {
    renderFixtureClient();

    const gruposBtn = screen.getByRole("button", { name: /grupos/i });
    expect(gruposBtn).toHaveAttribute("aria-pressed", "true");

    const llaveBtn = screen.getByRole("button", { name: /llave/i });
    expect(llaveBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("renders StandingsTable (not BracketView) on initial load", () => {
    renderFixtureClient();

    expect(screen.getByTestId("standings-table")).toBeInTheDocument();
    expect(screen.queryByTestId("bracket-view")).not.toBeInTheDocument();
  });

  it("switches to BracketView when Llave is clicked", async () => {
    renderFixtureClient();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /llave/i }));

    expect(screen.getByTestId("bracket-view")).toBeInTheDocument();
    expect(screen.queryByTestId("standings-table")).not.toBeInTheDocument();
  });

  it("switches back to StandingsTable when Grupos is clicked again", async () => {
    renderFixtureClient();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /llave/i }));
    await user.click(screen.getByRole("button", { name: /grupos/i }));

    expect(screen.getByTestId("standings-table")).toBeInTheDocument();
    expect(screen.queryByTestId("bracket-view")).not.toBeInTheDocument();
  });

  it("marks Llave button as active after toggle", async () => {
    renderFixtureClient();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /llave/i }));

    expect(screen.getByRole("button", { name: /llave/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /grupos/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
