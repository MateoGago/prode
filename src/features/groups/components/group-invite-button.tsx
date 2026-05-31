"use client";

import { UserPlus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/ui/button";

import { InviteCodeShare } from "./invite-code-share";

/**
 * GroupInviteButton — persistent invite affordance for the group page header.
 * A lightweight disclosure (no modal infra): the "Invitar" button toggles a
 * popover panel carrying the reusable InviteCodeShare, so a member can grab and
 * share the code at any time, not just right after creating the group.
 */
export function GroupInviteButton({ code }: { code: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="pop-ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="gap-1.5"
      >
        <UserPlus className="size-4" aria-hidden="true" />
        Invitar
      </Button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-card ring-1 ring-foreground/10">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading text-sm font-semibold">
                Invitá a tus amigos
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <InviteCodeShare code={code} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
