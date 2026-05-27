import Link from "next/link";

import { Button } from "@/shared/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <section className="w-full max-w-sm text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          No pudimos ingresarte
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          El enlace de Google venció o ya se usó. Probá ingresar de nuevo.
        </p>
        <Button asChild className="mt-6 h-11 w-full">
          <Link href="/login">Volver al login</Link>
        </Button>
      </section>
    </main>
  );
}
