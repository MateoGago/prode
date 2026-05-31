import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { CreateGroupForm } from "./create-group-form";
import { JoinGroupForm } from "./join-group-form";

/**
 * OnboardingContent — composites CreateGroupForm and JoinGroupForm in tabs.
 *
 * Renders the zero-state UI for users who don't belong to any group yet.
 * No option to skip — per REQ-07 the user must explicitly act.
 *
 * Pure presentational shell; data-fetching and redirect logic live in the
 * parent page (Server Component).
 */
export function OnboardingContent() {
  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Grupos
        </h1>
        <p className="text-sm text-muted-foreground">
          Creá tu propio grupo o unite al de un amigo para competir en la tabla.
        </p>
      </div>

      <Tabs defaultValue="crear" className="gap-5">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="crear">Crear</TabsTrigger>
          <TabsTrigger value="unirse">Unirse</TabsTrigger>
        </TabsList>

        <TabsContent value="crear">
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              Creá un grupo y compartí el código con tus amigos.
            </p>
            <CreateGroupForm />
          </div>
        </TabsContent>

        <TabsContent value="unirse">
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              Ingresá el código de invitación que te compartieron.
            </p>
            <JoinGroupForm />
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
