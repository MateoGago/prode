/**
 * Date/time utilities for the prode app.
 *
 * Why a dedicated module: all user-visible timestamps must display in
 * America/Argentina/Buenos_Aires regardless of where the server runs.
 * Argentina has been UTC-3 year-round since 2008 (no DST), so the
 * Intl.DateTimeFormat API always resolves this correctly.
 */

const AR_TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * Format a UTC instant for display in Argentina local time.
 *
 * @param instant - A Date object or an ISO 8601 string (UTC).
 * @returns A string in the format "dd/MM/yyyy HH:mm" (24-hour clock).
 *
 * @example
 *   formatAR(new Date("2026-06-15T19:00:00Z")) // "15/06/2026 16:00"
 *   formatAR("2026-07-19T20:00:00Z")           // "19/07/2026 17:00"
 */
export function formatAR(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;

  // Intl.DateTimeFormat handles the UTC-3 offset and any future changes
  // to Argentina's timezone rules automatically.
  const formatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  // Extract the named parts and assemble in a predictable format.
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "??";

  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");

  return `${day}/${month}/${year} ${hour}:${minute}`;
}
