import { redirect } from "next/navigation";

import { createClient } from "@/shared/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  return (
    <section className="grid gap-3">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
        Panel de administración
      </h1>
      <p className="max-w-prose text-muted-foreground">
        Cargá o corregí el resultado final de un partido. Al confirmar se
        recalculan los puntos de todas las predicciones de ese partido.
      </p>
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        El formulario de override (PRO-42) se monta acá y envía a través de la
        Server Action <code>confirmResultAction</code>.
      </div>
    </section>
  );
}
