import { OnboardingContent } from "@/features/groups/components/onboarding";

/**
 * /onboarding — the create/join group surface (REQ-07).
 *
 * No longer redirects existing members away: it is now a stable surface for
 * creating or joining a group (including additional ones). This keeps the
 * post-create success state from being yanked by a re-render redirect, and lets
 * members reach it to create/join more groups. Zero-group users are still
 * funnelled here by the dashboard ("/") guard.
 *
 * Rendered by the standalone (onboarding) layout — no app sidebar.
 */
export default function OnboardingPage() {
  return <OnboardingContent />;
}
