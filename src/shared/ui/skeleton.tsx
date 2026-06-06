import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Skeleton — a single shimmering placeholder block.
 *
 * Build loading states by composing these at the REAL element's dimensions so
 * the fallback reserves the same space and the swap to real content causes no
 * layout shift (CLS). `animate-pulse` is a Tailwind default utility; it is
 * neutralised automatically under `prefers-reduced-motion` (globals.css).
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
