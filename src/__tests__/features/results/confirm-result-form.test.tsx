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
  it("renders the home and away score number inputs with their labels", () => {
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.getByLabelText(/local/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/visitante/i)).toBeInTheDocument();
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

  it("rejects a negative score and does not call onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "-1");
    await user.type(screen.getByLabelText(/visitante/i), "0");
    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    expect(
      await screen.findByText("El marcador no puede ser negativo"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a non-integer score and does not call onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "1.5");
    await user.type(screen.getByLabelText(/visitante/i), "0");
    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    expect(
      await screen.findByText("El marcador debe ser un número entero"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an empty score and does not call onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={onSubmit}
      />,
    );

    // Leave both blank, submit. Both fields legitimately surface the message.
    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    expect(
      (await screen.findAllByText("Ingresá un número")).length,
    ).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hides the advancer selector for a group round even on a draw", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmResultForm
        matchId="m1"
        round="group"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "1");
    await user.type(screen.getByLabelText(/visitante/i), "1");

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("hides the advancer selector for a knockout non-draw", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "2");
    await user.type(screen.getByLabelText(/visitante/i), "1");

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("shows the advancer selector for a knockout draw with both team names", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "1");
    await user.type(screen.getByLabelText(/visitante/i), "1");

    const group = await screen.findByRole("radiogroup");
    expect(group).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Argentina" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Francia" })).toBeInTheDocument();
  });

  it("labels advancer radios with the real team names", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmResultForm
        matchId="m1"
        round="final"
        homeTeam={{ id: "h", name: "Uruguay" }}
        awayTeam={{ id: "a", name: "Brasil" }}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "0");
    await user.type(screen.getByLabelText(/visitante/i), "0");

    expect(
      await screen.findByRole("radio", { name: "Uruguay" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Brasil" })).toBeInTheDocument();
  });

  it("shows a disabled placeholder hint instead of radios when a knockout slot is null", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmResultForm
        matchId="m1"
        round="sf"
        homeTeam={homeTeam}
        awayTeam={null}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "1");
    await user.type(screen.getByLabelText(/visitante/i), "1");

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(
      await screen.findByText(
        /equipos.*definidos|definidos|placeholder|por definir/i,
      ),
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
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "2");
    await user.type(screen.getByLabelText(/visitante/i), "0");
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
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "2");
    await user.type(screen.getByLabelText(/visitante/i), "1");
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
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "1");
    await user.type(screen.getByLabelText(/visitante/i), "1");

    await user.click(await screen.findByRole("radio", { name: "Argentina" }));
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
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "1");
    await user.type(screen.getByLabelText(/visitante/i), "1");
    await user.click(await screen.findByRole("radio", { name: "Argentina" }));
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
        onSubmit={onSubmit}
        onSuccess={onSuccess}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "3");
    await user.type(screen.getByLabelText(/visitante/i), "0");
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
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/local/i), "1");
    await user.type(screen.getByLabelText(/visitante/i), "0");
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
        onSubmit={onSubmit}
      />,
    );

    const home = screen.getByLabelText(/local/i);
    const away = screen.getByLabelText(/visitante/i);

    await user.type(home, "1");
    await user.type(away, "1");
    await user.click(await screen.findByRole("radio", { name: "Argentina" }));

    // Move away from the draw: 1 -> 2 home.
    await user.clear(home);
    await user.type(home, "2");

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /confirmar resultado/i }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(
      (onSubmit.mock.calls[0][0] as ResultInput).advancerTeamId,
    ).toBeNull();
  });
});
