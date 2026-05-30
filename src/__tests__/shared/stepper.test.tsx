import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Stepper } from "@/shared/ui/stepper";

function setup(props: Partial<React.ComponentProps<typeof Stepper>> = {}) {
  const onValueChange = vi.fn();
  render(
    <Stepper
      value={props.value ?? 1}
      onValueChange={props.onValueChange ?? onValueChange}
      label="Goles de Argentina"
      {...props}
    />,
  );
  return { onValueChange: props.onValueChange ?? onValueChange };
}

describe("Stepper", () => {
  it("renders the current value", () => {
    setup({ value: 3 });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders accessible increment and decrement buttons", () => {
    setup();
    expect(screen.getByRole("button", { name: /sumar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restar/i })).toBeInTheDocument();
  });

  it("increments calling onValueChange with value + step", async () => {
    const user = userEvent.setup();
    const { onValueChange } = setup({ value: 2 });
    await user.click(screen.getByRole("button", { name: /sumar/i }));
    expect(onValueChange).toHaveBeenCalledWith(3);
  });

  it("decrements calling onValueChange with value - step", async () => {
    const user = userEvent.setup();
    const { onValueChange } = setup({ value: 2 });
    await user.click(screen.getByRole("button", { name: /restar/i }));
    expect(onValueChange).toHaveBeenCalledWith(1);
  });

  it("clamps at max and does not call onValueChange when already at max", async () => {
    const user = userEvent.setup();
    const { onValueChange } = setup({ value: 20, max: 20 });
    await user.click(screen.getByRole("button", { name: /sumar/i }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("clamps at min and does not call onValueChange when already at min", async () => {
    const user = userEvent.setup();
    const { onValueChange } = setup({ value: 0, min: 0 });
    await user.click(screen.getByRole("button", { name: /restar/i }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("disables the minus button at min and plus button at max", () => {
    const { rerender } = renderStepper({ value: 0, min: 0, max: 5 });
    expect(screen.getByRole("button", { name: /restar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /sumar/i })).not.toBeDisabled();

    rerender({ value: 5, min: 0, max: 5 });
    expect(screen.getByRole("button", { name: /sumar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /restar/i })).not.toBeDisabled();
  });

  it("respects a custom step", async () => {
    const user = userEvent.setup();
    const { onValueChange } = setup({ value: 4, step: 2 });
    await user.click(screen.getByRole("button", { name: /sumar/i }));
    expect(onValueChange).toHaveBeenCalledWith(6);
  });

  it("does not exceed max when stepping past it", async () => {
    const user = userEvent.setup();
    const { onValueChange } = setup({ value: 9, max: 10, step: 2 });
    await user.click(screen.getByRole("button", { name: /sumar/i }));
    // 9 + 2 = 11 -> clamped to 10
    expect(onValueChange).toHaveBeenCalledWith(10);
  });

  it("does not go below min when stepping past it", async () => {
    const user = userEvent.setup();
    const { onValueChange } = setup({ value: 1, min: 0, step: 2 });
    await user.click(screen.getByRole("button", { name: /restar/i }));
    expect(onValueChange).toHaveBeenCalledWith(0);
  });

  it("blocks both buttons when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper
        value={3}
        onValueChange={onValueChange}
        label="Goles"
        disabled
      />,
    );
    await user.click(screen.getByRole("button", { name: /sumar/i }));
    await user.click(screen.getByRole("button", { name: /restar/i }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /sumar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /restar/i })).toBeDisabled();
  });

  it("uses the label as an accessible group name", () => {
    setup({ label: "Goles de Francia" });
    expect(
      screen.getByRole("group", { name: "Goles de Francia" }),
    ).toBeInTheDocument();
  });
});

function renderStepper(props: Partial<React.ComponentProps<typeof Stepper>>) {
  const onValueChange = vi.fn();
  const ui = (p: Partial<React.ComponentProps<typeof Stepper>>) => (
    <Stepper
      value={p.value ?? 0}
      onValueChange={onValueChange}
      label="Goles"
      {...p}
    />
  );
  const { rerender: rerenderRtl } = render(ui(props));
  return {
    onValueChange,
    rerender: (p: Partial<React.ComponentProps<typeof Stepper>>) =>
      rerenderRtl(ui(p)),
  };
}
