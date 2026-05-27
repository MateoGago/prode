-- ============================================================
-- TRIGGER: pin matches.status once confirmed (PRO-45)
-- The sync re-upserts every match as status='finished' when a score exists,
-- which would revert an already-'confirmed' match. Role-agnostic on purpose:
-- the sync runs as service_role, so a role check (cf. guard_points_awarded)
-- would not catch it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_confirmed_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status <> 'confirmed' THEN
    NEW.status = OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_guard_confirmed_status
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_confirmed_status();
