"use client";

import type { Team } from "@/features/fixtures/entities/match";
import { cn } from "@/shared/lib/utils";
import { TeamFlag } from "@/shared/ui/team-flag";

export type AdvancerPickerProps = {
  /** The two competing teams; only shown on a KO + predicted draw. */
  options: Team[];
  selectedTeamId: string | null;
  disabled?: boolean;
  onSelect: (teamId: string) => void;
};

/**
 * Cancha Pop ".adv" picker: on a knockout draw the user must say who advances
 * by penalties. Wired to the prediction's advancerTeamId field; the save action
 * validates it is one of the two competing teams (KO-2).
 */
export function AdvancerPicker({
  options,
  selectedTeamId,
  disabled = false,
  onSelect,
}: AdvancerPickerProps) {
  return (
    <fieldset className="mt-3 rounded-2xl border-[1.5px] border-dashed border-border bg-card-muted p-3">
      <legend className="mb-2.5 flex items-center gap-1.5 px-1 text-[12.5px] font-bold text-muted-foreground">
        🏆 Empate en los 120&apos; — ¿quién avanza por penales?
      </legend>
      <div className="flex gap-2.5">
        {options.map((team) => {
          const selected = team.id === selectedTeamId;
          return (
            <button
              key={team.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onSelect(team.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl bg-card px-2 py-2.5 text-[13.5px] font-semibold shadow-[inset_0_0_0_1.6px_var(--border)] transition-all active:scale-[0.97] disabled:opacity-50",
                selected &&
                  "bg-primary-soft text-primary-deep shadow-[inset_0_0_0_2px_var(--primary)]",
              )}
            >
              <TeamFlag
                name={team.name}
                flagUrl={team.flagUrl}
                size={20}
                imageClassName="shrink-0 rounded-[3px] object-cover ring-[1.5px] ring-inset ring-border"
                placeholderClassName="shrink-0 rounded-[3px] border border-dashed border-border bg-card-muted"
              />
              {team.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
