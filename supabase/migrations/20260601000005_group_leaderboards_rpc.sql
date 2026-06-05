-- Migration: batch group leaderboards
-- Applies: get_group_leaderboards(p_group_ids uuid[]) — a multi-group version of
--          get_leaderboard, so listMyGroups can fetch every membership's
--          standings in ONE round-trip instead of N (one RPC per group).
-- DO NOT apply manually — run via `supabase db push`.
--
-- Same aggregation and self-gate as get_leaderboard(uuid): SECURITY DEFINER with
-- search_path='' to bypass predictions RLS while exposing only aggregates, and an
-- internal is_group_member() check so a caller only ever gets groups they belong
-- to (passing a foreign group_id yields zero rows for it).

CREATE FUNCTION public.get_group_leaderboards(p_group_ids uuid[])
RETURNS TABLE (
  group_id uuid,
  user_id uuid,
  display_name text,
  total_points bigint,
  hits bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path='' STABLE AS $$
  SELECT
    gm.group_id,
    p.id,
    p.display_name,
    COALESCE(SUM(pr.points_awarded), 0),
    COUNT(*) FILTER (WHERE pr.points_awarded > 0)
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  LEFT JOIN public.predictions pr ON pr.user_id = p.id
  WHERE gm.group_id = ANY(p_group_ids)
    AND public.is_group_member(gm.group_id, (select auth.uid()))  -- self-gate per group
  GROUP BY gm.group_id, p.id, p.display_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_group_leaderboards(uuid[]) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_group_leaderboards(uuid[]) TO authenticated;
