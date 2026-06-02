"use client";

/**
 * GroupLeaderboard — the group leaderboard plus its member-management controls.
 *
 * Wraps the presentational LeaderboardTable and owns the interactive bits that
 * can't cross the RSC boundary:
 *  - Owner: a "Gestionar" toggle that reveals per-member remove controls on the
 *    table (podium + list), each guarded by an inline confirmation.
 *  - Non-owner: a "Salir del grupo" button, also with an inline confirmation.
 *
 * Both destructive paths confirm in place (no modal/dialog dependency) and call
 * the matching server action. Leaving navigates the user out of the group.
 */

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { leaveGroup } from "@/features/groups/actions/leave-group";
import { removeMember } from "@/features/groups/actions/remove-member";
import {
  LeaderboardTable,
  type LeaderboardRow,
} from "@/features/leaderboard/components/leaderboard-table";
import { Button } from "@/shared/ui/button";

type PendingRemoval = { playerId: string; playerName: string };

export type GroupLeaderboardProps = {
  rows: LeaderboardRow[];
  /** Invite code — needed to leave the group. */
  code: string;
  groupId: string;
  ownerId: string;
  currentUserId: string;
  emptyMessage?: string;
};

export function GroupLeaderboard({
  rows,
  code,
  groupId,
  ownerId,
  currentUserId,
  emptyMessage,
}: GroupLeaderboardProps) {
  const router = useRouter();
  const isOwner = currentUserId === ownerId;

  const [manageMode, setManageMode] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(
    null,
  );
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirmRemove() {
    if (!pendingRemoval) return;
    const { playerId, playerName } = pendingRemoval;

    startTransition(async () => {
      const result = await removeMember(groupId, playerId);

      if (!result.ok) {
        toast.error(
          result.reason === "unauthenticated"
            ? "Tenés que iniciar sesión"
            : result.reason === "forbidden"
              ? "No tenés permiso para echar a este jugador"
              : "No se pudo echar al jugador. Intentá de nuevo",
        );
      } else {
        toast.success(`Echaste a ${playerName} del grupo`);
        router.refresh();
      }
      setPendingRemoval(null);
    });
  }

  function confirmLeave() {
    startTransition(async () => {
      const result = await leaveGroup(code);

      if (!result.ok) {
        toast.error(
          result.reason === "owner_cannot_leave"
            ? "Sos el creador: no podés salir, tenés que eliminar el grupo"
            : result.reason === "unauthenticated"
              ? "Tenés que iniciar sesión"
              : "No se pudo salir del grupo. Intentá de nuevo",
        );
        setConfirmingLeave(false);
        return;
      }

      // No longer a member — leave the group-scoped section entirely.
      router.push("/");
    });
  }

  return (
    <div className="grid gap-3">
      <LeaderboardTable
        rows={rows}
        emptyMessage={emptyMessage}
        highlightPlayerId={currentUserId}
        manageMode={manageMode}
        ownerId={ownerId}
        currentUserId={currentUserId}
        onRemoveMember={(playerId, playerName) =>
          setPendingRemoval({ playerId, playerName })
        }
      />

      {pendingRemoval && (
        <div
          role="alertdialog"
          aria-label="Confirmar expulsión"
          className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center"
        >
          <p className="text-sm font-medium">
            ¿Echar a{" "}
            <span className="font-bold">{pendingRemoval.playerName}</span> del
            grupo?
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={confirmRemove}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Sí, echar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setPendingRemoval(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        {isOwner ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setManageMode((m) => !m)}
          >
            {manageMode ? "Listo" : "Gestionar"}
          </Button>
        ) : confirmingLeave ? (
          <div
            role="alertdialog"
            aria-label="Confirmar salida"
            className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center"
          >
            <p className="text-sm font-medium">
              ¿Seguro que querés salir del grupo?
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={confirmLeave}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                Sí, salir
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirmingLeave(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmingLeave(true)}
          >
            Salir del grupo
          </Button>
        )}
      </div>
    </div>
  );
}
