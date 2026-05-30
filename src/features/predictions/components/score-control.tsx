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
  /**
   * Empty (sin-cargar) state: render a muted "–" placeholder instead of the
   * numeric value and force-disable the decrement button (REQ-02). The "+" tap
   * still activates the card by incrementing from the default 0.
   */
  empty?: boolean;
};

/**
 * Score input for a single team. D-3/D-5: a thin adapter over the shared
 * Cancha Pop <Stepper>. The public increment/decrement API is preserved so
 * MatchCard (which owns the score normalization) and tests don't change — we
 * just translate the Stepper's value-delta back into the direction callbacks.
 *
 * When `empty` is set the Stepper shows a "–" placeholder and its decrement is
 * disabled (can't go below "nothing"); the "+" tap fires onIncrement which the
 * card maps to {home:1,away:0} — REQ-02 activation.
 */
export function ScoreControl({
  value,
  disabled,
  onDecrement,
  onIncrement,
  teamName,
  empty = false,
}: ScoreControlProps) {
  return (
    <Stepper
      value={value}
      disabled={disabled}
      label={`Goles de ${teamName}`}
      placeholder={empty ? "–" : undefined}
      decrementDisabled={empty}
      onValueChange={(next) => {
        if (next > value) onIncrement();
        else if (next < value) onDecrement();
      }}
    />
  );
}
