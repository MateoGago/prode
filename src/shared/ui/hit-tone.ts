import type { HitType } from "@/features/predictions/entities/match-card-state";

/**
 * Shared hit-outcome color language, used by every surface that shows a scored
 * prediction (the /predicciones confirmed card and the leaderboard breakdown).
 *
 * The point is honesty: a miss must NOT read as green. Each outcome gets a
 * distinct soft tint — exact=green, winner=amber, miss=neutral grey — so the
 * status color always matches the result instead of being uniformly positive.
 */
export const HIT_PANEL_CLASS: Record<HitType, string> = {
  exact: "bg-primary-soft",
  winner: "bg-winner/15",
  miss: "bg-card-muted",
};

/** Accent color for numbers/labels inside a HIT_PANEL_CLASS surface. */
export const HIT_TEXT_CLASS: Record<HitType, string> = {
  exact: "text-primary-deep",
  winner: "text-warn-deep",
  miss: "text-muted-foreground",
};

/** Solid badge style per outcome (the small "EXACTO / GANADOR / ERRÓ" chip). */
export const HIT_BADGE_CLASS: Record<HitType, string> = {
  exact: "bg-primary text-primary-foreground",
  winner: "bg-winner text-[oklch(0.28_0.06_80)]",
  miss: "bg-card-muted text-muted-foreground",
};
