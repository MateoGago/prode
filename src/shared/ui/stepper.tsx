"use client";

import { AnimatePresence, motion } from "motion/react";

import { popSpring } from "@/shared/motion";
import { cn } from "@/shared/lib/utils";

export type StepperProps = {
  value: number;
  onValueChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "default";
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const stepButton =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-background text-foreground ring-1 ring-inset ring-border shadow-[0_3px_0_var(--border)] transition-[transform,box-shadow] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const sizeClass = {
  default: { btn: "size-[38px] text-xl", value: "min-w-12 text-[27px]" },
  sm: { btn: "size-8 text-lg", value: "min-w-9 text-[22px]" },
} as const;

export function Stepper({
  value,
  onValueChange,
  min = 0,
  max = 20,
  step = 1,
  disabled = false,
  label,
  size = "default",
}: StepperProps) {
  const s = sizeClass[size];

  const change = (next: number) => {
    if (disabled) return;
    const clamped = clamp(next, min, max);
    if (clamped !== value) onValueChange(clamped);
  };

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a stepper is a labelled group of two buttons; role="group" + aria-label is the correct ARIA — no native element fits without a legend.
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-3"
    >
      <motion.button
        type="button"
        aria-label={`Restar a ${label ?? "valor"}`}
        disabled={disabled || atMin}
        onClick={() => change(value - step)}
        whileTap={disabled || atMin ? undefined : { scale: 0.92 }}
        transition={popSpring}
        className={cn(stepButton, s.btn, "text-muted-foreground")}
      >
        −
      </motion.button>

      <div
        className={cn(
          "relative text-center font-mono font-bold tabular-nums leading-none",
          s.value,
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [1, 1.22, 1], opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={popSpring}
            className="inline-block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        aria-label={`Sumar a ${label ?? "valor"}`}
        disabled={disabled || atMax}
        onClick={() => change(value + step)}
        whileTap={disabled || atMax ? undefined : { scale: 0.92 }}
        transition={popSpring}
        className={cn(stepButton, s.btn, "text-primary")}
      >
        +
      </motion.button>
    </div>
  );
}
