-- REVIEW ONLY. DO NOT APPLY. No production deployment authorization.
-- Prerequisites: separate audited NOLOGIN function owner, dedicated LOGIN
-- execution role, reviewed ownership/RLS, and transactional revocation tests.
-- This SQL is intentionally NOT a migration.
BEGIN;
CREATE FUNCTION nachlass_v2.read_heir_envelope_trusted(
  p_vault_id text, p_verified_user_id uuid
) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT e.encrypted_envelope
  FROM nachlass_v2.vaults AS v
  JOIN nachlass_v2.heir_memberships AS m ON m.vault_id = v.id
  JOIN nachlass_v2.heir_envelopes AS e
    ON e.vault_id = m.vault_id AND e.heir_user_id = m.heir_user_id
  WHERE v.id = p_vault_id
    AND p_vault_id ~ '^v_[A-Za-z0-9_-]{8,128}$'
    AND m.heir_user_id = p_verified_user_id
    AND v.owner_user_id <> p_verified_user_id
    AND v.state = 'RELEASED'
    AND m.status = 'ACTIVE'
    AND m.identity_verified IS TRUE
  FOR SHARE OF v, m, e
$function$;
-- CREATE (not OR REPLACE): existing function privileges must never be inherited.
-- Default PUBLIC EXECUTE must be removed in the same transaction as CREATE.
REVOKE ALL ON FUNCTION nachlass_v2.read_heir_envelope_trusted(text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
-- No GRANT here. A dedicated server-only execution role must be independently
-- created and audited before any narrowly scoped GRANT EXECUTE and USAGE.
ROLLBACK; -- Prevent accidental application as-is; never a deployment script.
