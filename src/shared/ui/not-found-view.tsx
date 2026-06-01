import Link from "next/link";

import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * Branded "not found" view — chrome-less, full-screen, on the brand's ambient
 * gradient. Shared by the root not-found boundary (unmatched URLs) and the
 * standalone /grupo-no-encontrado route (invalid/deleted group codes, which
 * redirect here so the (game) sidebar never wraps the 404).
 */
export function NotFoundView() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 px-6 text-center">
      <div className="grid gap-3">
        <span
          aria-hidden="true"
          className="font-[family-name:var(--font-display)] text-7xl font-bold leading-none tracking-tight text-primary"
        >
          404
        </span>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-balance">
          No encontramos esto
        </h1>
        <p className="mx-auto max-w-sm text-pretty text-sm text-muted-foreground">
          La página o el grupo que buscás no existe. Puede que el código esté
          mal escrito o que el grupo ya no esté disponible.
        </p>
      </div>

      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "pop" }),
          "h-11 px-6 text-sm font-semibold",
        )}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
