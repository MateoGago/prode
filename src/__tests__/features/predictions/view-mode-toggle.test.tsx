/**
 * Tests for ViewModeToggle.
 *
 * The toggle reads `viewMode` / `setViewMode` from PredictionsProvider and
 * switches the board between "Día" (group by date) and "Etapa" (group by group).
 * It defaults to "Día" (the provider's default), and the active segment is
 * marked with aria-pressed for assistive tech.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BoardGroupNav } from "@/features/predictions/components/group-nav";
import { PredictionsProvider } from "@/features/predictions/components/predictions-provider";
import { ViewModeToggle } from "@/features/predictions/components/view-mode-toggle";
import type { GroupBlock } from "@/features/predictions/entities/predictions-page";

const NOW = new Date("2026-06-01T12:00:00.000Z");

const GROUPS: GroupBlock[] = [{ groupLabel: "A", matches: [] }];

function renderToggle() {
  return render(
    <PredictionsProvider initialPredictions={{}} groups={GROUPS} now={NOW}>
      <ViewModeToggle />
    </PredictionsProvider>,
  );
}

describe("ViewModeToggle", () => {
  it("renders both Día and Etapa segments", () => {
    renderToggle();

    expect(screen.getByRole("button", { name: "Día" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Etapa" })).toBeInTheDocument();
  });

  it("marks Día as the active (pressed) segment by default", () => {
    renderToggle();

    expect(screen.getByRole("button", { name: "Día" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Etapa" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("switches the pressed segment to Etapa when clicked", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("button", { name: "Etapa" }));

    expect(screen.getByRole("button", { name: "Etapa" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Día" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("BoardGroupNav", () => {
  it("hides the group chip row in the Día view and reveals it in Etapa", async () => {
    const user = userEvent.setup();
    render(
      <PredictionsProvider initialPredictions={{}} groups={GROUPS} now={NOW}>
        <ViewModeToggle />
        <BoardGroupNav />
      </PredictionsProvider>,
    );

    // Día is the default → no group-navigation row.
    expect(
      screen.queryByRole("navigation", { name: /grupos/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Etapa" }));

    expect(
      screen.getByRole("navigation", { name: /grupos/i }),
    ).toBeInTheDocument();
  });
});
