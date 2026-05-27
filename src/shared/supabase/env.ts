/**
 * Supabase public env vars, read as string literals.
 *
 * Uses the new Supabase API key system: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
 * (an `sb_publishable_...` key) — the legacy `anon` JWT key is deprecated.
 *
 * Next.js only inlines `NEXT_PUBLIC_*` into the browser bundle when accessed
 * literally (dynamic `process.env[key]` is NOT inlined), so we keep the literal
 * access here and fail fast with a clear message if either is missing.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan variables de Supabase: definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local",
    );
  }

  return { url, publishableKey };
}
