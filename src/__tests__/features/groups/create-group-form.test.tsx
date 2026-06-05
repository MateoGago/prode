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

// Stub the share affordance — its own test covers copy/WhatsApp.
vi.mock("@/features/groups/components/invite-code-share", () => ({
  InviteCodeShare: ({ code }: { code: string }) => (
    <div data-testid="invite-code-share">{code}</div>
  ),
}));

import { CreateGroupForm } from "@/features/groups/components/create-group-form";

describe("CreateGroupForm", () => {
  it("renders the group name input and submit button", () => {
    render(<CreateGroupForm />);

    expect(screen.getByLabelText(/nombre del grupo/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /crear grupo/i }),
    ).toBeInTheDocument();
  });

  it("calls createGroup with the entered name on submit", async () => {
    mockCreateGroup.mockResolvedValue({ ok: true, code: "ABC12345" });
    const user = userEvent.setup();

    render(<CreateGroupForm />);

    await user.type(screen.getByLabelText(/nombre del grupo/i), "Los Cracks");
    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith("Los Cracks");
    });
  });

  it("shows the invite code on success instead of redirecting", async () => {
    mockCreateGroup.mockResolvedValue({ ok: true, code: "XYZ98765" });
    const user = userEvent.setup();

    render(<CreateGroupForm />);

    await user.type(screen.getByLabelText(/nombre del grupo/i), "Mi grupo");
    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    await waitFor(() => {
      expect(screen.getByTestId("invite-code-share")).toHaveTextContent(
        "XYZ98765",
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to the group when clicking 'Ir al grupo'", async () => {
    mockCreateGroup.mockResolvedValue({ ok: true, code: "XYZ98765" });
    const user = userEvent.setup();

    render(<CreateGroupForm />);

    await user.type(screen.getByLabelText(/nombre del grupo/i), "Mi grupo");
    await user.click(screen.getByRole("button", { name: /crear grupo/i }));

    const goButton = await screen.findByRole("button", {
      name: /ir al grupo/i,
    });
    await user.click(goButton);

    expect(mockPush).toHaveBeenCalledWith("/g/XYZ98765/leaderboard");
  });

  it("shows error toast when action returns ok: false", async () => {
    mockCreateGroup.mockResolvedValue({ ok: false, reason: "empty_name" });
    const user = userEvent.setup();

    render(<CreateGroupForm />);

    await user.type(screen.getByLabelText(/nombre del grupo/i), "x");
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
