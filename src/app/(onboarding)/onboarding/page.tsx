import { OnboardingContent } from "@/features/groups/components/onboarding";
import { createClient } from "@/shared/supabase/server";

/**
 * /onboarding — the create/join group surface (REQ-07).
 *
 * No longer redirects existing members away: it is now a stable surface for
 * creating or joining a group (including additional ones). This keeps the
 * post-create success state from being yanked by a re-render redirect, and lets
 * members reach it to create/join more groups. Zero-group users are still
 * funnelled here by the dashboard ("/") guard.
 *
 * Shows a "back to dashboard" link only when the user already belongs to a
 * group — a zero-group user has nowhere to go back to (the guard would bounce
 * them straight here again).
 *
 * Rendered by the standalone (onboarding) layout — no app sidebar.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canGoBack = false;
  if (user) {
    const { count } = await supabase
      .from("group_members")
      .select("group_id", { count: "exact", head: true })
      .eq("user_id", user.id);
    canGoBack = (count ?? 0) > 0;
  }

  return <OnboardingContent canGoBack={canGoBack} />;
}
