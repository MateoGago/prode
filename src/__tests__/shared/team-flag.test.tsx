import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeamFlag } from "@/shared/ui/team-flag";

describe("TeamFlag", () => {
  it("renders an image when flagUrl is provided", () => {
    render(
      <TeamFlag name="Argentina" flagUrl="https://flags.example.com/ar.png" />,
    );
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "Bandera de Argentina");
    expect(img).toHaveAttribute("src", expect.stringContaining("ar.png"));
  });

  it("renders a placeholder div (aria-hidden) when flagUrl is null", () => {
    render(<TeamFlag name="Equipo TBD" flagUrl={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    const placeholder = document.querySelector("[aria-hidden='true']");
    expect(placeholder).toBeInTheDocument();
  });

  it("applies the default 30px height with a 4:3 width as inline style", () => {
    render(<TeamFlag name="Brasil" flagUrl={null} />);
    const placeholder = document.querySelector(
      "[aria-hidden='true']",
    ) as HTMLElement;
    // height = 30, width = round(30 * 4 / 3) = 40
    expect(placeholder?.style.height).toBe("30px");
    expect(placeholder?.style.width).toBe("40px");
  });

  it("renders the image as a 4:3 rectangle with subtly rounded corners", () => {
    render(
      <TeamFlag name="Argentina" flagUrl="https://flags.example.com/ar.png" />,
    );
    const img = screen.getByRole("img") as HTMLImageElement;
    // Explicit inline width/height so Tailwind preflight `img { height: auto }`
    // cannot squash the flag. Rectangular (not a circle).
    expect(img.style.height).toBe("30px");
    expect(img.style.width).toBe("40px");
    expect(img.className).toContain("object-cover");
    expect(img.className).toContain("rounded-[3px]");
    expect(img.className).not.toContain("rounded-full");
  });

  it("derives a 4:3 width from a custom size on the placeholder", () => {
    render(<TeamFlag name="Brasil" flagUrl={null} size={45} />);
    const placeholder = document.querySelector(
      "[aria-hidden='true']",
    ) as HTMLElement;
    // height = 45, width = round(45 * 4 / 3) = 60
    expect(placeholder?.style.height).toBe("45px");
    expect(placeholder?.style.width).toBe("60px");
  });

  it("derives a 4:3 width from a custom size on the image", () => {
    render(
      <TeamFlag
        name="Brasil"
        flagUrl="https://flags.example.com/br.png"
        size={45}
      />,
    );
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.style.height).toBe("45px");
    expect(img.style.width).toBe("60px");
  });

  it("accepts imageClassName and placeholderClassName overrides", () => {
    const { rerender } = render(
      <TeamFlag
        name="Custom"
        flagUrl="https://flags.example.com/xx.png"
        size={40}
        imageClassName="custom-img-class"
      />,
    );
    expect(screen.getByRole("img")).toHaveClass("custom-img-class");

    rerender(
      <TeamFlag
        name="Custom"
        flagUrl={null}
        size={40}
        placeholderClassName="custom-placeholder-class"
      />,
    );
    const placeholder = document.querySelector("[aria-hidden='true']");
    expect(placeholder).toHaveClass("custom-placeholder-class");
  });
});
