/**
 * Tests for BatchBar — the floating save drawer.
 *
 * The drawer reads the dirty, non-locked batch + saved tally from
 * PredictionsProvider. It is hidden when there is nothing to save, shows the
 * "{cargados} / {total} pronosticados" tally plus a "+N cambios sin guardar"
 * line once edited, and Cancelar discards the working edits (hiding it again).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BatchBar } from "@/features/predictions/components/batch-bar";
import {
  PredictionsProvider,
  usePredictionsBoard,
} from "@/features/predictions/components/predictions-provider";
import type { GroupBlock } from "@/features/predictions/entities/predictions-page";

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

const GROUPS: GroupBlock[] = [
  { groupLabel: "A", matches: [makeMatch("a1"), makeMatch("a2")] },
];

/** Tiny harness that lets a test seed a working edit through the real context. */
function Editor() {
  const { setPrediction } = usePredictionsBoard();
  return (
    <button
      type="button"
      onClick={() =>
        setPrediction("a1", {
          homeScore: 1,
          awayScore: 0,
          advancerTeamId: null,
        })
      }
    >
      edit a1
    </button>
  );
}

function renderDrawer() {
  return render(
    <PredictionsProvider initialPredictions={{}} groups={GROUPS} now={NOW}>
      <Editor />
      <BatchBar />
    </PredictionsProvider>,
  );
}

describe("BatchBar", () => {
  it("is hidden when there are no unsaved changes", () => {
    renderDrawer();

    expect(screen.queryByText(/sin guardar/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Guardar" }),
    ).not.toBeInTheDocument();
  });

  it("shows the tally and change count after an edit", async () => {
    const user = userEvent.setup();
    const { container } = renderDrawer();

    await user.click(screen.getByRole("button", { name: "edit a1" }));

    // 0 saved of 2 total; one pending change.
    const drawer = container.querySelector("[data-save-drawer]");
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent("0 / 2");
    expect(drawer).toHaveTextContent("pronosticados");
    expect(screen.getByText("+1 cambio sin guardar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("Cancelar discards the working edit and hides the drawer", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "edit a1" }));
    expect(screen.getByText("+1 cambio sin guardar")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText(/sin guardar/i)).not.toBeInTheDocument();
  });
});
