import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdvancerPicker } from "@/features/predictions/components/advancer-picker";
import type { Team } from "@/features/fixtures/entities/match";

const portugal: Team = {
  id: "pt",
  externalRef: "PT",
  name: "Portugal",
  groupLabel: null,
  flagUrl: null,
};
const uruguay: Team = {
  id: "uy",
  externalRef: "UY",
  name: "Uruguay",
  groupLabel: null,
  flagUrl: null,
};

describe("AdvancerPicker", () => {
  it("renders both competing teams as options", () => {
    render(
      <AdvancerPicker
        options={[portugal, uruguay]}
        selectedTeamId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /portugal/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /uruguay/i }),
    ).toBeInTheDocument();
  });

  it("marks the selected team as pressed", () => {
    render(
      <AdvancerPicker
        options={[portugal, uruguay]}
        selectedTeamId="uy"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /uruguay/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /portugal/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onSelect with the chosen team id", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AdvancerPicker
        options={[portugal, uruguay]}
        selectedTeamId={null}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: /portugal/i }));
    expect(onSelect).toHaveBeenCalledWith("pt");
  });

  it("does not fire when disabled", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <AdvancerPicker
        options={[portugal, uruguay]}
        selectedTeamId={null}
        disabled
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: /portugal/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
