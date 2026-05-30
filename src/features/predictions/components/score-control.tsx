"use client";

import { Stepper } from "@/shared/ui/stepper";

export type ScoreControlProps = {
  value: number;
  disabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  teamName: string;
  /** Kept for backwards-compat with callers/tests; the Stepper owns its own a11y. */
  scoreId?: string;
};

/**
 * Score input for a single team. D-3/D-5: a thin adapter over the shared
 * Cancha Pop <Stepper>. The public increment/decrement API is preserved so
 * MatchCard (which owns the score normalization) and tests don't change — we
 * just translate the Stepper's value-delta back into the direction callbacks.
 */
export function ScoreControl({
  value,
  disabled,
  onDecrement,
  onIncrement,
  teamName,
}: ScoreControlProps) {
  return (
    <Stepper
      value={value}
      disabled={disabled}
      label={`Goles de ${teamName}`}
      onValueChange={(next) => {
        if (next > value) onIncrement();
        else if (next < value) onDecrement();
      }}
    />
  );
}
