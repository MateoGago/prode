// TODO(prode-groups PR3): redirect to /g/{code}/leaderboard or /onboarding
// once group routes are live. This page is temporarily stubbed because the
// global no-arg get_leaderboard() was dropped in the groups migration.
// Do NOT call getLeaderboard() here — it now requires a groupId.

export default function TablaPage() {
  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
          Tabla de posiciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná un grupo para ver la tabla de posiciones.
        </p>
      </div>
    </section>
  );
}
