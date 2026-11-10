-- Applied to production alltagshelfer on 2026-11-08.
-- WG membership is managed by INSERT/DELETE; no UPDATE RLS policy exists.
-- Avoid exposing an unused UPDATE privilege to authenticated clients.
REVOKE UPDATE ON public.wg_members FROM authenticated;
