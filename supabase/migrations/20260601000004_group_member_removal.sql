-- Migration: group member removal
-- Applies: is_group_owner() helper + two DELETE policies on group_members so a
--          member can leave a group and an owner can kick other members.
-- DO NOT apply manually — run via `supabase db push`.
--
-- Before this migration group_members had NO delete policy, so RLS denied every
-- delete: nobody could leave and nobody could be removed. These two policies are
-- OR'd by Postgres, so a row is deletable if EITHER matches:
--   1. the caller is deleting their own membership and is NOT the owner  (leave)
--   2. the caller owns the group and the target is NOT themselves        (kick)
-- The owner is intentionally excluded from "leave" — leaving would orphan the
-- group; the owner must delete the group instead (groups_delete_owner).

-- ============================================================
-- HELPER: is_group_owner
-- SECURITY DEFINER + search_path='' to avoid RLS recursion in policies, mirroring
-- is_group_member from the groups migration.
-- ============================================================

CREATE FUNCTION public.is_group_owner(p_group_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND owner_id = p_user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) TO authenticated;

-- ============================================================
-- ROW LEVEL SECURITY: group_members DELETE
-- ============================================================

-- (1) Leave: a non-owner member removes their own membership row.
CREATE POLICY gm_delete_self ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id = (select auth.uid())
    AND NOT public.is_group_owner(group_id, (select auth.uid()))
  );

-- (2) Kick: the group owner removes another member (never themselves).
CREATE POLICY gm_delete_by_owner ON public.group_members FOR DELETE TO authenticated
  USING (
    public.is_group_owner(group_id, (select auth.uid()))
    AND user_id <> (select auth.uid())
  );
