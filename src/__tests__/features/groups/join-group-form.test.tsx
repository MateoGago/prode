/**
 * T-24 [TEST] — JoinGroupForm component
 *
 * Verifies:
 *  - renders the invite code input and submit button
 *  - calls joinGroup action on submit
 *  - shows sonner error when action returns { ok: false, reason: 'invalid_code' }
 *  - redirects on success (router.push called with /g/{code}/leaderboard)
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { mockJoinGroup, mockPush, mockToastError } = vi.hoisted(() => ({
  mockJoinGroup: vi.fn(),
  mockPush: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/features/groups/actions/join-group", () => ({
  joinGroup: mockJoinGroup,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({ toast: { error: mockToastError } }));

import { JoinGroupForm } from "@/features/groups/components/join-group-form";

describe("JoinGroupForm", () => {
  it("renders the invite code input and submit button", () => {
    render(<JoinGroupForm />);

    expect(
      screen.getByPlaceholderText(/código de invitación/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unirme/i })).toBeInTheDocument();
  });

  it("calls joinGroup with the entered code on submit", async () => {
    mockJoinGroup.mockResolvedValue({ ok: true, code: "ABC12345" });
    const user = userEvent.setup();

    render(<JoinGroupForm />);

    await user.type(
      screen.getByPlaceholderText(/código de invitación/i),
      "ABC12345",
    );
    await user.click(screen.getByRole("button", { name: /unirme/i }));

    await waitFor(() => {
      expect(mockJoinGroup).toHaveBeenCalledWith("ABC12345");
    });
  });

  it("redirects to /g/{code}/leaderboard on success", async () => {
    mockJoinGroup.mockResolvedValue({ ok: true, code: "XYZ98765" });
    const user = userEvent.setup();

    render(<JoinGroupForm />);

    await user.type(
      screen.getByPlaceholderText(/código de invitación/i),
      "XYZ98765",
    );
    await user.click(screen.getByRole("button", { name: /unirme/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/g/XYZ98765/leaderboard");
    });
  });

  it("shows error toast for invalid code", async () => {
    mockJoinGroup.mockResolvedValue({ ok: false, reason: "invalid_code" });
    const user = userEvent.setup();

    render(<JoinGroupForm />);

    await user.type(
      screen.getByPlaceholderText(/código de invitación/i),
      "BADCODE1",
    );
    await user.click(screen.getByRole("button", { name: /unirme/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("inválido"),
      );
    });
  });

  it("shows inline error message under the input for invalid code", async () => {
    mockJoinGroup.mockResolvedValue({ ok: false, reason: "invalid_code" });
    const user = userEvent.setup();

    render(<JoinGroupForm />);

    await user.type(
      screen.getByPlaceholderText(/código de invitación/i),
      "BADCODE1",
    );
    await user.click(screen.getByRole("button", { name: /unirme/i }));

    await waitFor(() => {
      expect(screen.getByText(/código inválido/i)).toBeInTheDocument();
    });
  });

  it("shows inline validation error for empty code", async () => {
    const user = userEvent.setup();

    render(<JoinGroupForm />);

    await user.click(screen.getByRole("button", { name: /unirme/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/el código no puede estar vacío/i),
      ).toBeInTheDocument();
    });
  });
});
