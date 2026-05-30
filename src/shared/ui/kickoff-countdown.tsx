"use client";

import { useEffect, useState } from "react";

import { formatCountdown } from "@/shared/datetime";

export interface KickoffCountdownProps {
  /** UTC kickoff/lock instant (Date or ISO string). */
  kickoffAt: Date | string;
  /** Prefix shown while the match is still open, e.g. "Cierra en". */
  prefix?: string;
  /** Shown once locked. Defaults to "Cerrado". */
  closedLabel?: string;
  className?: string;
}

function toMs(kickoffAt: Date | string): number {
  return typeof kickoffAt === "string"
    ? new Date(kickoffAt).getTime()
    : kickoffAt.getTime();
}

/**
 * Live-ticking countdown to a kickoff/lock deadline. Reusable across the
 * dashboard hero and (later) match cards.
 *
 * Formatting is delegated to the pure, unit-tested `formatCountdown`. The
 * component only owns the ticking clock and re-render cadence. It ticks once a
 * minute (the smallest unit we render), which is also gentle on battery and
 * reduced-motion friendly — there's no continuous animation here.
 */
export function KickoffCountdown({
  kickoffAt,
  prefix = "Cierra en",
  closedLabel = "Cerrado",
  className,
}: KickoffCountdownProps) {
  const target = toMs(kickoffAt);

  // Start from null so SSR and the first client paint agree (no hydration
  // mismatch); the real remaining time is computed in the effect, client-side.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(target - Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining === null) {
    // Pre-hydration: render the prefix only, no number to avoid a mismatch.
    return <span className={className}>{prefix}…</span>;
  }

  const label = formatCountdown(remaining);
  if (label === "Cerrado") {
    return <span className={className}>{closedLabel}</span>;
  }

  return (
    <span className={className}>
      {prefix} {label}
    </span>
  );
}
