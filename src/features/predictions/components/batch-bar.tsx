"use client";

/**
 * BatchBar — the single save path for deferred-load predictions, presented as a
 * floating bottom-sheet drawer (Cancha Pop). Hidden when there is nothing to
 * save.
 *
 * Content mirrors the running tally:
 *   - "{cargados} / {total} pronosticados" — saved cardinality (no optimistic
 *     flip; design §2), with a progress strip across the sheet's top edge.
 *   - "+{N} cambios sin guardar" — the dirty, non-locked batch about to be sent.
 *   - Cancelar (discard working edits) + Guardar (persist the batch).
 *
 * While the drawer is mounted it replaces the mobile tab bar: it carries a
 * `data-save-drawer` marker that globals.css keys off
 * (`body:has([data-save-drawer]) [data-app-tab-bar] { display:none }`), so the
 * two never stack. The drawer is a `fixed` sibling of the scroll content
 * (constraint A) at the very bottom; on md the tab bar is already `md:hidden`,
 * so the marker is a no-op there.
 */

import { Button } from "@/shared/ui/button";

import { usePredictionsBoard } from "./predictions-provider";

export function BatchBar() {
  const { getBatch, saveBatch, discardEdits, pending, progress } =
    usePredictionsBoard();
  const count = getBatch().length;
  const { cargados, total } = progress;

  if (count === 0) return null;

  const pct = total > 0 ? Math.round((cargados / total) * 100) : 0;

  return (
    <div
      data-save-drawer
      className="fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-[0_-12px_40px_-12px_oklch(0.24_0.03_165/0.35)] backdrop-blur md:z-40"
    >
      {/* Progress strip hugging the sheet's top edge. */}
      <div
        className="h-1.5 w-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso: ${pct}% pronosticado`}
      >
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-primary to-[oklch(0.70_0.17_156)] transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mx-auto flex max-w-2xl items-end justify-between gap-4 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        {/* Tally */}
        <div className="min-w-0">
          <p className="font-display text-[19px] font-[750] leading-tight">
            <em className="not-italic text-primary-deep">{cargados}</em>
            <span className="text-muted-foreground"> / {total} </span>
            <span className="text-[15px] font-bold text-muted-foreground">
              pronosticados
            </span>
          </p>
          <p className="mt-[3px] text-[13px] font-semibold text-warn-deep">
            {`+${count} ${count === 1 ? "cambio" : "cambios"} sin guardar`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-none items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={discardEdits}
          >
            Cancelar
          </Button>
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
    </div>
  );
}
