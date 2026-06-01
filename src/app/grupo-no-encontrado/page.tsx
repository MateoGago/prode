import { NotFoundView } from "@/shared/ui/not-found-view";

/**
 * Standalone "group not found" page. resolveActiveGroup() redirects here when an
 * invite code resolves to no group, instead of calling notFound() — this route
 * lives OUTSIDE the (game) route group, so only the root layout wraps it and the
 * app sidebar never appears around the 404.
 */
export default function GrupoNoEncontradoPage() {
  return <NotFoundView />;
}
