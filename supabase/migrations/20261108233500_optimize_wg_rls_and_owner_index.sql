-- Applied to production project alltagshelfer on 2026-11-08.
-- Cover owner_id foreign key and consolidate equivalent permissive WG policies.
-- No user data or vault records are modified.
BEGIN;
CREATE INDEX IF NOT EXISTS wg_members_owner_idx ON public.wg_members (owner_id);
CREATE POLICY wg_spaces_owner_or_member_select ON public.wg_spaces FOR SELECT TO authenticated
USING (
  owner_id = (SELECT auth.uid()) OR
  EXISTS (SELECT 1 FROM public.wg_members m WHERE m.wg_id = wg_spaces.id AND m.user_id = (SELECT auth.uid()))
);
CREATE POLICY wg_spaces_owner_or_member_update ON public.wg_spaces FOR UPDATE TO authenticated
USING (
  owner_id = (SELECT auth.uid()) OR
  EXISTS (SELECT 1 FROM public.wg_members m WHERE m.wg_id = wg_spaces.id AND m.user_id = (SELECT auth.uid()))
)
WITH CHECK (
  owner_id = (SELECT auth.uid()) OR
  EXISTS (SELECT 1 FROM public.wg_members m WHERE m.wg_id = wg_spaces.id AND m.user_id = (SELECT auth.uid()))
);
DROP POLICY wg_spaces_owner_select ON public.wg_spaces;
DROP POLICY wg_spaces_member_select ON public.wg_spaces;
DROP POLICY wg_spaces_owner_update ON public.wg_spaces;
DROP POLICY wg_spaces_member_update ON public.wg_spaces;
COMMIT;
