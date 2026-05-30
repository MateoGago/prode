import type { Transition, Variants } from "motion/react";

/**
 * "Cancha Pop" motion vocabulary. Tiny, typed, tree-shakeable: just data —
 * no components, no providers — so any client component can spread these into
 * Motion props without dragging the whole library into the import graph.
 */

/** Overshooting ease for tactile "pop" on taps, badges, score reveals. */
export const bounceEase = [0.34, 1.56, 0.64, 1] as const;

/** Snappy spring for interactive elements (buttons, toggles, draggable bits). */
export const popSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 17,
};

/** Gentle timing for page/section reveals; pairs with the `rise` variant below. */
export const riseTransition: Transition = {
  duration: 0.4,
  ease: bounceEase,
};

/**
 * Single-element reveal: fade up from 14px. Use as `variants={rise}` with
 * `initial="hidden" animate="visible"`.
 */
export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: riseTransition },
};

/** Default gap between staggered children, in seconds. */
const STAGGER_STEP = 0.06;

/**
 * Parent variant that staggers `rise` children on load. Pair `staggerContainer`
 * on the list with `rise` on each item.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER_STEP, delayChildren: 0.04 },
  },
};
