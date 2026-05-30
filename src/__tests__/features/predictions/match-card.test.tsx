import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MatchCard } from "@/features/predictions/components/match-card";
import type { Match, Round } from "@/features/fixtures/entities/match";

function team(id: string, name: string) {
  return {
    id,
    externalRef: id.toUpperCase(),
    name,
    groupLabel: "C",
    flagUrl: null,
  };
}

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "m1",
    externalRef: "M1",
    round: "group" as Round,
    multiplier: 1,
    matchday: 2,
    homeTeam: team("ar", "Argentina"),
    awayTeam: team("mx", "México"),
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date("2026-06-13T16:00:00.000Z"),
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
    ...overrides,
  };
}

describe("MatchCard — OPEN state", () => {
  it("increments the home score through the Stepper", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MatchCard
        match={makeMatch()}
        prediction={{ homeScore: 2, awayScore: 1, advancerTeamId: null }}
        isLocked={false}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /sumar a goles de argentina/i }),
    );
    expect(onChange).toHaveBeenCalledWith({
      homeScore: 3,
      awayScore: 1,
      advancerTeamId: null,
    });
  });

  it("shows the Guardar CTA", () => {
    render(
      <MatchCard
        match={makeMatch()}
        prediction={{ homeScore: 0, awayScore: 0, advancerTeamId: null }}
        isLocked={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /guardar/i })).toBeEnabled();
  });
});

describe("MatchCard — LOCKED state", () => {
  it("disables the stepper and explains the match already started", () => {
    render(
      <MatchCard
        match={makeMatch()}
        prediction={{ homeScore: 1, awayScore: 0, advancerTeamId: null }}
        isLocked
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /sumar a goles de argentina/i }),
    ).toBeDisabled();
    expect(screen.getByText(/ya empezó/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /guardar/i }),
    ).not.toBeInTheDocument();
  });
});

describe("MatchCard — CONFIRMED state", () => {
  it("renders Vos vs Real and the exact hit badge", () => {
    render(
      <MatchCard
        match={makeMatch({
          status: "confirmed",
          homeScore: 2,
          awayScore: 1,
          resultConfirmedAt: new Date("2026-06-13T18:00:00.000Z"),
        })}
        prediction={{ homeScore: 2, awayScore: 1, advancerTeamId: null }}
        isLocked
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/vos/i)).toBeInTheDocument();
    expect(screen.getByText(/real/i)).toBeInTheDocument();
    expect(screen.getByText(/exacto/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sumar/i }),
    ).not.toBeInTheDocument();
  });
});

describe("MatchCard — advancer picker visibility", () => {
  it("is hidden on a group draw", () => {
    render(
      <MatchCard
        match={makeMatch()}
        prediction={{ homeScore: 1, awayScore: 1, advancerTeamId: null }}
        isLocked={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("group", { name: /avanza/i }),
    ).not.toBeInTheDocument();
  });

  it("shows on a knockout draw with both teams as options", () => {
    render(
      <MatchCard
        match={makeMatch({ round: "r16", multiplier: 2, matchday: null })}
        prediction={{ homeScore: 1, awayScore: 1, advancerTeamId: null }}
        isLocked={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const picker = screen.getByRole("group", { name: /avanza/i });
    expect(picker).toBeInTheDocument();
    expect(
      within(picker).getByRole("button", { name: /argentina/i }),
    ).toBeInTheDocument();
    expect(
      within(picker).getByRole("button", { name: /méxico/i }),
    ).toBeInTheDocument();
  });

  it("clears a stale advancer when the KO prediction stops being a draw", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MatchCard
        match={makeMatch({ round: "r16", multiplier: 2, matchday: null })}
        prediction={{ homeScore: 1, awayScore: 1, advancerTeamId: "ar" }}
        isLocked={false}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /sumar a goles de argentina/i }),
    );
    expect(onChange).toHaveBeenCalledWith({
      homeScore: 2,
      awayScore: 1,
      advancerTeamId: null,
    });
  });
});
