/**
 * InviteCodeShare — invite-by-link affordance (link + copy + WhatsApp).
 *
 * Verifies:
 *  - renders the invite code as a secondary reference
 *  - copies the invite link to the clipboard + confirms with a toast
 *  - exposes a WhatsApp share link carrying the invite URL (which includes the code)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockToastSuccess } = vi.hoisted(() => ({ mockToastSuccess: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: vi.fn() },
}));

import { InviteCodeShare } from "@/features/groups/components/invite-code-share";

const CODE = "7Q9P2K4M";

describe("InviteCodeShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the invite code as a secondary reference", () => {
    render(<InviteCodeShare code={CODE} />);

    expect(screen.getByText(CODE)).toBeInTheDocument();
  });

  it("copies the invite link to the clipboard and shows a toast", async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub — override it AFTER so
    // the component writes to our spy.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<InviteCodeShare code={CODE} />);

    await user.click(screen.getByRole("button", { name: /copiar link/i }));

    // The copied value should contain the code (as part of the invite URL path).
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(CODE));
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("offers a WhatsApp share link carrying the invite URL with the code", () => {
    render(<InviteCodeShare code={CODE} />);

    const link = screen.getByRole("link", { name: /whatsapp/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("wa.me");
    // The decoded URL should contain the code (embedded in the /join/<code> path).
    expect(decodeURIComponent(href)).toContain(CODE);
  });
});
