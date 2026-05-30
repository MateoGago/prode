import Link from "next/link";

import { Button } from "@/shared/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <section className="w-full max-w-sm animate-[rise_0.55s_var(--ease-bounce)_forwards]">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none tracking-tight">
            PRODE
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Mundial 2026
          </p>

          <div className="mt-6 rounded-xl border border-border bg-card-muted p-4">
            <p className="text-sm font-semibold text-foreground">
              No pudimos ingresarte
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              El enlace de Google venció o ya se usó. Probá ingresar de nuevo.
            </p>
          </div>

          <Button asChild variant="pop-ghost" className="mt-6 h-11 w-full">
            <Link href="/login">Volver al login</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
