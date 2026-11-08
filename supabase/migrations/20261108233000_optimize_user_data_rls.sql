-- Applied to production project alltagshelfer on 2026-11-08.
-- Optimize per-row auth.uid() evaluation without changing ownership semantics.
-- Preserve the existing SELECT/INSERT/UPDATE/DELETE policy names and grants.
BEGIN;
ALTER POLICY "Users can read own data" ON public.user_data
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert own data" ON public.user_data
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update own data" ON public.user_data
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can delete own data" ON public.user_data
  USING ((SELECT auth.uid()) = user_id);
COMMIT;
