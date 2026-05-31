/**
 * InviteCodeShare — reusable invite affordance (code + copy + WhatsApp).
 *
 * Verifies:
 *  - renders the invite code
 *  - copies the code to the clipboard + confirms with a toast
 *  - exposes a WhatsApp share link carrying the code
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockToastSuccess } = vi.hoisted(() => ({ mockToastSuccess: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mockToastSuccess } }));

import { InviteCodeShare } from "@/features/groups/components/invite-code-share";

const CODE = "7Q9P2K4M";

describe("InviteCodeShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the invite code", () => {
    render(<InviteCodeShare code={CODE} />);

    expect(screen.getByText(CODE)).toBeInTheDocument();
  });

  it("copies the code to the clipboard and confirms", async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub — override it AFTER so
    // the component writes to our spy.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<InviteCodeShare code={CODE} />);

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    expect(writeText).toHaveBeenCalledWith(CODE);
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("offers a WhatsApp share link carrying the code", () => {
    render(<InviteCodeShare code={CODE} />);

    const link = screen.getByRole("link", { name: /whatsapp/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("wa.me");
    expect(decodeURIComponent(href)).toContain(CODE);
  });
});
