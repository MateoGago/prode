import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { CreateGroupForm } from "./create-group-form";
import { JoinGroupForm } from "./join-group-form";

/**
 * OnboardingContent — zero-state for users who don't belong to any group yet.
 *
 * Standalone, chrome-less surface (no app sidebar): a single centered column
 * with a welcoming hero, then the Crear / Unirse tabs. No option to skip — per
 * REQ-07 the user must explicitly create or join. Data-fetching and the
 * already-a-member redirect live in the parent page (Server Component).
 */
export function OnboardingContent() {
  return (
    <div className="w-full max-w-md animate-[rise_0.4s_ease-out]">
      <div className="mb-7 grid gap-3 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-16 place-items-center rounded-pill bg-primary-soft text-4xl shadow-card"
        >
          🏆
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">
          Tu prode arranca acá
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Creá tu propio grupo o unite al de un amigo con un código. Compiten
          sobre los mismos partidos, cada grupo con su tabla.
        </p>
      </div>

      <Card className="shadow-card">
        <CardContent className="py-5">
          <Tabs defaultValue="crear" className="gap-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="crear">Crear</TabsTrigger>
              <TabsTrigger value="unirse">Unirse</TabsTrigger>
            </TabsList>

            <TabsContent value="crear">
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Ponele un nombre y compartí el código con tus amigos.
                </p>
                <CreateGroupForm />
              </div>
            </TabsContent>

            <TabsContent value="unirse">
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Ingresá el código de invitación que te compartieron.
                </p>
                <JoinGroupForm />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
