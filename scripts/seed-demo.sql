-- ============================================================
-- DEMO SEED — fake users + predictions + finished matchdays
-- ------------------------------------------------------------
-- Populates the LOCAL Supabase DB so the leaderboard looks "alive":
--   * 8 fake users (email/password demo1234), auto-profiled by the
--     on_auth_user_created trigger.
--   * Added as members of the "Debates" group (invite HY9BAFSR) so the
--     owner (santiagopacini@gmail.com) sees them on the leaderboard.
--   * Group-stage matchdays 1 & 2 (48 matches) confirmed with scores.
--   * One prediction per fake per confirmed match, biased by a per-user
--     skill so the ranking spreads out.
--   * points_awarded computed with the EXACT production formula:
--       3 = exact score, 1 = right outcome, 0 = miss   (× round multiplier)
--     mirroring calculatePoints() in src/features/scoring/entities/scoring.ts.
--
-- Run as the postgres superuser (bypasses RLS + the points/status guards):
--   docker exec -i supabase_db_prode psql -U postgres -d postgres < scripts/seed-demo.sql
--
-- Idempotent: re-running skips existing users/predictions and already
-- confirmed matches. Lost on `supabase db reset`.
-- ============================================================

BEGIN;

-- 1) Fake auth users (profiles auto-created by handle_new_user trigger from full_name)
INSERT INTO auth.users
  (id, instance_id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  t.email,
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', t.display_name)
FROM (VALUES
  ('fake01@demo.local', 'Lucas Fernández'),
  ('fake02@demo.local', 'Martina Gómez'),
  ('fake03@demo.local', 'Tomás Rodríguez'),
  ('fake04@demo.local', 'Valentina Díaz'),
  ('fake05@demo.local', 'Mateo López'),
  ('fake06@demo.local', 'Sofía Martínez'),
  ('fake07@demo.local', 'Benjamín Sosa'),
  ('fake08@demo.local', 'Camila Romero')
) AS t(email, display_name)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = t.email
);

-- 2) Enroll the fakes in the "Debates" group (invite HY9BAFSR)
INSERT INTO public.group_members (group_id, user_id)
SELECT g.id, u.id
FROM public.groups g
CROSS JOIN auth.users u
WHERE g.invite_code = 'HY9BAFSR'
  AND u.email LIKE 'fake%@demo.local'
ON CONFLICT (group_id, user_id) DO NOTHING;

-- 3) Confirm group-stage matchdays 1 & 2 with pseudo-random scores (0..3 goals).
--    Only touches still-scheduled matches, so re-runs keep prior results.
UPDATE public.matches
SET home_score          = floor(random() * 4)::smallint,
    away_score          = floor(random() * 4)::smallint,
    status              = 'confirmed',
    result_confirmed_at = now()
WHERE round = 'group'
  AND matchday IN (1, 2)
  AND status = 'scheduled';

-- 4) One prediction per fake per confirmed MD1/MD2 match.
--    bias = chance the fake nails the actual score; user 1 best (0.90) → user 8 worst (0.27).
INSERT INTO public.predictions (user_id, match_id, home_score, away_score, points_awarded, scored_at)
SELECT
  f.id,
  c.id,
  CASE WHEN random() < f.bias THEN c.home_score ELSE floor(random() * 4)::smallint END,
  CASE WHEN random() < f.bias THEN c.away_score ELSE floor(random() * 4)::smallint END,
  0,            -- forced to 0 by guard trigger on INSERT anyway; real value set in step 5
  now()
FROM (
  SELECT u.id,
         0.90 - (row_number() OVER (ORDER BY u.email) - 1) * 0.09 AS bias
  FROM auth.users u
  WHERE u.email LIKE 'fake%@demo.local'
) AS f
CROSS JOIN (
  SELECT id, home_score, away_score
  FROM public.matches
  WHERE round = 'group' AND matchday IN (1, 2) AND status = 'confirmed'
) AS c
ON CONFLICT (user_id, match_id) DO NOTHING;

-- 5) Score every prediction on a confirmed match with the production formula.
--    base = 3 exact / 1 right outcome / 0 miss   (× match multiplier; group = 1)
UPDATE public.predictions pr
SET points_awarded =
      CASE
        WHEN pr.home_score = m.home_score AND pr.away_score = m.away_score THEN 3
        WHEN sign(pr.home_score - pr.away_score) = sign(m.home_score - m.away_score) THEN 1
        ELSE 0
      END * m.multiplier,
    scored_at = now()
FROM public.matches m
WHERE pr.match_id = m.id
  AND m.round = 'group'
  AND m.matchday IN (1, 2)
  AND m.status = 'confirmed';

COMMIT;
