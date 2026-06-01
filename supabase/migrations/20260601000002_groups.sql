-- Migration: groups
-- Applies: groups + group_members tables, indexes, is_group_member() helper,
--          RLS policies for both tables, rewritten get_leaderboard(p_group_id uuid)
--          SECURITY DEFINER with internal membership self-gate, and DROP of the
--          old no-arg get_leaderboard().
-- DO NOT apply manually — run via `supabase db push`.
--
-- CRITICAL ORDER: this migration MUST be applied together with the PR2 change to
-- get-leaderboard.ts (caller of get_leaderboard RPC). The old no-arg function is
-- DROPped here; deploying this migration without updating the caller breaks the app.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (length(btrim(name)) > 0),
  invite_code text        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.group_members (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  uuid        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_groups_owner_id        ON public.groups(owner_id);
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id  ON public.group_members(user_id);

-- ============================================================
-- HELPER: is_group_member
-- SECURITY DEFINER + search_path='' to avoid RLS recursion in policies.
-- ============================================================

CREATE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- groups: a member can read; owner can insert/update/delete
CREATE POLICY groups_select_member ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, (select auth.uid())));

CREATE POLICY groups_insert_owner ON public.groups FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY groups_update_owner ON public.groups FOR UPDATE TO authenticated
  USING  (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY groups_delete_owner ON public.groups FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()));

-- group_members: read co-members of groups you belong to; insert ONLY yourself
CREATE POLICY gm_select_comember ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, (select auth.uid())));

CREATE POLICY gm_insert_self ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================
-- GROUP CREATION: atomic create + auto-enroll owner.
-- SECURITY DEFINER so the owner's membership row exists before any RLS-bound
-- read (otherwise INSERT ... RETURNING trips the membership-gated SELECT policy)
-- AND so the two inserts are atomic — a failure on the second never leaves an
-- orphan group. Caller (create-group.ts) retries on 23505 (invite_code clash).
-- ============================================================

CREATE FUNCTION public.create_group(p_name text, p_invite_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_uid      uuid := (select auth.uid());
  v_group_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.groups (owner_id, name, invite_code)
  VALUES (v_uid, btrim(p_name), p_invite_code)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (v_group_id, v_uid);

  RETURN v_group_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_group(text, text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.create_group(text, text) TO authenticated;

-- ============================================================
-- LEADERBOARD: rewritten to require p_group_id, internal self-gate
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_group_id uuid)
RETURNS TABLE (user_id uuid, display_name text, total_points bigint, hits bigint)
LANGUAGE sql SECURITY DEFINER SET search_path='' STABLE AS $$
  SELECT
    p.id,
    p.display_name,
    COALESCE(SUM(pr.points_awarded), 0),
    COUNT(*) FILTER (WHERE pr.points_awarded > 0)
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  LEFT JOIN public.predictions pr ON pr.user_id = p.id
  WHERE gm.group_id = p_group_id
    AND public.is_group_member(p_group_id, (select auth.uid()))  -- self-gate: non-members get zero rows
  GROUP BY p.id, p.display_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_leaderboard(uuid) TO authenticated;

-- DROP the old no-arg version — callers MUST use get_leaderboard(p_group_id) now.
DROP FUNCTION IF EXISTS public.get_leaderboard();
