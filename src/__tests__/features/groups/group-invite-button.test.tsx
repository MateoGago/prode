/**
 * GroupInviteButton — persistent "Invitar" disclosure on the group page.
 *
 * Verifies the share panel stays hidden until the button is clicked.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/groups/components/invite-code-share", () => ({
  InviteCodeShare: ({ code }: { code: string }) => (
    <div data-testid="invite-code-share">{code}</div>
  ),
}));

import { GroupInviteButton } from "@/features/groups/components/group-invite-button";

describe("GroupInviteButton", () => {
  it("reveals the share panel only after clicking Invitar", async () => {
    const user = userEvent.setup();
    render(<GroupInviteButton code="7Q9P2K4M" />);

    expect(screen.queryByTestId("invite-code-share")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /invitar/i }));

    expect(screen.getByTestId("invite-code-share")).toHaveTextContent(
      "7Q9P2K4M",
    );
  });
});
