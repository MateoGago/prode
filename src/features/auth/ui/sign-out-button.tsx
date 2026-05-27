"use client";

import { Loader2, LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/shared/ui/button";

import { signOut } from "../actions";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
      className="gap-2"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      Salir
    </Button>
  );
}
