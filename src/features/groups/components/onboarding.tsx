import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
export interface OnboardingContentProps {
  /** When true, show a link back to the dashboard (the user already has a group). */
  canGoBack?: boolean;
}

export function OnboardingContent({
  canGoBack = false,
}: OnboardingContentProps) {
  return (
    <div className="w-full max-w-md animate-[rise_0.4s_ease-out]">
      {canGoBack ? (
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al inicio
        </Link>
      ) : null}
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
          Unite al grupo de un amigo o creá el tuyo. Compiten sobre los mismos
          partidos, cada grupo con su tabla.
        </p>
      </div>

      <Card className="shadow-card">
        <CardContent className="py-5">
          <Tabs defaultValue="unirse" className="gap-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="unirse">Unirse</TabsTrigger>
              <TabsTrigger value="crear">Crear</TabsTrigger>
            </TabsList>

            <TabsContent value="unirse">
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Ingresá el código o abrí el link que te compartieron.
                </p>
                <JoinGroupForm />
              </div>
            </TabsContent>

            <TabsContent value="crear">
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Ponele un nombre y compartí el link con tus amigos.
                </p>
                <CreateGroupForm />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
