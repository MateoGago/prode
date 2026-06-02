import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  MatchBreakdownList,
  type MatchBreakdownItem,
} from "@/features/leaderboard/components/match-breakdown-list";

const makeItem = (
  overrides: Partial<MatchBreakdownItem> = {},
): MatchBreakdownItem => ({
  matchId: "m1",
  matchLabel: "Argentina vs Brazil",
  homeTeamName: "Argentina",
  awayTeamName: "Brazil",
  homeFlagUrl: null,
  awayFlagUrl: null,
  predictedHomeScore: 2,
  predictedAwayScore: 1,
  actualHomeScore: 2,
  actualAwayScore: 1,
  pointsAwarded: 3,
  hitType: "exact",
  multiplier: 1,
  ...overrides,
});

describe("MatchBreakdownList — Cancha Pop (D-8)", () => {
  it("renders the match label for each item", () => {
    render(<MatchBreakdownList items={[makeItem()]} />);
    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("Brazil")).toBeInTheDocument();
  });

  it("shows 'Exacto' badge for an exact hit", () => {
    render(<MatchBreakdownList items={[makeItem({ hitType: "exact" })]} />);
    expect(screen.getByText("Exacto")).toBeInTheDocument();
  });

  it("shows 'Ganador' badge for a winner hit", () => {
    render(<MatchBreakdownList items={[makeItem({ hitType: "winner" })]} />);
    expect(screen.getByText("Ganador")).toBeInTheDocument();
  });

  it("shows 'Erró' badge for a miss", () => {
    render(<MatchBreakdownList items={[makeItem({ hitType: "miss" })]} />);
    expect(screen.getByText("Erró")).toBeInTheDocument();
  });

  it("shows the ×N multiplier chip when multiplier > 1", () => {
    render(<MatchBreakdownList items={[makeItem({ multiplier: 2 })]} />);
    expect(screen.getByText("×2")).toBeInTheDocument();
  });

  it("does NOT show the multiplier chip when multiplier is 1", () => {
    render(<MatchBreakdownList items={[makeItem({ multiplier: 1 })]} />);
    expect(screen.queryByText("×1")).not.toBeInTheDocument();
  });

  it("shows points awarded for each item", () => {
    render(<MatchBreakdownList items={[makeItem({ pointsAwarded: 6 })]} />);
    expect(screen.getByText("+6")).toBeInTheDocument();
  });

  it("shows 0 pts for zero-point items", () => {
    render(
      <MatchBreakdownList
        items={[makeItem({ pointsAwarded: 0, hitType: "miss" })]}
      />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("uses EmptyState when items is empty", () => {
    render(<MatchBreakdownList items={[]} />);
    expect(
      screen.getByText("No hay desglose para mostrar."),
    ).toBeInTheDocument();
  });

  it("uses custom emptyMessage when provided", () => {
    render(
      <MatchBreakdownList
        items={[]}
        emptyMessage="Aún no jugaste ningún partido"
      />,
    );
    expect(
      screen.getByText("Aún no jugaste ningún partido"),
    ).toBeInTheDocument();
  });

  it("renders all items in the list", () => {
    const items = [
      makeItem({
        matchId: "m1",
        matchLabel: "Argentina vs Brazil",
        homeTeamName: "Argentina",
        awayTeamName: "Brazil",
        hitType: "exact",
      }),
      makeItem({
        matchId: "m2",
        matchLabel: "France vs Germany",
        homeTeamName: "France",
        awayTeamName: "Germany",
        hitType: "winner",
      }),
      makeItem({
        matchId: "m3",
        matchLabel: "Spain vs Italy",
        homeTeamName: "Spain",
        awayTeamName: "Italy",
        hitType: "miss",
      }),
    ];
    render(<MatchBreakdownList items={items} />);
    // Each <li> carries aria-label with the combined match label
    expect(
      screen.getByRole("listitem", { name: "Argentina vs Brazil" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "France vs Germany" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "Spain vs Italy" }),
    ).toBeInTheDocument();
    // Individual team names are rendered in the DOM
    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText("Spain")).toBeInTheDocument();
  });
});
