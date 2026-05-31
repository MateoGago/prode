/**
 * /onboarding — forced group onboarding entry point (REQ-07).
 *
 * PR3: skeleton page. All redirects from /tabla and the nav item land here.
 *
 * TODO(prode-groups PR4): replace with the full OnboardingContent shell that
 * calls listMyGroups() and renders CreateGroupForm + JoinGroupForm (T-22, T-25).
 * If the user already has groups, redirect to /g/{firstCode}/leaderboard.
 */
export default function OnboardingPage() {
  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <h1
          className={
            "font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight"
          }
        >
          Grupos
        </h1>
        <p className="text-sm text-muted-foreground">
          Creá o unite a un grupo para ver la tabla de posiciones.
        </p>
      </div>
      {/* TODO(prode-groups PR4): CreateGroupForm + JoinGroupForm */}
    </section>
  );
}
