import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchBreakdownList } from "@/features/leaderboard";
import { getMatchBreakdown } from "@/features/leaderboard";
import { createClient } from "@/shared/supabase/server";

export default async function UserBreakdownPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const supabase = await createClient();

  const [profileResult, items] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle(),
    getMatchBreakdown(userId),
  ]);

  if (!profileResult.data) {
    notFound();
  }

  const displayName = profileResult.data.display_name;

  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <Link
          href="/tabla"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          &larr; Volver a la tabla
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Desglose de {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Partidos confirmados y puntos obtenidos.
        </p>
      </div>

      <MatchBreakdownList
        items={items}
        emptyMessage="Este jugador todavía no tiene partidos confirmados."
      />
    </section>
  );
}
