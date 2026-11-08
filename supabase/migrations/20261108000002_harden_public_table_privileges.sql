-- Applied to production Supabase project alltagshelfer on 2026-11-08.
-- Security hardening: remove privileges that bypass or exceed normal row-level access.
-- No table rows or RLS policies were modified.
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON TABLE public.user_data FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_data FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON TABLE public.wg_spaces, public.wg_members FROM anon, authenticated;
