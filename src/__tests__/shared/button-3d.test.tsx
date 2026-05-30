import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/shared/ui/button";

describe("Button 3D tactile variants", () => {
  it("renders the existing variants untouched", () => {
    render(<Button variant="default">Default</Button>);
    expect(screen.getByRole("button", { name: "Default" })).toHaveClass(
      "bg-primary",
    );
  });

  it("renders a pop variant with the 3d shadow + pill treatment", () => {
    render(<Button variant="pop">Jugar</Button>);
    const button = screen.getByRole("button", { name: "Jugar" });
    expect(button).toHaveClass("shadow-3d");
    expect(button).toHaveClass("rounded-pill");
    expect(button).toHaveClass("bg-primary");
  });

  it("renders a pop-gol celebration variant using the gol tokens", () => {
    render(<Button variant="pop-gol">Gol</Button>);
    const button = screen.getByRole("button", { name: "Gol" });
    expect(button).toHaveClass("bg-gol");
    expect(button).toHaveClass("shadow-3d");
    expect(button).toHaveClass("rounded-pill");
  });

  it("renders a pop-ghost variant with white bg and ink text", () => {
    render(<Button variant="pop-ghost">Ghost</Button>);
    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button).toHaveClass("bg-background");
    expect(button).toHaveClass("rounded-pill");
  });

  it("fires onClick when a pop button is pressed", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button variant="pop" onClick={onClick}>
        Press
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Press" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button variant="pop" disabled onClick={onClick}>
        Press
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Press" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Press" })).toBeDisabled();
  });

  it("keeps the active press translate on the pop variant", () => {
    render(<Button variant="pop">Press</Button>);
    expect(screen.getByRole("button", { name: "Press" })).toHaveClass(
      "active:not-aria-[haspopup]:translate-y-[5px]",
    );
  });
});
