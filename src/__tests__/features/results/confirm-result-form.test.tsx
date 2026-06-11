import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ConfirmResultForm,
  type ConfirmResultTeamOption,
} from "@/features/results";
import type { ConfirmActionResult, ResultInput } from "@/features/results";

// sonner toasts are infra-ish side effects; we mock them to assert business
// errors flow back from the server action (not from the client schema).
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

const homeTeam: ConfirmResultTeamOption = {
  id: "team-home",
  name: "Argentina",
};
const awayTeam: ConfirmResultTeamOption = { id: "team-away", name: "Francia" };

function ok(recomputed = 0): ConfirmActionResult {
  return { ok: true, recomputed };
}

beforeEach(() => {
  toastError.mockClear();
  toastSuccess.mockClear();
});

describe("ConfirmResultForm", () => {
  it("renders Local and Visitante Stepper groups", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.getByRole("group", { name: /local/i })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /visitante/i }),
    ).toBeInTheDocument();
  });

  it("renders a 'Confirmar resultado' submit button", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    ).toBeInTheDocument();
  });

  it("increments home score via Stepper + button", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={0}
        defaultAwayScore={0}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: /sumar a local/i }));
    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0] as ResultInput;
    expect(arg.homeScore).toBe(1);
    expect(arg.awayScore).toBe(0);
  });

  it("increments away score via Stepper + button", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={0}
        defaultAwayScore={0}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /sumar a visitante/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0] as ResultInput;
    expect(arg.homeScore).toBe(0);
    expect(arg.awayScore).toBe(1);
  });

  it("does not go below 0 (Stepper min guard)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={0}
        defaultAwayScore={0}
        onSubmit={onSubmit}
      />,
    );

    // The − button is disabled at min=0; clicking it should not decrease the value.
    await user.click(screen.getByRole("button", { name: /restar a local/i }));
    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0][0] as ResultInput).homeScore).toBe(0);
  });

  it("hides the advancer selector for a group round even on a draw", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={1}
        defaultAwayScore={1}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    // Trigger re-render by clicking (values already set via defaults)
    await user.click(screen.getByRole("button", { name: /sumar a local/i }));
    await user.click(screen.getByRole("button", { name: /restar a local/i }));

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("hides the advancer selector for a knockout non-draw", async () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={2}
        defaultAwayScore={1}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("shows the advancer selector for a knockout draw with both team names", async () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={1}
        defaultAwayScore={1}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    const group = screen.getByRole("radiogroup");
    expect(group).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Argentina" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Francia" })).toBeInTheDocument();
  });

  it("labels advancer radios with the real team names", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="final"
        homeTeam={{ id: "h", name: "Uruguay" }}
        awayTeam={{ id: "a", name: "Brasil" }}
        defaultHomeScore={0}
        defaultAwayScore={0}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.getByRole("radio", { name: "Uruguay" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Brasil" })).toBeInTheDocument();
  });

  it("shows a disabled placeholder hint instead of radios when a knockout slot is null", async () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={null}
        defaultHomeScore={1}
        defaultAwayScore={1}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(
      screen.getByText(/equipos.*definidos|definidos|placeholder|por definir/i),
    ).toBeInTheDocument();
  });

  it("submits a valid GROUP result with advancerTeamId null and numeric scores", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={2}
        defaultAwayScore={0}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0] as ResultInput;
    expect(arg).toEqual({
      matchId: "m1",
      homeScore: 2,
      awayScore: 0,
      advancerTeamId: null,
    });
    expect(typeof arg.homeScore).toBe("number");
    expect(typeof arg.awayScore).toBe("number");
  });

  it("submits a valid KNOCKOUT NON-DRAW with advancerTeamId null", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={2}
        defaultAwayScore={1}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(
      (onSubmit.mock.calls[0][0] as ResultInput).advancerTeamId,
    ).toBeNull();
  });

  it("submits a KNOCKOUT DRAW with the selected home team as advancer", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={1}
        defaultAwayScore={1}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Argentina" }));
    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((onSubmit.mock.calls[0][0] as ResultInput).advancerTeamId).toBe(
      homeTeam.id,
    );
  });

  it("surfaces a server business error via toast.error", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: false, reason: "advancer_required" });
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={1}
        defaultAwayScore={1}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Argentina" }));
    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
  });

  it("on success shows toast.success and calls onSuccess with recomputed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok(7));
    const onSuccess = vi.fn();
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={3}
        defaultAwayScore={0}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(7);
  });

  it("disables the submit button while onSubmit is pending", async () => {
    const user = userEvent.setup();
    let resolve!: (value: ConfirmActionResult) => void;
    const pending = new Promise<ConfirmActionResult>((r) => {
      resolve = r;
    });
    const onSubmit = vi.fn().mockReturnValue(pending);
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={1}
        defaultAwayScore={0}
        onSubmit={onSubmit}
      />,
    );

    const button = screen.getByRole("button", {
      name: /confirmar resultado/i,
    });
    await user.click(button);

    await waitFor(() => expect(button).toBeDisabled());

    resolve(ok());
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("resets advancer to null when leaving the draw state, then submits null", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={1}
        defaultAwayScore={1}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Argentina" }));

    // Break the draw: increment home from 1 to 2.
    await user.click(screen.getByRole("button", { name: /sumar a local/i }));

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(
      (onSubmit.mock.calls[0][0] as ResultInput).advancerTeamId,
    ).toBeNull();
  });

  it("initializes with provided default scores", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        defaultHomeScore={3}
        defaultAwayScore={1}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    // Steppers show their value as text
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  // Identity (PRO-28 fallback): with the panel now listing every match of the
  // day — not just finished/confirmed ones — each card MUST name the fixture
  // (header + per-stepper country labels), or identical cards are unusable.
  it("shows both team names so the fixture is identifiable", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    // Names appear in the header ("Argentina vs Francia") and as the stepper
    // labels, so each name is present at least once.
    expect(screen.getAllByText("Argentina").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Francia").length).toBeGreaterThan(0);
  });

  it("shows a 'Confirmado' badge when the status is confirmed", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        status="confirmed"
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.getByText(/confirmado/i)).toBeInTheDocument();
  });

  it("shows a 'Final sin confirmar' badge when the status is finished", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        status="finished"
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.getByText(/final sin confirmar/i)).toBeInTheDocument();
  });

  it("does not badge a still-scheduled match", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        status="scheduled"
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.queryByText(/confirmado|final sin confirmar/i)).toBeNull();
  });

  it("renders the AR-local kickoff in the header when given one", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        kickoffAt="2026-06-11T19:00:00Z"
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    // formatKickoffLong renders unpadded AR-local day/month ("11/6").
    expect(screen.getByText(/11\/6/)).toBeInTheDocument();
  });
});
