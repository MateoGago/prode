import { NotFoundView } from "@/shared/ui/not-found-view";

/**
 * Root not-found — catches unmatched URLs across the app. Renders under the
 * root layout only (no app shell), so it shows full-screen.
 *
 * Note: a `notFound()` thrown inside the (game) route subtree would render
 * wrapped by the (game) sidebar (ancestor layouts that already rendered are
 * kept). For that reason invalid group codes do NOT call notFound() — they
 * redirect to /grupo-no-encontrado, a standalone route outside (game).
 */
export default function NotFound() {
  return <NotFoundView />;
}
