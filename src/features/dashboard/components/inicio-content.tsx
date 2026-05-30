"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

import type { LastResultRow } from "@/features/dashboard";
import { Button } from "@/shared/ui/button";
import { KickoffCountdown } from "@/shared/ui/kickoff-countdown";
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
  initials: string;
  subline: string;
  position: number | null;
  points: number;
  played: number;
  totalMatches: number;
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

function Flag({ team, size }: { team: TeamView; size: number }) {
  if (team.flagUrl) {
    return (
      <Image
        src={team.flagUrl}
        alt={`Bandera de ${team.name}`}
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-full object-cover ring-[1.5px] ring-inset ring-white/15"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="shrink-0 rounded-full border border-dashed border-white/30"
      style={{ width: size, height: size }}
    />
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[oklch(0.40_0.10_165)] to-[oklch(0.30_0.07_168)] p-5 text-white shadow-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_85%_-10%,oklch(0.66_0.185_150/.45),transparent_60%)]"
      />
      <div className="relative flex items-center justify-between gap-2">
        <span className="rounded-pill bg-white/15 px-3 py-1 text-[11px] font-semibold">
          Fase de grupos{next.groupLabel ? ` · Grupo ${next.groupLabel}` : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-[11px] font-semibold">
          <span className="size-1.5 rounded-full bg-white animate-pulse-live" />
          <KickoffCountdown kickoffAt={next.kickoffAtISO} prefix="Cierra en" />
        </span>
      </div>

      <div className="relative my-4 flex items-center gap-3">
        <div className="flex flex-1 flex-col items-center gap-2">
          <Flag team={next.home} size={40} />
          <span className="text-sm font-bold">{next.home.name}</span>
        </div>
        <span className="font-heading text-[15px] font-bold text-white/60">
          VS
        </span>
        <div className="flex flex-1 flex-col items-center gap-2">
          <Flag team={next.away} size={40} />
          <span className="text-sm font-bold">{next.away.name}</span>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-warn px-3 py-1.5 text-xs font-bold text-[oklch(0.24_0.06_60)]">
          ⏱ {next.closesAtLabel}
        </span>
        <Button
          asChild
          variant="pop-ghost"
          size="lg"
          className="bg-white text-foreground ring-0 shadow-[0_4px_0_oklch(0_0_0/.25)]"
        >
          <Link href="/predicciones">Pronosticar →</Link>
        </Button>
      </div>
    </div>
  );
}

function NoNextMatch() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-card">
      <p className="font-heading text-lg font-bold">
        No hay partidos abiertos ahora mismo
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Volvé más tarde: cuando se habilite la próxima fecha vas a poder cargar
        tus pronósticos acá.
      </p>
    </div>
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
  initials,
  subline,
  position,
  points,
  played,
  totalMatches,
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
      <motion.div
        variants={rise}
        className="flex items-start justify-between gap-3"
      >
        <div>
          <h1 className="font-heading text-3xl font-bold leading-[1.05] tracking-tight">
            ¡Hola, {displayName}! 🧉
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            {subline}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-gol text-sm font-bold text-white"
        >
          {initials}
        </span>
      </motion.div>

      {/* Desktop: hero + (stats over results) side-by-side; mobile: stacked. */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        {/* Left column on lg: stats + próximo partido */}
        <div className="grid gap-6">
          <motion.div variants={rise} className="grid grid-cols-3 gap-3">
            <StatCard
              label="Posición"
              value={position === null ? "—" : `#${position}`}
              highlighted
            />
            <StatCard label="Puntos" value={String(points)} />
            <StatCard
              label="Jugados"
              value={String(played)}
              suffix={totalMatches > 0 ? `/${totalMatches}` : undefined}
            />
          </motion.div>

          <motion.div variants={rise} className="grid gap-3">
            <SectionHeader title="Tu próximo partido" />
            {nextMatch ? <NextMatchHero next={nextMatch} /> : <NoNextMatch />}
          </motion.div>
        </div>

        {/* Right column on lg: últimos resultados */}
        <motion.div variants={rise} className="grid gap-3">
          <SectionHeader
            title="Últimos resultados"
            action={{ href: "/tabla", label: "Ver tabla" }}
          />
          {lastResults.length > 0 ? (
            <div className="grid gap-2.5">
              {lastResults.map((row) => (
                <ResultRow key={row.matchId} row={row} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center shadow-card">
              <p className="text-sm font-semibold">
                Todavía no jugaste ninguna
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cargá tus pronósticos y, cuando se confirmen los resultados, los
                vas a ver acá con tus puntos.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
