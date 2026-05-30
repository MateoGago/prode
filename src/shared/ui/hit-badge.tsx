import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import type { HitType } from "@/features/predictions/entities/match-card-state";

const hitBadgeVariants = cva(
  "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide leading-none select-none",
  {
    variants: {
      hitType: {
        // Design-lab: .hit.exact{background:var(--primary); color:#fff}
        exact: "bg-exact text-primary-foreground",
        // Design-lab: .hit.win{background:var(--winner); color:oklch(0.28 0.06 80)}
        winner: "bg-winner text-[oklch(0.28_0.06_80)]",
        // Design-lab: .hit.miss{background:var(--miss)/20; color:var(--miss)}
        miss: "bg-miss/15 text-miss",
      },
    },
    defaultVariants: {
      hitType: "miss",
    },
  },
);

const LABELS: Record<HitType, string> = {
  exact: "Exacto",
  winner: "Ganador",
  miss: "Erró",
};

export type HitBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof hitBadgeVariants> & {
    hitType: HitType;
  };

export function HitBadge({ hitType, className, ...props }: HitBadgeProps) {
  return (
    <span
      data-hit={hitType}
      className={cn(hitBadgeVariants({ hitType }), className)}
      {...props}
    >
      {LABELS[hitType]}
    </span>
  );
}
