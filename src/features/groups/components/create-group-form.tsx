"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createGroup } from "@/features/groups/actions/create-group";
import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

import { InviteCodeShare } from "./invite-code-share";

const createGroupSchema = z.object({
  name: z.string().trim().min(1, { message: "El nombre no puede estar vacío" }),
});

type CreateGroupInput = z.infer<typeof createGroupSchema>;

export function CreateGroupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // On success we hold the new invite code and show a share step instead of
  // redirecting blind — the code is what makes the group usable.
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "" },
  });

  function onSubmit(values: CreateGroupInput) {
    startTransition(async () => {
      const result = await createGroup(values.name);

      if (!result.ok) {
        if (result.reason === "empty_name") {
          toast.error("El nombre del grupo no puede estar vacío");
        } else if (result.reason === "unauthenticated") {
          toast.error("Tenés que iniciar sesión para crear un grupo");
        } else {
          toast.error("No se pudo crear el grupo. Intentá de nuevo");
        }
        return;
      }

      setCreatedCode(result.code);
    });
  }

  if (createdCode) {
    return (
      <div className="grid gap-4 text-center">
        <div className="grid gap-1">
          <span aria-hidden="true" className="text-3xl">
            🎉
          </span>
          <h2 className="font-heading text-lg font-bold tracking-tight">
            ¡Grupo creado!
          </h2>
          <p className="text-sm text-muted-foreground">
            Compartí el código para que se sumen tus amigos.
          </p>
        </div>

        <InviteCodeShare code={createdCode} />

        <Button
          type="button"
          variant="pop-ghost"
          className="h-11 w-full text-sm font-semibold"
          onClick={() => router.push(`/g/${createdCode}/leaderboard`)}
        >
          Ir al grupo
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del grupo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Los del asado"
                  autoComplete="off"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          variant="pop"
          disabled={isPending}
          className="h-11 w-full text-sm font-semibold"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          Crear grupo
        </Button>
      </form>
    </Form>
  );
}
