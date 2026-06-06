"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

import { updateDisplayName } from "../actions/update-display-name";
import {
  type DisplayNameInput,
  displayNameSchema,
} from "../entities/credentials";

/**
 * Edits the name shown across the app. Seeded with the current
 * profiles.display_name; on success the server action revalidates the layout so
 * the nav/Inicio pick up the change, and we reset the form's baseline so the
 * Save button goes idle again.
 */
export function DisplayNameForm({ currentName }: { currentName: string }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<DisplayNameInput>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { displayName: currentName },
  });

  function onSubmit(values: DisplayNameInput) {
    startTransition(async () => {
      const result = await updateDisplayName(values);

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      form.reset({ displayName: result.displayName });
      toast.success(result.message);
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
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre visible</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Cómo te ven los demás"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Este es el nombre que ven el resto en la tabla y en toda la app.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          variant="pop"
          disabled={isPending || !form.formState.isDirty}
          className="h-11 w-full text-sm font-semibold sm:w-auto sm:justify-self-end sm:px-8"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          Guardar
        </Button>
      </form>
    </Form>
  );
}
