/**
 * Tests for ProgressHeader component (Slice 2).
 *
 * Uses PredictionsProvider with injectable `now` so "cierran hoy" is
 * deterministic — matches whose kickoffAt falls within today's UTC calendar
 * day (per deriveProgress semantics from Slice 1, unchanged).
 *
 * SUGGESTION-01 carry-forward: cierranHoy counts open matches (not yet kicked
 * off) whose kickoffAt is within today's calendar day (UTC). This aligns with
 * deriveProgress's existing behaviour: it counts every match whose kickoffAt
 * falls in the UTC day window of `now`. We preserve that invariant here
 * instead of silently changing it, because altering it would require updating
 * deriveProgress tests too — a cross-slice concern outside Slice 2 scope.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PredictionsProvider } from "@/features/predictions/components/predictions-provider";
import { ProgressHeader } from "@/features/predictions/components/progress-header";
import type { GroupBlock } from "@/features/predictions/entities/predictions-page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGroups(count: number, kickoffAt: Date): GroupBlock[] {
  const matches = Array.from({ length: count }, (_, i) => ({
    id: `m${i + 1}`,
    externalRef: `M${i + 1}`,
    round: "group" as const,
    multiplier: 1,
    matchday: 1,
    homeTeam: null,
    awayTeam: null,
    homePlaceholder: "TBD",
    awayPlaceholder: "TBD",
    kickoffAt,
    status: "scheduled" as const,
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
  }));
  return [{ groupLabel: "A", matches }];
}

function renderWithProvider(
  groups: GroupBlock[],
  savedMap: Record<
    string,
    { homeScore: number; awayScore: number; advancerTeamId: string | null }
  >,
  now: Date,
) {
  return render(
    <PredictionsProvider
      initialPredictions={savedMap}
      groups={groups}
      now={now}
    >
      <ProgressHeader />
    </PredictionsProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const TODAY = new Date("2026-06-13T12:00:00.000Z");
// A kickoff that falls on the same UTC calendar day as TODAY
const KICKOFF_TODAY = new Date("2026-06-13T20:00:00.000Z");
// A kickoff on a different day
const KICKOFF_TOMORROW = new Date("2026-06-14T20:00:00.000Z");

describe("ProgressHeader", () => {
  it("renders '0 de 72 cargados' when nothing is saved", () => {
    const groups = makeGroups(72, KICKOFF_TOMORROW);
    renderWithProvider(groups, {}, TODAY);
    // Text is split across styled spans — use a flexible matcher on the container
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent?.replace(/\s+/g, " ").trim() === "0 de 72 cargados",
      ),
    ).toBeInTheDocument();
  });

  it("renders the correct cargados count when predictions are saved", () => {
    const groups = makeGroups(72, KICKOFF_TOMORROW);
    const saved = { homeScore: 1, awayScore: 0, advancerTeamId: null };
    // Save 10 predictions
    const savedMap = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`m${i + 1}`, saved]),
    );
    renderWithProvider(groups, savedMap, TODAY);
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent?.replace(/\s+/g, " ").trim() === "10 de 72 cargados",
      ),
    ).toBeInTheDocument();
  });

  it("renders 'Te faltan N' reflecting the unsaved count", () => {
    const groups = makeGroups(72, KICKOFF_TOMORROW);
    const saved = { homeScore: 1, awayScore: 0, advancerTeamId: null };
    const savedMap = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`m${i + 1}`, saved]),
    );
    renderWithProvider(groups, savedMap, TODAY);
    // "Te faltan 62" is split: "Te faltan " (text node) + "62" (strong).
    // Match the direct span container (tagName SPAN) to avoid multiple-match.
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "SPAN" &&
          el.textContent?.replace(/\s+/g, " ").trim() === "Te faltan 62",
      ),
    ).toBeInTheDocument();
  });

  it("hides the 'cierran hoy' pill when cierranHoy is 0", () => {
    // All matches kick off tomorrow — none close today
    const groups = makeGroups(3, KICKOFF_TOMORROW);
    renderWithProvider(groups, {}, TODAY);
    expect(screen.queryByText(/cierran hoy/i)).not.toBeInTheDocument();
  });

  it("shows the 'cierran hoy' pill with the correct count when > 0", () => {
    // 2 matches kick off today
    const matchesToday = makeGroups(2, KICKOFF_TODAY);
    renderWithProvider(matchesToday, {}, TODAY);
    expect(screen.getByText(/2 cierran hoy/i)).toBeInTheDocument();
  });

  it("renders a progress bar accessible region", () => {
    const groups = makeGroups(72, KICKOFF_TOMORROW);
    renderWithProvider(groups, {}, TODAY);
    // Progress bar should exist in the document
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("reflects 0% on the progress bar when nothing saved", () => {
    const groups = makeGroups(72, KICKOFF_TOMORROW);
    renderWithProvider(groups, {}, TODAY);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("reflects the saved percentage on the progress bar", () => {
    const groups = makeGroups(72, KICKOFF_TOMORROW);
    const saved = { homeScore: 1, awayScore: 0, advancerTeamId: null };
    // 36 saved = 50%
    const savedMap = Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [`m${i + 1}`, saved]),
    );
    renderWithProvider(groups, savedMap, TODAY);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });
});
