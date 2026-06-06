"use client";

/**
 * Route-group error boundary for the whole (game) tree. Pairs with the per-route
 * loading.tsx files: a thrown render/data error degrades to this retry card
 * instead of a blank screen. It does NOT catch redirect()/notFound() — those
 * throw framework control-flow signals Next handles itself, not real errors.
 */

import { useEffect } from "react";

import { Button } from "@/shared/ui/button";

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[50dvh] place-items-center px-4">
      <div className="grid max-w-md gap-4 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Algo salió mal
        </h1>
        <p className="text-sm text-muted-foreground">
          No pudimos cargar esta sección. Probá de nuevo; si el problema
          continúa, recargá la página.
        </p>
        <div className="flex justify-center">
          <Button variant="pop" onClick={() => reset()}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
