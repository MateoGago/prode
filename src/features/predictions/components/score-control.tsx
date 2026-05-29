"use client";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type ScoreControlProps = {
  value: number;
  disabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  teamName: string;
  scoreId: string;
};

export function ScoreControl({
  value,
  disabled,
  onDecrement,
  onIncrement,
  teamName,
  scoreId,
}: ScoreControlProps) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-background">
      <Label htmlFor={scoreId} className="sr-only">
        Goles de {teamName}
      </Label>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 rounded-r-none"
        disabled={disabled || value <= 0}
        onClick={onDecrement}
        aria-label={`Restar gol a ${teamName}`}
      >
        -
      </Button>

      <Input
        id={scoreId}
        type="number"
        readOnly
        disabled={disabled}
        value={value}
        className="h-8 w-12 rounded-none border-y-0 border-x text-center font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 rounded-l-none"
        disabled={disabled}
        onClick={onIncrement}
        aria-label={`Sumar gol a ${teamName}`}
      >
        +
      </Button>
    </div>
  );
}
