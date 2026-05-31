"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { joinGroup } from "@/features/groups/actions/join-group";
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

const joinGroupSchema = z.object({
  code: z.string().trim().min(1, { message: "El código no puede estar vacío" }),
});

type JoinGroupInput = z.infer<typeof joinGroupSchema>;

export function JoinGroupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<JoinGroupInput>({
    resolver: zodResolver(joinGroupSchema),
    defaultValues: { code: "" },
  });

  function onSubmit(values: JoinGroupInput) {
    startTransition(async () => {
      const result = await joinGroup(values.code);

      if (!result.ok) {
        if (result.reason === "invalid_code") {
          form.setError("code", {
            message: "Código inválido. Revisá que esté bien escrito",
          });
          toast.error("Código inválido. Revisá que esté bien escrito");
        } else {
          toast.error("Tenés que iniciar sesión para unirte a un grupo");
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
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código de invitación</FormLabel>
              <FormControl>
                <Input
                  placeholder="Código de invitación"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="h-11 font-mono uppercase"
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
          Unirme al grupo
        </Button>
      </form>
    </Form>
  );
}
