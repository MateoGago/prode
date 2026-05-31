import { redirect } from "next/navigation";

/**
 * /tabla/[userId] is superseded by /g/[code]/tabla/[userId] (PR3, T-19).
 *
 * The breakdown page is now group-scoped. Any old link or bookmark hitting this
 * URL is redirected to /onboarding so the user can enter the group flow.
 */
export default function TablaUserPage() {
  redirect("/onboarding");
}
