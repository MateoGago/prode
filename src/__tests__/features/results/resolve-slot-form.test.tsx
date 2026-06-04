import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ResolveSlotForm,
  type ResolveSlotFormTeamOption,
} from "@/features/results/components/resolve-slot-form";
import type {
  ResolveSlotInput,
  ResolveSlotResult,
} from "@/features/results/entities/resolve-slot";

// ── Toast mocks ───────────────────────────────────────────────────────────────
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEAMS: ResolveSlotFormTeamOption[] = [
  { id: "team-arg", name: "Argentina" },
  { id: "team-bra", name: "Brasil" },
  { id: "team-chi", name: "Chile" },
];

function ok(): ResolveSlotResult {
  return { ok: true, matchId: "m1", slot: "home", teamId: "team-arg" };
}

beforeEach(() => {
  toastError.mockClear();
  toastSuccess.mockClear();
});

// ── T5.4 [RED] — spec scenarios ───────────────────────────────────────────────

describe("ResolveSlotForm — home slot", () => {
  it("renders a team selector with all team options", () => {
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        teams={TEAMS}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    // The select element should have an option per team
    for (const team of TEAMS) {
      expect(
        screen.getByRole("option", { name: team.name }),
      ).toBeInTheDocument();
    }
  });

  it("renders the slot hint so the admin knows which team belongs here", () => {
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        slotHint="1° Grupo A"
        teams={TEAMS}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(screen.getByText("1° Grupo A")).toBeInTheDocument();
  });

  it("disables the submit button until a team is selected", async () => {
    const user = userEvent.setup();
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        teams={TEAMS}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    const btn = screen.getByRole("button", { name: /asignar/i });
    expect(btn).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox"), "Argentina");
    expect(btn).not.toBeDisabled();
  });

  it("renders a submit button (always visible — gate is server-side)", () => {
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        teams={TEAMS}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    expect(
      screen.getByRole("button", { name: /asignar/i }),
    ).toBeInTheDocument();
  });

  it("calls onSubmit with matchId, slot=home, and selected teamId", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(ok());
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        teams={TEAMS}
        onSubmit={onSubmit}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "Brasil");
    await user.click(screen.getByRole("button", { name: /asignar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0] as ResolveSlotInput;
    expect(arg.matchId).toBe("m1");
    expect(arg.slot).toBe("home");
    expect(arg.teamId).toBe("team-bra");
  });

  it("shows a success toast on ok result", async () => {
    const user = userEvent.setup();
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        teams={TEAMS}
        onSubmit={vi.fn().mockResolvedValue(ok())}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "Argentina");
    await user.click(screen.getByRole("button", { name: /asignar/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
  });

  it("shows an error toast when server returns forbidden", async () => {
    const user = userEvent.setup();
    const forbidden: ResolveSlotResult = { ok: false, reason: "forbidden" };
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        teams={TEAMS}
        onSubmit={vi.fn().mockResolvedValue(forbidden)}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "Argentina");
    await user.click(screen.getByRole("button", { name: /asignar/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
  });

  it("shows an error toast when server returns team_not_found", async () => {
    const user = userEvent.setup();
    const err: ResolveSlotResult = { ok: false, reason: "team_not_found" };
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        teams={TEAMS}
        onSubmit={vi.fn().mockResolvedValue(err)}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "Argentina");
    await user.click(screen.getByRole("button", { name: /asignar/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
  });

  it("disables the button while pending", async () => {
    const user = userEvent.setup();
    let resolve!: (v: ResolveSlotResult) => void;
    const pending = new Promise<ResolveSlotResult>((r) => {
      resolve = r;
    });
    render(
      <ResolveSlotForm
        matchId="m1"
        slot="home"
        teams={TEAMS}
        onSubmit={vi.fn().mockReturnValue(pending)}
      />,
    );

    const btn = screen.getByRole("button", { name: /asignar/i });
    await user.selectOptions(screen.getByRole("combobox"), "Argentina");
    await user.click(btn);

    await waitFor(() => expect(btn).toBeDisabled());

    resolve(ok());
    await waitFor(() => expect(btn).not.toBeDisabled());
  });
});

describe("ResolveSlotForm — away slot", () => {
  it("calls onSubmit with slot=away", async () => {
    const user = userEvent.setup();
    const awayOk: ResolveSlotResult = {
      ok: true,
      matchId: "m2",
      slot: "away",
      teamId: "team-chi",
    };
    const onSubmit = vi.fn().mockResolvedValue(awayOk);
    render(
      <ResolveSlotForm
        matchId="m2"
        slot="away"
        teams={TEAMS}
        onSubmit={onSubmit}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "Chile");
    await user.click(screen.getByRole("button", { name: /asignar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0] as ResolveSlotInput;
    expect(arg.slot).toBe("away");
    expect(arg.teamId).toBe("team-chi");
  });
});
