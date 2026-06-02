-- ============================================================
-- DEMO SEED — finish the group stage and fill the Round of 32
-- ------------------------------------------------------------
-- Confirms matchday 3, computes group standings from confirmed results,
-- qualifies 1st/2nd of each group + the 8 best third-placed teams, and fills
-- the 16 R32 matches with real teams:
--   * "1X" / "2X" slots  -> 1st / 2nd of group X (exact).
--   * "3A/B/.." slots     -> a best third whose group is in the allowed set
--                           (demo assignment — NOT the exact FIFA combination
--                           table; good enough to see the bracket with teams).
-- R32 matches stay 'scheduled' (predictable + visible). Later rounds keep their
-- W74/L101 placeholders. Idempotent: re-runs skip already-confirmed matchday 3
-- and never overwrite an R32 slot that already has a team.
--
-- Run:  docker exec -i supabase_db_prode psql -U postgres -d postgres < scripts/seed-knockout.sql
-- Lost on `supabase db reset`.
-- ============================================================

DO $$
DECLARE
  rec   record;
  v_team uuid;
BEGIN
  -- 1) Finish the group stage: confirm matchday 3 (only still-scheduled ones).
  UPDATE public.matches
  SET home_score          = floor(random() * 4)::smallint,
      away_score          = floor(random() * 4)::smallint,
      status              = 'confirmed',
      result_confirmed_at = now()
  WHERE round = 'group' AND matchday = 3 AND status = 'scheduled';

  -- 2) Standings per team within its group (from confirmed group matches).
  CREATE TEMP TABLE _standings ON COMMIT DROP AS
  WITH results AS (
    SELECT m.home_team_id AS team_id, t.group_label, m.home_score AS gf, m.away_score AS ga
    FROM public.matches m
    JOIN public.teams t ON t.id = m.home_team_id
    WHERE m.round = 'group' AND m.status = 'confirmed'
    UNION ALL
    SELECT m.away_team_id, t.group_label, m.away_score, m.home_score
    FROM public.matches m
    JOIN public.teams t ON t.id = m.away_team_id
    WHERE m.round = 'group' AND m.status = 'confirmed'
  ),
  agg AS (
    SELECT team_id, group_label,
      SUM(CASE WHEN gf > ga THEN 3 WHEN gf = ga THEN 1 ELSE 0 END) AS pts,
      SUM(gf - ga) AS gd,
      SUM(gf)      AS gf
    FROM results
    GROUP BY team_id, group_label
  )
  SELECT team_id, group_label, pts, gd, gf,
    row_number() OVER (
      PARTITION BY group_label ORDER BY pts DESC, gd DESC, gf DESC, random()
    ) AS rank_in_group
  FROM agg;

  -- 3) Best thirds: rank the 12 third-placed teams; top 8 qualify.
  CREATE TEMP TABLE _thirds ON COMMIT DROP AS
  SELECT team_id, group_label,
    row_number() OVER (ORDER BY pts DESC, gd DESC, gf DESC, random()) AS third_rank,
    false AS assigned
  FROM _standings
  WHERE rank_in_group = 3;

  -- 4) Fill exact "1X"/"2X" slots (home + away), only where still empty.
  UPDATE public.matches m
  SET home_team_id = s.team_id
  FROM _standings s
  WHERE m.round = 'r32' AND m.home_team_id IS NULL
    AND m.home_placeholder ~ '^[12][A-L]$'
    AND s.group_label  = substring(m.home_placeholder from 2 for 1)
    AND s.rank_in_group = substring(m.home_placeholder from 1 for 1)::int;

  UPDATE public.matches m
  SET away_team_id = s.team_id
  FROM _standings s
  WHERE m.round = 'r32' AND m.away_team_id IS NULL
    AND m.away_placeholder ~ '^[12][A-L]$'
    AND s.group_label  = substring(m.away_placeholder from 2 for 1)
    AND s.rank_in_group = substring(m.away_placeholder from 1 for 1)::int;

  -- 5) Fill the eight "3.." slots greedily, most-constrained slot first,
  --    preferring a still-unassigned third whose group is in the slot's list.
  FOR rec IN
    SELECT id, side, ph FROM (
      SELECT m.id, 'home'::text AS side, m.home_placeholder AS ph, m.kickoff_at
      FROM public.matches m
      WHERE m.round = 'r32' AND m.home_team_id IS NULL AND m.home_placeholder LIKE '3%'
      UNION ALL
      SELECT m.id, 'away'::text, m.away_placeholder, m.kickoff_at
      FROM public.matches m
      WHERE m.round = 'r32' AND m.away_team_id IS NULL AND m.away_placeholder LIKE '3%'
    ) q
    ORDER BY length(ph) ASC, ph
  LOOP
    -- Allowed group letters for this slot: drop the leading '3' and the '/'.
    SELECT t.team_id INTO v_team
    FROM _thirds t
    WHERE NOT t.assigned AND t.third_rank <= 8
      AND position(t.group_label IN replace(substring(rec.ph FROM 2), '/', '')) > 0
    ORDER BY t.third_rank
    LIMIT 1;

    IF v_team IS NULL THEN
      -- Fallback: any qualified third still unassigned (keeps the bracket full).
      SELECT t.team_id INTO v_team
      FROM _thirds t
      WHERE NOT t.assigned AND t.third_rank <= 8
      ORDER BY t.third_rank
      LIMIT 1;
    END IF;

    UPDATE _thirds SET assigned = true WHERE team_id = v_team;

    IF rec.side = 'home' THEN
      UPDATE public.matches SET home_team_id = v_team WHERE id = rec.id;
    ELSE
      UPDATE public.matches SET away_team_id = v_team WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
