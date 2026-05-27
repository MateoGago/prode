import { createClient } from "@/shared/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? "crack";

  return (
    <section className="grid gap-3">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
        ¡Hola, {displayName}! 👋
      </h1>
      <p className="max-w-prose text-muted-foreground">
        Ya estás dentro del prode del Mundial 2026. Muy pronto vas a poder
        cargar tus predicciones y seguir la tabla de posiciones.
      </p>
    </section>
  );
}
