/**
 * StandingsTable — renders per-group standings with qualification highlights.
 *
 * Props:
 * - standings: GroupStandings[] produced by computeStandings()
 * - qualifiedTeamIds: team IDs for top-2 (highlighted as qualified)
 * - bestThirdTeamIds: team IDs in the best-thirds selection (highlighted distinctly)
 *
 * Highlight logic is DISPLAY ONLY — no bracket allocation here.
 * UI text in Spanish. Columns: PJ PG PE PP GF GC DG Pts.
 */

import { TeamFlag } from "@/shared/ui/team-flag";
import { EmptyState } from "@/shared/ui/empty-state";
import type { GroupStandings } from "@/features/tournament/entities/standings";
import { cn } from "@/shared/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QualificationStatus = "top2" | "best-third" | "none";

// ---------------------------------------------------------------------------
// StandingsTable
// ---------------------------------------------------------------------------

export interface StandingsTableProps {
  standings: GroupStandings[];
  /** Team IDs that occupy positions 1–2 in their group (plain array — RSC-safe). */
  qualifiedTeamIds: string[];
  /** Team IDs that are in the best-8-thirds selection (plain array — RSC-safe). */
  bestThirdTeamIds: string[];
}

export function StandingsTable({
  standings,
  qualifiedTeamIds,
  bestThirdTeamIds,
}: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay partidos terminados"
        description="Las posiciones se actualizan cuando se confirman los resultados."
      />
    );
  }

  // Rebuild Sets for O(1) membership lookups. Props arrive as plain arrays so
  // they cross the RSC→Client boundary unambiguously (a Set prop is not
  // reliably serialized into the client component).
  const qualifiedSet = new Set(qualifiedTeamIds);
  const bestThirdSet = new Set(bestThirdTeamIds);

  return (
    <div className="grid gap-6">
      {standings.map((group) => (
        <GroupTable
          key={group.groupLabel}
          group={group}
          qualifiedTeamIds={qualifiedSet}
          bestThirdTeamIds={bestThirdSet}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupTable — single group standings table
// ---------------------------------------------------------------------------

interface GroupTableProps {
  group: GroupStandings;
  qualifiedTeamIds: Set<string>;
  bestThirdTeamIds: Set<string>;
}

function GroupTable({
  group,
  qualifiedTeamIds,
  bestThirdTeamIds,
}: GroupTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border bg-muted/40 px-4 py-2.5">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Grupo {group.groupLabel}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                #
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Equipo
              </th>
              {(["PJ", "PG", "PE", "PP", "GF", "GC", "DG", "Pts"] as const).map(
                (col) => (
                  <th
                    key={col}
                    className={cn(
                      "px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                      col === "Pts" && "font-bold text-foreground",
                    )}
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, idx) => {
              const qualification = getQualification(
                row.team.id,
                qualifiedTeamIds,
                bestThirdTeamIds,
              );

              return (
                <tr
                  key={row.team.id}
                  data-qualification={qualification}
                  className={cn(
                    "border-b border-border/50 last:border-0",
                    qualification === "top2" && "bg-emerald-500/5",
                    qualification === "best-third" && "bg-sky-500/5",
                  )}
                >
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <span className="flex size-5 items-center justify-center rounded-full text-[11px] font-semibold">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <TeamFlag
                        name={row.team.name}
                        flagUrl={row.team.flagUrl}
                        size={18}
                      />
                      <span className="font-medium">{row.team.name}</span>
                      {qualification === "top2" && (
                        <span className="ml-1 rounded-sm bg-emerald-500/15 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                          C
                        </span>
                      )}
                      {qualification === "best-third" && (
                        <span className="ml-1 rounded-sm bg-sky-500/15 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-600">
                          3°
                        </span>
                      )}
                    </div>
                  </td>
                  {(
                    [
                      ["PJ", row.pj],
                      ["PG", row.pg],
                      ["PE", row.pe],
                      ["PP", row.pp],
                      ["GF", row.gf],
                      ["GC", row.gc],
                      ["DG", row.dg],
                      ["Pts", row.pts],
                    ] as const
                  ).map(([label, val]) => (
                    <td
                      key={label}
                      className={cn(
                        "px-2 py-2.5 text-center tabular-nums",
                        label === "Pts" && "font-bold",
                      )}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQualification(
  teamId: string,
  qualifiedTeamIds: Set<string>,
  bestThirdTeamIds: Set<string>,
): QualificationStatus {
  if (qualifiedTeamIds.has(teamId)) return "top2";
  if (bestThirdTeamIds.has(teamId)) return "best-third";
  return "none";
}
