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

/**
 * Format a kickoff for the dashboard hero lock line: short AR weekday +
 * "d/M · HH:mm", e.g. "Sáb 13/6 · 16:00". Day/month are unpadded (no leading
 * zeros) to match the approved proof; the time stays zero-padded 24h.
 */
export function formatKickoffLong(instant: Date | string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;

  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  // es-AR weekday short is lowercase "sáb." with a trailing dot — capitalize
  // and strip the dot for the proof's "Sáb" look.
  const weekday = get("weekday").replace(/\.$/, "");
  const weekdayTitle = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const day = get("day");
  const month = get("month");
  const hour = get("hour");
  const minute = get("minute");

  return `${weekdayTitle} ${day}/${month} · ${hour}:${minute}`;
}

/**
 * AR-local calendar-day parts for a UTC instant — the building block for the
 * "por día" predictions view. Grouping must use the SAME timezone the match
 * cards display in (formatAR → America/Argentina/Buenos_Aires), so a kickoff
 * shown at 21:00 ART lands under that ART day, not the UTC one.
 */
export interface ArDayParts {
  /** Sortable, stable day key "YYYY-MM-DD" (AR-local). Used as anchor id + sort key. */
  key: string;
  /** Day of month, unpadded (e.g. "11") — fits the section badge. */
  day: string;
  /** Capitalized AR weekday (e.g. "Jueves"). */
  weekday: string;
  /** Capitalized AR month (e.g. "Junio"). */
  month: string;
}

export function arDayParts(instant: Date | string): ArDayParts {
  const date = typeof instant === "string" ? new Date(instant) : instant;

  // Human parts (weekday/month names) in Spanish, AR-local.
  const named = new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).formatToParts(date);

  const get = (type: string) => named.find((p) => p.type === type)?.value ?? "";
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Machine key "YYYY-MM-DD", AR-local. en-CA renders ISO-ordered numeric dates,
  // so the string is both stable and lexicographically sortable.
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return {
    key,
    day: get("day"),
    weekday: titleCase(get("weekday")),
    month: titleCase(get("month")),
  };
}

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Human countdown for a kickoff/lock deadline, given the remaining milliseconds.
 *
 * Pure (no `Date.now()`): the caller owns "now" so it ticks live in a client
 * component and stays trivially testable.
 *
 * @returns
 *   - "Cerrado" once the deadline has passed (remaining <= 0)
 *   - "Xd" when a full day or more remains
 *   - "Xh Ym" when under a day
 *   - "Xm" when under an hour (rounded up so it never reads "0m" while still open)
 */
export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "Cerrado";

  if (remainingMs >= MS_PER_DAY) {
    return `${Math.floor(remainingMs / MS_PER_DAY)}d`;
  }

  if (remainingMs >= MS_PER_HOUR) {
    const hours = Math.floor(remainingMs / MS_PER_HOUR);
    const minutes = Math.floor((remainingMs % MS_PER_HOUR) / MS_PER_MINUTE);
    return `${hours}h ${minutes}m`;
  }

  // Under an hour: round up so a partial minute still shows "1m", never "0m".
  return `${Math.max(1, Math.ceil(remainingMs / MS_PER_MINUTE))}m`;
}
