import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HitBadge } from "@/shared/ui/hit-badge";

describe("HitBadge", () => {
  it("renders 'Exacto' label for exact hit", () => {
    render(<HitBadge hitType="exact" />);
    expect(screen.getByText("Exacto")).toBeInTheDocument();
  });

  it("renders 'Ganador' label for winner hit", () => {
    render(<HitBadge hitType="winner" />);
    expect(screen.getByText("Ganador")).toBeInTheDocument();
  });

  it("renders 'Erró' label for miss", () => {
    render(<HitBadge hitType="miss" />);
    expect(screen.getByText("Erró")).toBeInTheDocument();
  });

  it("exposes data-hit attribute for each type", () => {
    const { rerender, container } = render(<HitBadge hitType="exact" />);
    expect(container.querySelector("[data-hit='exact']")).toBeInTheDocument();

    rerender(<HitBadge hitType="winner" />);
    expect(container.querySelector("[data-hit='winner']")).toBeInTheDocument();

    rerender(<HitBadge hitType="miss" />);
    expect(container.querySelector("[data-hit='miss']")).toBeInTheDocument();
  });
});
