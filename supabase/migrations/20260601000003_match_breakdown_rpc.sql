-- Migration: match_breakdown_rpc
-- Applies: get_match_breakdown(p_user_id, p_group_id) SECURITY DEFINER RPC.
-- DO NOT apply manually in prod — run via `supabase db push`.
--
-- Why: the player breakdown page (/g/[code]/tabla/[userId]) read predictions
-- directly with the authenticated client. The pred_select_own RLS policy only
-- exposes the CALLER's own predictions, so viewing another player's breakdown
-- silently returned zero rows ("todavía no tiene partidos confirmados") even
-- when that player had scored predictions.
--
-- Fix mirrors get_leaderboard: a SECURITY DEFINER function that bypasses
-- predictions RLS to read any member's data, but self-gates so it only ever
-- returns rows when BOTH the target user AND the caller belong to p_group_id,
-- and only for CONFIRMED matches (a finished match's picks carry no competitive
-- advantage). Picks of non-co-members or unfinished matches are never exposed.
--
-- Returns SETOF jsonb shaped exactly like the action's BreakdownPredictionRow,
-- so the existing mapMatchBreakdown mapper consumes it unchanged.
--
-- Two access modes:
--   * Self view (dashboard "Inicio"): caller reads their OWN breakdown — no
--     group needed, so p_group_id may be NULL.
--   * Co-member view (group table): caller reads another player's breakdown —
--     allowed only when both share p_group_id.

CREATE OR REPLACE FUNCTION public.get_match_breakdown(
  p_user_id  uuid,
  p_group_id uuid DEFAULT NULL
)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT jsonb_build_object(
    'match_id',       pr.match_id,
    'home_score',     pr.home_score,
    'away_score',     pr.away_score,
    'points_awarded', pr.points_awarded,
    'match', jsonb_build_object(
      'home_score',  m.home_score,
      'away_score',  m.away_score,
      'multiplier',  m.multiplier,
      'status',      m.status,
      'kickoff_at',  m.kickoff_at,
      'home_team',   jsonb_build_object('name', ht.name, 'flag_url', ht.flag_url),
      'away_team',   jsonb_build_object('name', at.name, 'flag_url', at.flag_url)
    )
  )
  FROM public.predictions pr
  JOIN public.matches m  ON m.id = pr.match_id
  LEFT JOIN public.teams ht ON ht.id = m.home_team_id
  LEFT JOIN public.teams at ON at.id = m.away_team_id
  WHERE pr.user_id = p_user_id
    AND m.status = 'confirmed'
    AND (
      -- Self view: you can always read your own breakdown (group-agnostic).
      p_user_id = (select auth.uid())
      -- Co-member view: both target and caller must belong to the group.
      OR (
        public.is_group_member(p_group_id, p_user_id)
        AND public.is_group_member(p_group_id, (select auth.uid()))
      )
    )
  ORDER BY m.kickoff_at ASC;
$$;

COMMENT ON FUNCTION public.get_match_breakdown(uuid, uuid) IS
  'Confirmed-match prediction breakdown for a group co-member. SECURITY DEFINER (bypasses predictions RLS) but self-gated: returns rows only when both p_user_id and the caller belong to p_group_id.';

REVOKE EXECUTE ON FUNCTION public.get_match_breakdown(uuid, uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_match_breakdown(uuid, uuid) TO authenticated;
