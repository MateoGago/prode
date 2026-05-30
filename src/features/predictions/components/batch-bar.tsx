"use client";

/**
 * BatchBar — the single save path for deferred-load predictions (Slice 4).
 *
 * Reads the dirty, non-locked batch from PredictionsProvider context and the
 * in-flight `pending` flag. Hidden when there is nothing to save. Pinned to the
 * bottom of the viewport as a SIBLING of the scroll content (constraint A): it
 * is `fixed`, never inside the scroll container, so it floats above the list
 * instead of anchoring to the bottom of the scrolled content.
 *
 * On mobile it is lifted by ~4rem so it clears the fixed AppTabBar (which is
 * also `fixed inset-x-0 bottom-0` at z-40); from `md` up that offset drops back
 * to `bottom-0` because the tab bar is `md:hidden`. It shares the tab bar's
 * z-40 on mobile so it is never painted underneath it.
 */

import { Button } from "@/shared/ui/button";

import { usePredictionsBoard } from "./predictions-provider";

export function BatchBar() {
  const { getBatch, saveBatch, pending, progress } = usePredictionsBoard();
  const count = getBatch().length;
  const { faltan } = progress;

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-40 border-t border-border bg-card/95 px-5 pt-4 pb-4 backdrop-blur md:bottom-0 md:z-30 md:pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          {faltan === 1
            ? "1 partido por predecir"
            : `${faltan} partidos por predecir`}
        </span>
        <Button
          type="button"
          variant="pop"
          disabled={pending}
          aria-busy={pending}
          onClick={() => {
            void saveBatch();
          }}
        >
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
