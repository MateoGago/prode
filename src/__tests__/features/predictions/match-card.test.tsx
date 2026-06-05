// @vitest-environment jsdom

/**
 * Tests for the MatchCard presentational component (post-batch refactor).
 *
 * MatchCard is now a pure presentational card: it receives `cardState`,
 * `prediction`, `error` and a single `onChange` callback. There is NO per-card
 * save button anymore — the batch bar is the only save path (constraint).
 *
 * These tests cover the behavior that matters for the card itself: the visible
 * state indicators, stepper enable/disable rules, the REQ-02 activation on the
 * first "+" tap, the confirmed panel, the KO-draw advancer, and the error copy.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Match, Round, Team } from "@/features/fixtures/entities/match";
import { MatchCard } from "@/features/predictions/components/match-card";
import type { PredictionInput } from "@/features/predictions/entities/prediction";
import type { CardState } from "@/features/predictions/entities/predictions-board";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOME: Team = {
  id: "ar",
  externalRef: "AR",
  name: "Argentina",
  groupLabel: "A",
  flagUrl: null,
};

const AWAY: Team = {
  id: "br",
  externalRef: "BR",
  name: "Brasil",
  groupLabel: "A",
  flagUrl: null,
};

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "m1",
    externalRef: "M1",
    round: "group" as Round,
    multiplier: 1,
    matchday: 1,
    homeTeam: HOME,
    awayTeam: AWAY,
    homePlaceholder: null,
    awayPlaceholder: null,
    kickoffAt: new Date("2026-06-10T18:00:00.000Z"),
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    penaltyWinnerTeam: null,
    advancerTeam: null,
    resultConfirmedAt: null,
    ...overrides,
  };
}

function renderCard(props: {
  match?: Match;
  cardState: CardState;
  prediction: PredictionInput | null;
  error?: string | null;
  onChange?: (next: PredictionInput) => void;
}) {
  const match = props.match ?? makeMatch();
  const onChange = props.onChange ?? vi.fn();
  render(
    <MatchCard
      match={match}
      cardState={props.cardState}
      prediction={props.prediction}
      error={props.error}
      onChange={onChange}
    />,
  );
  return { match, onChange };
}

// The home/away stepper toolbars are labelled "Goles de {teamName}" (see
// ScoreControl). Querying within that group keeps the +/- lookups unambiguous.
function homeStepper() {
  return screen.getByRole("group", { name: /goles de argentina/i });
}
function awayStepper() {
  return screen.getByRole("group", { name: /goles de brasil/i });
}
function incrementBtn(group: HTMLElement) {
  return within(group).getByRole("button", { name: /sumar|incrementar|\+/i });
}
function decrementBtn(group: HTMLElement) {
  return within(group).getByRole("button", { name: /restar|decrementar|−|-/i });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MatchCard", () => {
  it("empty state: shows muted placeholder, decrement disabled, '+' activates with {1,0,null}", async () => {
    const user = userEvent.setup();
    const { onChange } = renderCard({ cardState: "empty", prediction: null });

    // The score shows the muted "–" placeholder, not "0".
    const home = homeStepper();
    expect(within(home).getByText("–")).toBeInTheDocument();
    expect(within(home).queryByText("0")).not.toBeInTheDocument();

    // Decrement is disabled in the empty state.
    expect(decrementBtn(home)).toBeDisabled();

    // REQ-02 activation: first "+" on home → {homeScore:1, awayScore:0, advancerTeamId:null}.
    await user.click(incrementBtn(home));
    expect(onChange).toHaveBeenCalledWith({
      homeScore: 1,
      awayScore: 0,
      advancerTeamId: null,
    });
  });

  it("dirty state: shows 'Sin guardar', scores 1 and 0, steppers enabled", () => {
    renderCard({
      cardState: "dirty",
      prediction: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    });

    expect(screen.getByText(/sin guardar/i)).toBeInTheDocument();

    const home = homeStepper();
    const away = awayStepper();
    expect(within(home).getByText("1")).toBeInTheDocument();
    expect(within(away).getByText("0")).toBeInTheDocument();

    expect(incrementBtn(home)).toBeEnabled();
    expect(decrementBtn(home)).toBeEnabled();
    expect(incrementBtn(away)).toBeEnabled();
  });

  it("saved state: shows green '✓ Guardado' pill, steppers STILL enabled (saved ≠ locked)", () => {
    renderCard({
      cardState: "saved",
      prediction: { homeScore: 2, awayScore: 1, advancerTeamId: null },
    });

    expect(screen.getByText(/guardado/i)).toBeInTheDocument();

    // Constraint B: saved is editable — steppers stay active.
    expect(incrementBtn(homeStepper())).toBeEnabled();
    expect(decrementBtn(homeStepper())).toBeEnabled();
  });

  it("locked state: steppers disabled, shows 'Este partido ya empezó', no Guardado pill", () => {
    renderCard({
      cardState: "locked",
      prediction: { homeScore: 1, awayScore: 0, advancerTeamId: null },
    });

    expect(screen.getByText(/este partido ya empezó/i)).toBeInTheDocument();
    expect(screen.queryByText(/guardado/i)).not.toBeInTheDocument();

    expect(incrementBtn(homeStepper())).toBeDisabled();
    expect(decrementBtn(homeStepper())).toBeDisabled();
  });

  it("confirmed state: shows the real scoreboard, the prediction and the outcome", () => {
    const match = makeMatch({
      status: "confirmed",
      homeScore: 2,
      awayScore: 1,
      resultConfirmedAt: new Date("2026-06-10T20:00:00.000Z"),
    });
    renderCard({
      match,
      cardState: "confirmed",
      prediction: { homeScore: 2, awayScore: 1, advancerTeamId: null },
    });

    // The player's prediction is surfaced in the outcome alert.
    expect(screen.getByText(/tu pronóstico/i)).toBeInTheDocument();
    expect(screen.getByText("2–1")).toBeInTheDocument();
    // Exact match (predicted 2–1, real 2–1) → "Acertaste".
    expect(screen.getByText("Acertaste")).toBeInTheDocument();
  });

  it("KO draw: renders the AdvancerPicker when round != group and scores are equal", () => {
    const match = makeMatch({ round: "r16", multiplier: 2 });
    renderCard({
      match,
      cardState: "dirty",
      prediction: { homeScore: 1, awayScore: 1, advancerTeamId: null },
    });

    // AdvancerPicker is a fieldset asking who advances on penalties; its team
    // buttons are the only ones carrying aria-pressed (the steppers don't).
    expect(screen.getByText(/quién avanza por penales/i)).toBeInTheDocument();
    const advancerButtons = screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("aria-pressed"));
    expect(advancerButtons).toHaveLength(2);
    expect(advancerButtons[0]).toHaveTextContent("Argentina");
    expect(advancerButtons[1]).toHaveTextContent("Brasil");
  });

  it("error 'locked': renders a destructive alert with the locked copy", () => {
    renderCard({
      cardState: "saved",
      prediction: { homeScore: 1, awayScore: 0, advancerTeamId: null },
      error: "locked",
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/ya empezó/i);
  });

  it("error unknown reason: renders the generic fallback copy", () => {
    renderCard({
      cardState: "saved",
      prediction: { homeScore: 1, awayScore: 0, advancerTeamId: null },
      error: "unauthenticated",
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo guardar. Probá de nuevo.");
  });

  it("no per-card save button in any editable state (batch bar is the only save path)", () => {
    for (const cardState of ["empty", "dirty", "saved"] as const) {
      const { unmount } = render(
        <MatchCard
          match={makeMatch()}
          cardState={cardState}
          prediction={
            cardState === "empty"
              ? null
              : { homeScore: 1, awayScore: 0, advancerTeamId: null }
          }
          onChange={vi.fn()}
        />,
      );
      expect(
        screen.queryByRole("button", { name: /guardar/i }),
      ).not.toBeInTheDocument();
      unmount();
    }
  });
});
