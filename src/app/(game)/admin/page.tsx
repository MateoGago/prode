import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/actions/get-current-user";
import { confirmResultAction } from "@/features/results/actions/confirm-result-action";
import { ConfirmResultForm } from "@/features/results/components/confirm-result-form";
import { selectCorrectableMatches } from "@/features/results/actions/select-correctable-matches";
import { selectKnockoutSlots } from "@/features/results/actions/select-knockout-slots";
import { resolveSlotAction } from "@/features/results/actions/resolve-slot-action";
import { ResolveSlotForm } from "@/features/results/components/resolve-slot-form";
import type { ResolveSlotFormTeamOption } from "@/features/results/components/resolve-slot-form";
import { createClient } from "@/shared/supabase/server";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatKickoffLong } from "@/shared/datetime";
import {
  formatPlaceholder,
  groupsForPlaceholder,
} from "@/features/tournament/entities/bracket";
import type { Round } from "@/features/fixtures/entities/match";

/**
 * Knockout-phase filters for the admin panel. The group stage is over, so the
 * panel filters by elimination round instead — each chip loads ALL matches of
 * that phase across the tournament (see selectCorrectableMatches `round`).
 */
const KNOCKOUT_FILTERS: { round: Round; label: string }[] = [
  { round: "r32", label: "16avos" },
  { round: "r16", label: "Octavos" },
  { round: "qf", label: "Cuartos" },
  { round: "sf", label: "Semis" },
  { round: "third_place", label: "3er puesto" },
  { round: "final", label: "Final" },
];

const KNOCKOUT_ROUNDS = new Set<Round>(
  KNOCKOUT_FILTERS.map((filter) => filter.round),
);

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string }>;
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

  // Validate the phase filter against the known knockout rounds — an unknown
  // value just falls back to the "today" view.
  const { fase } = await searchParams;
  const activeRound: Round | undefined = KNOCKOUT_ROUNDS.has(fase as Round)
    ? (fase as Round)
    : undefined;
  const activeLabel = KNOCKOUT_FILTERS.find(
    (filter) => filter.round === activeRound,
  )?.label;

  // Fetch all data in parallel — independent queries.
  const [matches, knockoutSlots, teamsData] = await Promise.all([
    selectCorrectableMatches({ round: activeRound }),
    selectKnockoutSlots(),
    supabase
      .from("teams")
      .select("id, name, group_label")
      .order("name", { ascending: true }),
  ]);

  const allTeams = (teamsData.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    groupLabel: t.group_label,
  }));

  // A slot can only be filled by teams from the group(s) its placeholder names
  // (e.g. "1J" → group J, "3A/B/C/D/F" → those five groups). Winner/loser slots
  // ("W74") have no group → null → every team stays selectable.
  const teamsForPlaceholder = (
    placeholder: string | null,
  ): ResolveSlotFormTeamOption[] => {
    const groups = groupsForPlaceholder(placeholder ?? "");
    const eligible =
      groups === null
        ? allTeams
        : allTeams.filter(
            (t) => t.groupLabel !== null && groups.includes(t.groupLabel),
          );
    return eligible.map((t) => ({ id: t.id, name: t.name }));
  };

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
          {activeLabel
            ? `${activeLabel}: todos los partidos de esta instancia. `
            : "Partidos de hoy. "}
          Cargá o corregí el resultado final a mano —al confirmar se recalculan
          los puntos de todas las predicciones de ese partido— sin depender de
          la sincronización automática.
        </p>
      </header>

      {/* ── Filtros: Hoy + un chip por instancia eliminatoria ───────────── */}
      <nav
        aria-label="Filtrar partidos"
        className="flex flex-wrap items-center gap-1.5"
      >
        <Link href="/admin" className={chipClass(!activeRound)}>
          Hoy
        </Link>
        {KNOCKOUT_FILTERS.map((filter) => (
          <Link
            key={filter.round}
            href={`/admin?fase=${filter.round}`}
            className={chipClass(activeRound === filter.round)}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {matches.length === 0 ? (
        <EmptyState
          title={
            activeLabel
              ? `${activeLabel} sin partidos.`
              : "No hay partidos hoy."
          }
          description={
            activeLabel
              ? "Todavía no hay partidos con ambos equipos definidos en esta instancia. Asigná los equipos de la llave abajo."
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
      {knockoutSlots.length > 0 ? (
        <div className="grid gap-4">
          <header className="grid gap-1.5">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Llave
            </p>
            <h2 className="font-heading text-xl font-bold tracking-tight">
              Equipos de la fase eliminatoria
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Asigná el equipo de cada casillero vacío, o corregí uno ya cargado
              si quedó mal —elegí el equipo y tocá Reasignar.
            </p>
          </header>

          <div className="grid gap-3">
            {knockoutSlots.map((slot) => (
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

                <ResolveSlotForm
                  matchId={slot.matchId}
                  slot="home"
                  slotHint={formatPlaceholder(slot.homePlaceholder ?? "")}
                  currentTeamId={slot.homeTeamId ?? undefined}
                  currentTeamName={slot.homeTeamName ?? undefined}
                  currentTeamFlagUrl={slot.homeTeamFlagUrl}
                  teams={teamsForPlaceholder(slot.homePlaceholder)}
                  onSubmit={resolveSlotAction}
                />

                <ResolveSlotForm
                  matchId={slot.matchId}
                  slot="away"
                  slotHint={formatPlaceholder(slot.awayPlaceholder ?? "")}
                  currentTeamId={slot.awayTeamId ?? undefined}
                  currentTeamName={slot.awayTeamName ?? undefined}
                  currentTeamFlagUrl={slot.awayTeamFlagUrl}
                  teams={teamsForPlaceholder(slot.awayPlaceholder)}
                  onSubmit={resolveSlotAction}
                />
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
