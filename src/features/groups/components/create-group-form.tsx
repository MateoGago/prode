"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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

const createGroupSchema = z.object({
  name: z.string().trim().min(1, { message: "El nombre no puede estar vacío" }),
});

type CreateGroupInput = z.infer<typeof createGroupSchema>;

export function CreateGroupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

      router.push(`/g/${result.code}/leaderboard`);
    });
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
                  placeholder="Nombre del grupo"
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
