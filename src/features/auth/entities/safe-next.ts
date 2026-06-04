/**
 * safeNext — returns `next` only if it is a safe same-origin path; otherwise
 * the fallback.
 *
 * Blocks open-redirect attacks:
 *  - Must start with a single "/" to be a same-origin path.
 *  - Must NOT start with "//" (protocol-relative URL → external redirect).
 *  - Must NOT start with "/\" (backslash-relative — IE/Edge interpreted these
 *    as protocol-relative in older engines; still blocked for safety).
 */
export function safeNext(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
