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

  it("applies the default 30px size when no size prop is given", () => {
    render(<TeamFlag name="Brasil" flagUrl={null} />);
    const placeholder = document.querySelector("[aria-hidden='true']");
    expect(placeholder?.className).toContain("size-[30px]");
  });

  it("applies a custom numeric size as inline style on placeholder", () => {
    render(<TeamFlag name="Brasil" flagUrl={null} size={40} />);
    const placeholder = document.querySelector(
      "[aria-hidden='true']",
    ) as HTMLElement;
    expect(placeholder?.style.width).toBe("40px");
    expect(placeholder?.style.height).toBe("40px");
  });

  it("applies a custom size to the image as inline style", () => {
    render(
      <TeamFlag
        name="Brasil"
        flagUrl="https://flags.example.com/br.png"
        size={40}
      />,
    );
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.style.width).toBe("40px");
    expect(img.style.height).toBe("40px");
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
