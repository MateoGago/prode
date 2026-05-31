/**
 * T-23 [TEST] — CreateGroupForm component
 *
 * Verifies:
 *  - renders the form with a group name input
 *  - calls createGroup action on submit
 *  - shows sonner error when action returns { ok: false }
 *  - redirects on success (router.push called with /g/{code}/leaderboard)
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { mockCreateGroup, mockPush, mockToastError } = vi.hoisted(() => ({
  mockCreateGroup: vi.fn(),
  mockPush: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/features/groups/actions/create-group", () => ({
  createGroup: mockCreateGroup,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({ toast: { error: mockToastError } }));

import { CreateGroupForm } from "@/features/groups/components/create-group-form";

describe("CreateGroupForm", () => {
  it("renders the group name input and submit button", () => {
    render(<CreateGroupForm />);

    expect(
      screen.getByPlaceholderText(/nombre del grupo/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /crear grupo/i }),
    ).toBeInTheDocument();
  });

  it("calls createGroup with the entered name on submit", async () => {
    mockCreateGroup.mockResolvedValue({ ok: true, code: "ABC12345" });
    const user = userEvent.setup();

    render(<CreateGroupForm />);

    await user.type(
      screen.getByPlaceholderText(/nombre del grupo/i),
      "Los Cracks",
    );
    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith("Los Cracks");
    });
  });

  it("redirects to /g/{code}/leaderboard on success", async () => {
    mockCreateGroup.mockResolvedValue({ ok: true, code: "XYZ98765" });
    const user = userEvent.setup();

    render(<CreateGroupForm />);

    await user.type(
      screen.getByPlaceholderText(/nombre del grupo/i),
      "Mi grupo",
    );
    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/g/XYZ98765/leaderboard");
    });
  });

  it("shows error toast when action returns ok: false", async () => {
    mockCreateGroup.mockResolvedValue({ ok: false, reason: "empty_name" });
    const user = userEvent.setup();

    render(<CreateGroupForm />);

    await user.type(screen.getByPlaceholderText(/nombre del grupo/i), "x");
    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it("shows inline validation error for empty name", async () => {
    const user = userEvent.setup();

    render(<CreateGroupForm />);

    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/el nombre no puede estar vacío/i),
      ).toBeInTheDocument();
    });
  });
});
