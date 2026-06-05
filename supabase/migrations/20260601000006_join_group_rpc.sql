-- Migration: join_group RPC
-- Adds public.join_group(p_code text) SECURITY DEFINER so an authenticated
-- NON-member can resolve a group by its invite_code and enroll themselves.
--
-- WHY: the groups_select_member policy (migration 20260601000002, FOR SELECT)
-- only exposes groups the caller already belongs to. The join flow looked the
-- group up with the user's own session BEFORE membership existed, so RLS hid the
-- row → invite-by-link and manual-code join returned "invalid_code" for everyone
-- who was not already a member. A catch-22: to join you must read the group, to
-- read the group you must already be joined.
--
-- Mirrors create_group: SECURITY DEFINER escapes the membership gate, the insert
-- is atomic, and ON CONFLICT DO NOTHING keeps re-joining idempotent. Returns the
-- invite_code on success, NULL for an unknown code (caller maps NULL → invalid).
-- DO NOT apply manually — run via `supabase db push`.

CREATE FUNCTION public.join_group(p_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_uid      uuid := (select auth.uid());
  v_group_id uuid;
  v_code     text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT id, invite_code INTO v_group_id, v_code
  FROM public.groups
  WHERE invite_code = p_code;

  IF NOT FOUND THEN
    RETURN NULL;  -- unknown code: caller maps to invalid_code
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (v_group_id, v_uid)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_group(text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.join_group(text) TO authenticated;
