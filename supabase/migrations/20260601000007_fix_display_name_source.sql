-- ============================================================
-- Fix display_name seeding + repair mis-seeded rows
-- ============================================================
--
-- Root cause: handle_new_user read `raw_user_meta_data ->> 'full_name'`, but the
-- email/password signup writes the name under the `display_name` key (and
-- Google writes `full_name`/`name`). So email-signup users had NULL full_name
-- and the trigger fell back to the email prefix (split_part(email,'@',1)) —
-- the "value that cuts before @domain.com" seen in the leaderboard/breakdown,
-- which render from profiles.display_name.
--
-- This migration makes the trigger prefer the key the app actually writes,
-- falling back through the OAuth keys, and only then to the email prefix. It
-- then repairs existing rows that were seeded with the email prefix but have a
-- real name available in auth metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    -- Prefer the name the email/password form writes (`display_name`), then the
    -- OAuth providers' keys (`full_name`/`name`); fall back to the email prefix
    -- only when no real name was supplied. NULLIF(TRIM(...),'') so a present-but
    -- -blank metadata value doesn't win over the next fallback.
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger-only: must never be callable via the Data API. CREATE OR REPLACE does
-- not reset privileges, but re-assert the revoke to keep the intent explicit.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- ── One-time repair ──────────────────────────────────────────────────────────
-- Only touch rows whose display_name is currently the email prefix AND that have
-- a real name in auth metadata. Conservative on purpose: it never overwrites a
-- name that already differs from the prefix, so any future edit via /settings is
-- safe. Runs as the migration role, which bypasses RLS.
UPDATE public.profiles p
SET display_name = COALESCE(
  NULLIF(TRIM(u.raw_user_meta_data ->> 'display_name'), ''),
  NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''),
  NULLIF(TRIM(u.raw_user_meta_data ->> 'name'), '')
)
FROM auth.users u
WHERE u.id = p.id
  AND p.display_name = split_part(u.email, '@', 1)
  AND COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data ->> 'name'), '')
  ) IS NOT NULL;
