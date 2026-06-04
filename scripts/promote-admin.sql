-- ============================================================
-- promote-admin.sql — grant the 'admin' role to a real user by email.
-- ------------------------------------------------------------
-- The `role` column on public.profiles is data-driven (ADR-6): admins are
-- promoted via SQL, never from the app. The matching profile row is created by
-- the on_auth_user_created trigger the FIRST time the user logs in — so this
-- script only takes effect AFTER that user has signed in at least once.
--
-- Run as the postgres superuser (bypasses RLS + the profiles role guard):
--   docker exec -i supabase_db_prode psql -U postgres -d postgres < scripts/promote-admin.sql
--
-- Override the target email:
--   docker exec -i supabase_db_prode psql -U postgres -d postgres \
--     -v admin_email="otro@correo.com" < scripts/promote-admin.sql
--
-- Idempotent. Lost on `supabase db reset` (re-run after logging in again).
-- ============================================================

\if :{?admin_email}
\else
  \set admin_email 'santiagopacini@gmail.com'
\endif

UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE u.id = p.id
  AND lower(u.email) = lower(:'admin_email');

-- Confirmation. An EMPTY result means that email has not logged in yet:
-- sign in through the app once, then re-run this script.
SELECT u.email, p.display_name, p.role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(u.email) = lower(:'admin_email');
