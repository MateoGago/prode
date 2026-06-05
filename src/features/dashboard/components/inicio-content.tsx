"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import type { LastResultRow } from "@/features/dashboard";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { KickoffCountdown } from "@/shared/ui/kickoff-countdown";
import { TeamFlag } from "@/shared/ui/team-flag";
import { useReveal } from "@/shared/motion";

/** Plain, RSC-serializable shape for the próximo-partido hero. */
export interface NextMatchView {
  groupLabel: string | null;
  /** ISO UTC kickoff — the client countdown owns the live ticking. */
  kickoffAtISO: string;
  /** "Cierra Sáb 13/6 · 16:00" AR-formatted lock line. */
  closesAtLabel: string;
  home: TeamView;
  away: TeamView;
}

export interface TeamView {
  name: string;
  flagUrl: string | null;
}

export interface InicioContentProps {
  displayName: string;
  subline: string;
  /** Group standings section, rendered right under the greeting. */
  groupsSlot?: ReactNode;
  /**
   * When null, the Posición and Puntos StatCards are NOT rendered.
   * The home hub omits them because position is group-scoped (shown in
   * GroupCards above); passing null avoids permanently misleading "—"/0 values.
   */
  position: number | null;
  /** Only meaningful when position is non-null. */
  points?: number;
  played: number;
  totalMatches: number;
  /** Group-stage load progress ("X/72 cargadas") — shared with the nav badge. */
  predictionsLoaded: number;
  predictionsTotal: number;
  nextMatch: NextMatchView | null;
  lastResults: LastResultRow[];
}

// ── Small presentational atoms ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  suffix,
  highlighted = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl p-4 shadow-card",
        highlighted
          ? "bg-gradient-to-br from-primary to-primary-deep text-primary-foreground"
          : "bg-card",
      ].join(" ")}
    >
      <div
        className={[
          "text-[11px] font-semibold uppercase tracking-[0.06em]",
          highlighted ? "text-primary-foreground/80" : "text-muted-foreground",
        ].join(" ")}
      >
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-bold leading-none tracking-tight tabular-nums">
        {value}
        {suffix ? (
          <small className="text-sm font-semibold opacity-70">{suffix}</small>
        ) : null}
      </div>
    </div>
  );
}

const PILL_BY_KIND: Record<LastResultRow["kind"], string> = {
  win: "bg-primary-soft text-primary-deep",
  partial: "bg-warn-soft text-warn-deep",
  zero: "bg-muted text-muted-foreground",
};

function ResultRow({ row }: { row: LastResultRow }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card">
      <span className="rounded-[10px] bg-muted px-2.5 py-1 font-mono text-base font-bold tabular-nums">
        {row.score}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{row.matchLabel}</div>
        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
          {row.detail}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-pill px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${PILL_BY_KIND[row.kind]}`}
      >
        {row.points}
      </span>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function NextMatchHero({ next }: { next: NextMatchView }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-deep p-5 text-primary-foreground shadow-3d">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_85%_-10%,var(--primary-soft),transparent_60%)] opacity-40"
      />
      <div className="relative flex items-center justify-between gap-2">
        <span className="rounded-pill bg-primary-soft px-3 py-1 text-[11px] font-semibold text-foreground">
          Fase de grupos{next.groupLabel ? ` · Grupo ${next.groupLabel}` : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-3 py-1 text-[11px] font-semibold text-foreground">
          <span className="size-1.5 animate-pulse-live rounded-full bg-gol" />
          <KickoffCountdown kickoffAt={next.kickoffAtISO} prefix="Cierra en" />
        </span>
      </div>

      <div className="relative my-4 flex items-center gap-3">
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamFlag
            name={next.home.name}
            flagUrl={next.home.flagUrl}
            size={36}
            imageClassName="shrink-0 rounded-[4px] object-cover ring-[1.5px] ring-inset ring-primary-foreground/20"
            placeholderClassName="shrink-0 rounded-[4px] border border-dashed border-primary-foreground/40"
          />
          <span className="text-sm font-bold">{next.home.name}</span>
        </div>
        <span className="font-heading text-[15px] font-bold text-primary-foreground/65">
          VS
        </span>
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamFlag
            name={next.away.name}
            flagUrl={next.away.flagUrl}
            size={36}
            imageClassName="shrink-0 rounded-[4px] object-cover ring-[1.5px] ring-inset ring-primary-foreground/20"
            placeholderClassName="shrink-0 rounded-[4px] border border-dashed border-primary-foreground/40"
          />
          <span className="text-sm font-bold">{next.away.name}</span>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-gol px-3 py-1.5 text-xs font-bold text-foreground">
          ⏱ {next.closesAtLabel}
        </span>
        <Button
          asChild
          variant="pop-ghost"
          size="lg"
          className="bg-primary-foreground text-foreground ring-0 shadow-card"
        >
          <Link href="/predicciones">Pronosticar →</Link>
        </Button>
      </div>
    </div>
  );
}

function NoNextMatch() {
  return (
    <EmptyState
      title="No hay partidos abiertos ahora mismo"
      description="Volvé más tarde: cuando se habilite la próxima fecha vas a poder cargar tus pronósticos acá."
      className="rounded-2xl p-6"
    />
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-heading text-[19px] font-bold tracking-tight">
        {title}
      </h2>
      {action ? (
        <Link
          href={action.href}
          className="text-[13px] font-semibold text-primary hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function InicioContent({
  displayName,
  subline,
  groupsSlot,
  position,
  points = 0,
  played,
  totalMatches,
  predictionsLoaded,
  predictionsTotal,
  nextMatch,
  lastResults,
}: InicioContentProps) {
  const { rise, staggerContainer } = useReveal();

  return (
    <motion.div
      className="grid gap-6"
      variants={staggerContainer}
      initial={staggerContainer ? "hidden" : undefined}
      animate={staggerContainer ? "visible" : undefined}
    >
      {/* Greeting */}
      <motion.div variants={rise}>
        <h1 className="font-heading text-3xl font-bold leading-[1.05] tracking-tight">
          ¡Hola, {displayName}! 🧉
        </h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">
          {subline}
        </p>
      </motion.div>

      {/* Group standings (passed by the page) — right under the greeting. */}
      {groupsSlot ? (
        <motion.div variants={rise}>{groupsSlot}</motion.div>
      ) : null}

      {/*
       * Balanced two-column on lg: the próximo-partido hero on the left, and a
       * stack of stats + últimos resultados on the right so neither column hangs
       * with empty space. Mobile stacks everything.
       */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        {/* Left: próximo partido hero */}
        <motion.div variants={rise} className="grid gap-3">
          <SectionHeader title="Tu próximo partido" />
          {nextMatch ? <NextMatchHero next={nextMatch} /> : <NoNextMatch />}
        </motion.div>

        {/* Right: stats over últimos resultados */}
        <div className="grid gap-6">
          <motion.div
            variants={rise}
            className={[
              "grid gap-3",
              position !== null ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2",
            ].join(" ")}
          >
            {position !== null && (
              <>
                <StatCard label="Posición" value={`#${position}`} highlighted />
                <StatCard label="Puntos" value={String(points)} />
              </>
            )}
            <StatCard
              label="Jugados"
              value={String(played)}
              suffix={totalMatches > 0 ? `/${totalMatches}` : undefined}
            />
            <StatCard
              label="Cargadas"
              value={String(predictionsLoaded)}
              suffix={predictionsTotal > 0 ? `/${predictionsTotal}` : undefined}
            />
          </motion.div>

          <motion.div variants={rise} className="grid gap-3">
            {/*
             * "Ver tabla" previously linked to /tabla which now redirects to
             * /onboarding. The leaderboard lives per-group at
             * /g/{code}/leaderboard; this hub has no single active-group
             * context, so the CTA is removed rather than pointing to a dead end.
             */}
            <SectionHeader title="Últimos resultados" />
            {lastResults.length > 0 ? (
              <div className="grid gap-2.5">
                {lastResults.map((row) => (
                  <ResultRow key={row.matchId} row={row} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Todavía no jugaste ninguna"
                description="Cargá tus pronósticos y, cuando se confirmen los resultados, los vas a ver acá con tus puntos."
              />
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
