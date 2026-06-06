import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The action is a "use server" module that hits the DB — mock its shape only.
const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));
vi.mock("@/features/auth/actions/update-display-name", () => ({
  updateDisplayName: mockUpdate,
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: mockToast }));

import { DisplayNameForm } from "@/features/auth/components/display-name-form";

describe("DisplayNameForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pre-fills the current name and keeps Guardar idle until edited", () => {
    render(<DisplayNameForm currentName="Santi" />);

    expect(screen.getByLabelText(/nombre visible/i)).toHaveValue("Santi");
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("submits the edited name and toasts success", async () => {
    mockUpdate.mockResolvedValue({
      status: "success",
      message: "Listo, actualizamos tu nombre.",
      displayName: "Nuevo Nombre",
    });
    render(<DisplayNameForm currentName="Santi" />);

    fireEvent.change(screen.getByLabelText(/nombre visible/i), {
      target: { value: "Nuevo Nombre" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({ displayName: "Nuevo Nombre" }),
    );
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
  });

  it("toasts the error message when the action fails", async () => {
    mockUpdate.mockResolvedValue({
      status: "error",
      message: "No pudimos guardar el nombre. Probá de nuevo.",
    });
    render(<DisplayNameForm currentName="Santi" />);

    fireEvent.change(screen.getByLabelText(/nombre visible/i), {
      target: { value: "Otro Nombre" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "No pudimos guardar el nombre. Probá de nuevo.",
      ),
    );
  });
});
