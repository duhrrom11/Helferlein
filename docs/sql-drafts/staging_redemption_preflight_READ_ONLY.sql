-- STAGING ONLY: read-only preflight for invitation redemption.
-- Target project: ojfoijljykjhveejvkfx (Helferlein-Test).
-- Run manually in that project's SQL editor ONLY after checking project identity.
-- No DDL, DML, grants, secrets, or production access.
-- Output is evidence for review, NOT permission to deploy the redemption RPC.
BEGIN READ ONLY;

SELECT current_database() AS database_name,
       current_user AS executing_role,
       current_setting('search_path') AS search_path;

-- Check whether the three expected tables and RPC exist.
SELECT object_name, to_regclass(object_name) IS NOT NULL AS exists_in_database
FROM (VALUES
  ('public.vault_ownership'),
  ('public.trusted_person_invitations'),
  ('public.vault_trusted_persons')
) AS objects(object_name);

SELECT to_regprocedure(
  'public.redeem_trusted_person_invitation_internal(uuid,bytea)'
) AS existing_redemption_function;

-- Show actual table columns and constraints, not guessed schemas.
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('vault_ownership','trusted_person_invitations','vault_trusted_persons')
ORDER BY table_name, ordinal_position;

SELECT c.conrelid::regclass AS table_name, c.conname, c.contype,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid IN (
  to_regclass('public.vault_ownership'),
  to_regclass('public.trusted_person_invitations'),
  to_regclass('public.vault_trusted_persons')
)
ORDER BY table_name::text, c.conname;

-- Audit every explicit function EXECUTE grant and PUBLIC defaults.
-- A SECURITY DEFINER RPC accepting a user UUID is unsafe when any
-- untrusted role can invoke it. Inherited role membership needs separate review.
SELECT p.oid::regprocedure AS function_signature,
       p.prosecdef AS security_definer,
       p.proowner::regrole AS owner_role,
       p.proconfig AS function_settings,
       COALESCE(grantee.rolname, 'PUBLIC') AS grantee,
       acl.privilege_type,
       acl.is_grantable
FROM pg_proc p
CROSS JOIN LATERAL aclexplode(
  COALESCE(p.proacl, acldefault('f', p.proowner))
) acl
LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
WHERE p.oid = to_regprocedure(
  'public.redeem_trusted_person_invitation_internal(uuid,bytea)'
)
ORDER BY grantee, acl.privilege_type;

-- Check RLS posture and policies on relevant tables.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('vault_ownership','trusted_person_invitations','vault_trusted_persons');

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('vault_ownership','trusted_person_invitations','vault_trusted_persons')
ORDER BY tablename, policyname;

ROLLBACK;
