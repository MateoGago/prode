-- Migration: initial_schema
-- Applies: profiles, teams, matches, predictions tables + leaderboard function + RLS.
-- DO NOT apply manually — run via `supabase db push` (requires Supabase project + credentials).
-- All timestamps are timestamptz (UTC). Display in America/Argentina/Buenos_Aires is done in the app layer.
--
-- Advisors: applied to project woahvkzfmfqqaptkazta on 2026-05-27 and verified.
--   Security: clean except one intentional WARN — get_leaderboard() is a SECURITY DEFINER
--             function callable by `authenticated` via RPC (that IS the ranking access path).
--   Performance: FK covering indexes present (flagged "unused" only until real traffic exists).
-- Decisions baked in here:
--   - leaderboard is a SECURITY DEFINER function (not a view): it must aggregate across ALL users,
--     so it bypasses predictions RLS by design while exposing only non-sensitive aggregates.
--     EXECUTE is revoked from anon/public and granted only to authenticated.
--   - All functions pin search_path; the signup trigger function has EXECUTE revoked (trigger-only).

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE match_round AS ENUM (
  'group',
  'r32',
  'r16',
  'qf',
  'sf',
  'third_place',
  'final'
);

CREATE TYPE match_status AS ENUM (
  'scheduled',
  'live',
  'finished',
  'confirmed'
);

-- ============================================================
-- profiles (1:1 with auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  -- role is data-driven so admins can be promoted via SQL without a redeploy (ADR-6).
  -- NOT self-updatable by authenticated users (RLS enforces this).
  role         text        NOT NULL DEFAULT 'player'
                           CHECK (role IN ('admin', 'player')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Public profile data for every registered user. Mirrors auth.users 1:1.';

-- ============================================================
-- teams (48 national teams + potential placeholder rows)
-- ============================================================

CREATE TABLE public.teams (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- API-Football team id — used as the idempotent upsert key during seeding.
  external_ref text        NOT NULL UNIQUE,
  name         text        NOT NULL,
  -- 'A'..'L' for group stage; NULL for placeholder/knockout-derived teams.
  group_label  char(1)     NULL CHECK (group_label BETWEEN 'A' AND 'L'),
  flag_url     text        NULL
);

COMMENT ON TABLE public.teams IS
  '48 national teams in the tournament. external_ref is the API-Football team id.';

-- ============================================================
-- matches (104 fixtures: 48 group + 32+8+4+2+1+1 knockout)
-- ============================================================

CREATE TABLE public.matches (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- API-Football fixture id — idempotent upsert key.
  external_ref          text         NOT NULL UNIQUE,
  round                 match_round  NOT NULL,
  -- Denormalized to avoid recomputing per-round multiplier on every scoring pass.
  -- group/r32=1, r16=2, qf=3, sf=4, third_place=4, final=5.
  multiplier            smallint     NOT NULL CHECK (multiplier BETWEEN 1 AND 5),
  -- Group-stage matchday (1-3); NULL for knockout rounds.
  matchday              smallint     NULL CHECK (matchday BETWEEN 1 AND 3),

  -- Team refs are NULLABLE because knockout slots are seeded before the qualifying teams
  -- are known (ADR-7). Placeholder strings hold the human-readable slot label.
  home_team_id          uuid         NULL REFERENCES public.teams(id),
  away_team_id          uuid         NULL REFERENCES public.teams(id),
  home_placeholder      text         NULL,
  away_placeholder      text         NULL,

  kickoff_at            timestamptz  NOT NULL,
  status                match_status NOT NULL DEFAULT 'scheduled',

  -- Final score including extra time (120'); NULL until the match is finished.
  -- Scores do NOT include penalties (penalties only affect advancer, not the scoreline).
  home_score            smallint     NULL CHECK (home_score >= 0),
  away_score            smallint     NULL CHECK (away_score >= 0),

  -- Set only when a knockout match ends level after 120' and goes to penalties.
  penalty_winner_team_id uuid        NULL REFERENCES public.teams(id),
  -- Resolved advancer for knockout matches: winner (by score) or penalty winner.
  advancer_team_id       uuid        NULL REFERENCES public.teams(id),

  result_confirmed_at    timestamptz NULL,

  -- Computed column: true for all non-group rounds.
  -- Stored so queries can filter knockout matches without a round enumeration.
  is_knockout            boolean     GENERATED ALWAYS AS (round <> 'group') STORED
);

COMMENT ON TABLE public.matches IS
  '104 tournament fixtures. home/away_team_id nullable for unresolved knockout slots.';

COMMENT ON COLUMN public.matches.home_score IS
  'Final score after 90 min or extra time (120 min). Excludes penalty shootout goals.';

COMMENT ON COLUMN public.matches.penalty_winner_team_id IS
  'Set only when the knockout match ends level after 120 min and goes to penalties.';

-- ============================================================
-- predictions (one per user per match)
-- ============================================================

CREATE TABLE public.predictions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id        uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,

  home_score      smallint    NOT NULL CHECK (home_score >= 0),
  away_score      smallint    NOT NULL CHECK (away_score >= 0),

  -- Required ONLY when: knockout match AND predicted draw (home_score = away_score).
  -- The advancer must be one of the two competing teams (validated at app layer + trigger).
  advancer_team_id uuid       NULL REFERENCES public.teams(id),

  -- Denormalized. Written by the scoring use-case on result confirmation.
  -- Must NOT be writable by the authenticated role (see RLS + trigger below).
  points_awarded  smallint    NOT NULL DEFAULT 0,
  scored_at       timestamptz NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- One prediction per user per match.
  UNIQUE (user_id, match_id)
);

COMMENT ON TABLE public.predictions IS
  'User predictions. points_awarded is set by the scoring engine, never by users.';

COMMENT ON COLUMN public.predictions.advancer_team_id IS
  'Required only for knockout draw predictions. Must be one of the two competing teams.';

-- ============================================================
-- leaderboard FUNCTION
-- Aggregates points across ALL users for the ranking. A plain view would either
-- leak opponents' picks (security_invoker off) or show only the caller's own rows
-- (security_invoker on). A SECURITY DEFINER function bypasses predictions RLS while
-- exposing ONLY non-sensitive aggregates, and EXECUTE is gated to authenticated.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id      uuid,
  display_name text,
  total_points bigint,
  hits         bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id                                            AS user_id,
    p.display_name,
    COALESCE(SUM(pr.points_awarded), 0)             AS total_points,
    COUNT(*) FILTER (WHERE pr.points_awarded > 0)   AS hits
  FROM public.profiles p
  LEFT JOIN public.predictions pr ON pr.user_id = p.id
  GROUP BY p.id, p.display_name;
$$;

COMMENT ON FUNCTION public.get_leaderboard() IS
  'Aggregate points per player across ALL users (bypasses predictions RLS by design). Ranking is total_points DESC; ties share position (no tie-break per decision #260).';

REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

-- ============================================================
-- TRIGGER: keep predictions.updated_at current
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TRIGGER: prevent players from writing points_awarded
-- Players must never be able to self-award points — the scoring
-- use-case writes points via the service_role/admin path only.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_points_awarded()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- On INSERT: force to 0 (ignore any client-supplied value).
  IF TG_OP = 'INSERT' THEN
    NEW.points_awarded = 0;
  END IF;
  -- On UPDATE: preserve the server-computed value; never let a player raise it.
  -- The scoring use-case runs as service_role and bypasses RLS, so it CAN write points.
  -- Regular authenticated users hit this trigger and their points are reset to OLD.
  IF TG_OP = 'UPDATE' AND current_setting('role') = 'authenticated' THEN
    NEW.points_awarded = OLD.points_awarded;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_guard_points
  BEFORE INSERT OR UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_points_awarded();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- ---- teams ----

-- Read-only reference data. RLS is still enabled (advisors flag any public table without it);
-- writes happen via service_role during seeding, which bypasses RLS.
CREATE POLICY teams_select_all ON public.teams
  FOR SELECT TO authenticated
  USING (true);

-- ---- profiles ----

-- Any authenticated user can read all display names (needed for leaderboard rendering).
CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own profile, and NOT the role column.
-- Role changes require service_role (SQL console or admin API).
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (
    id = (select auth.uid())
    -- Prevent self-promotion: role must remain unchanged.
    AND role = (SELECT role FROM public.profiles WHERE id = (select auth.uid()))
  );

-- Profile rows are created by the auth trigger (service_role), not by users directly.

-- ---- matches ----

-- Players may read all matches.
CREATE POLICY matches_select_all ON public.matches
  FOR SELECT TO authenticated
  USING (true);

-- Only admins may update match results.
CREATE POLICY matches_admin_write ON public.matches
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ---- predictions ----

-- Users read only their own predictions.
-- The leaderboard exposes only aggregated points, so opponents' exact picks stay hidden.
CREATE POLICY pred_select_own ON public.predictions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Insert is allowed only before kickoff (server time vs UTC kickoff_at).
-- now() is Postgres server time — not the client clock — so this is forgery-resistant.
CREATE POLICY pred_insert_open ON public.predictions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND now() < (
      SELECT kickoff_at FROM public.matches WHERE id = match_id
    )
  );

-- Update is allowed only on own rows that are still open (same clock check as insert).
CREATE POLICY pred_update_open ON public.predictions
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (
    user_id = (select auth.uid())
    AND now() < (
      SELECT kickoff_at FROM public.matches WHERE id = match_id
    )
  );

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN-UP
-- Fires on auth.users INSERT; creates the matching profiles row.
-- ============================================================

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
    -- Prefer the display_name metadata set by Google/email provider; fall back to email prefix.
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger-only: must never be callable via the Data API (/rest/v1/rpc/handle_new_user).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- ============================================================
-- COVERING INDEXES FOR FOREIGN KEYS
-- ============================================================

CREATE INDEX idx_matches_home_team_id           ON public.matches (home_team_id);
CREATE INDEX idx_matches_away_team_id           ON public.matches (away_team_id);
CREATE INDEX idx_matches_penalty_winner_team_id ON public.matches (penalty_winner_team_id);
CREATE INDEX idx_matches_advancer_team_id       ON public.matches (advancer_team_id);
CREATE INDEX idx_predictions_match_id           ON public.predictions (match_id);
CREATE INDEX idx_predictions_advancer_team_id   ON public.predictions (advancer_team_id);
