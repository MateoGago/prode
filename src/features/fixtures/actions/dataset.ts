/**
 * Dataset loaders (I/O). The pure transforms live in entities/openfootball.ts;
 * here we only obtain the raw dataset — from the vendored snapshot (seed) or the
 * live openfootball feed (results sync).
 */

import worldcup2026 from "../entities/data/worldcup-2026.json";
import type { OpenFootballData } from "../entities/openfootball";

/** Live openfootball dataset — re-fetched on every results sync. */
const REMOTE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

/** The vendored snapshot pinned in the repo — deterministic, key-less seed. */
export function loadVendoredDataset(): OpenFootballData {
  return worldcup2026 as OpenFootballData;
}

/** Fetches the live dataset (scores + resolved bracket) for the results sync. */
export async function fetchRemoteDataset(
  url: string = REMOTE_URL,
): Promise<OpenFootballData> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `openfootball fetch failed: ${res.status} ${res.statusText}`,
    );
  }
  return (await res.json()) as OpenFootballData;
}
