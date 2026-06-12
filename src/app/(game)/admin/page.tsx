import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/actions/get-current-user";
import { confirmResultAction } from "@/features/results/actions/confirm-result-action";
import { ConfirmResultForm } from "@/features/results/components/confirm-result-form";
import { selectCorrectableMatches } from "@/features/results/actions/select-correctable-matches";
import { selectUnresolvedKnockoutSlots } from "@/features/results/actions/select-unresolved-slots";
import { resolveSlotAction } from "@/features/results/actions/resolve-slot-action";
import { ResolveSlotForm } from "@/features/results/components/resolve-slot-form";
import type { ResolveSlotFormTeamOption } from "@/features/results/components/resolve-slot-form";
import { createClient } from "@/shared/supabase/server";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatKickoffLong } from "@/shared/datetime";
import { formatPlaceholder } from "@/features/tournament/entities/bracket";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  // Validate the group filter against the schema's A–L range (teams.group_label
  // CHECK) — an out-of-range value just falls back to the "today" view.
  const { grupo } = await searchParams;
  const requestedGroup = grupo?.toUpperCase();
  const activeGroup =
    requestedGroup && /^[A-L]$/.test(requestedGroup)
      ? requestedGroup
      : undefined;

  // Fetch all data in parallel — independent queries.
  const [matches, unresolvedSlots, teamsData] = await Promise.all([
    selectCorrectableMatches({ group: activeGroup }),
    selectUnresolvedKnockoutSlots(),
    supabase
      .from("teams")
      .select("id, name, group_label")
      .order("name", { ascending: true }),
  ]);

  const allTeams: ResolveSlotFormTeamOption[] = (teamsData.data ?? []).map(
    (t) => ({ id: t.id, name: t.name }),
  );

  // Group chips are derived from the data, never hardcoded: only groups that
  // actually have teams loaded show up.
  const groups = Array.from(
    new Set(
      (teamsData.data ?? [])
        .map((t) => t.group_label)
        .filter((g): g is string => g !== null),
    ),
  ).sort();

  return (
    <section className="grid gap-6">
      <header className="grid gap-1.5">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Administración
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Panel de resultados
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {activeGroup
            ? `Grupo ${activeGroup}: todos los partidos de la fase de grupos. `
            : "Partidos de hoy. "}
          Cargá o corregí el resultado final a mano —al confirmar se recalculan
          los puntos de todas las predicciones de ese partido— sin depender de
          la sincronización automática.
        </p>
      </header>

      {/* ── Filtros: Hoy + un chip por grupo ────────────────────────────── */}
      <nav
        aria-label="Filtrar partidos"
        className="flex flex-wrap items-center gap-1.5"
      >
        <Link href="/admin" className={chipClass(!activeGroup)}>
          Hoy
        </Link>
        {groups.map((group) => (
          <Link
            key={group}
            href={`/admin?grupo=${group}`}
            className={chipClass(activeGroup === group)}
          >
            Grupo {group}
          </Link>
        ))}
      </nav>

      {matches.length === 0 ? (
        <EmptyState
          title={
            activeGroup
              ? `Grupo ${activeGroup} sin partidos.`
              : "No hay partidos hoy."
          }
          description={
            activeGroup
              ? "Todavía no hay partidos cargados para este grupo."
              : "Cuando haya partidos programados para el día de hoy, vas a poder cargar su resultado acá."
          }
        />
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <ConfirmResultForm
              key={match.matchId}
              matchId={match.matchId}
              round={match.round}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              defaultHomeScore={match.homeScore ?? undefined}
              defaultAwayScore={match.awayScore ?? undefined}
              kickoffAt={match.kickoffAt}
              status={match.status}
              onSubmit={confirmResultAction}
            />
          ))}
        </div>
      )}

      {/* ── Bracket slot assignment ─────────────────────────────────────── */}
      {unresolvedSlots.length > 0 ? (
        <div className="grid gap-4">
          <header className="grid gap-1.5">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Llave
            </p>
            <h2 className="font-heading text-xl font-bold tracking-tight">
              Casilleros sin equipo
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Asigná el equipo que ocupa cada casillero vacío en la fase
              eliminatoria.
            </p>
          </header>

          <div className="grid gap-3">
            {unresolvedSlots.map((slot) => (
              <div
                key={`${slot.matchId}-slots`}
                className="grid gap-2 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {slot.round.toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatKickoffLong(slot.kickoffAt)}
                  </p>
                </div>

                {slot.homeTeamId === null ? (
                  <ResolveSlotForm
                    matchId={slot.matchId}
                    slot="home"
                    slotHint={formatPlaceholder(slot.homePlaceholder ?? "")}
                    teams={allTeams}
                    onSubmit={resolveSlotAction}
                  />
                ) : (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Local:</span>{" "}
                    <span className="font-medium">{slot.homeTeamName}</span>
                  </p>
                )}

                {slot.awayTeamId === null ? (
                  <ResolveSlotForm
                    matchId={slot.matchId}
                    slot="away"
                    slotHint={formatPlaceholder(slot.awayPlaceholder ?? "")}
                    teams={allTeams}
                    onSubmit={resolveSlotAction}
                  />
                ) : (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Visitante:</span>{" "}
                    <span className="font-medium">{slot.awayTeamName}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Pill style for a filter chip — highlighted when it's the active view. */
function chipClass(active: boolean): string {
  const base =
    "rounded-full border px-3 py-1 text-sm font-medium transition-colors";
  return active
    ? `${base} border-primary bg-primary-soft text-foreground`
    : `${base} border-border bg-card text-muted-foreground hover:bg-card-muted`;
}
