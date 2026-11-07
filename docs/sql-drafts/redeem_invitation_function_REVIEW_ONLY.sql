-- REVIEW ONLY. NEVER RUN OR DEPLOY AS-IS.
-- Staging-only PostgreSQL function candidate. Requires security review,
-- matching table DDL, role/grant audit and synthetic concurrency tests.
-- Depends on trusted_persons_staging_DRAFT.sql (NOT installed).
-- Not in supabase/migrations. No production changes.
--
-- Caller MUST be a trusted server that first verifies the user's JWT via
-- Supabase auth.getUser. The UUID argument is NOT itself authentication.
-- Never grant EXECUTE to anon/authenticated/PUBLIC.
--
-- Function executes as owner (SECURITY DEFINER): audit function ownership,
-- search_path, RLS/FORCE RLS behavior and service_role capabilities before use.
CREATE OR REPLACE FUNCTION public.redeem_trusted_person_invitation_internal(
  p_verified_user_id uuid,
  p_token_hash bytea
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inv public.trusted_person_invitations%ROWTYPE;
  v_owner uuid;
  v_time timestamptz;
BEGIN
  IF p_verified_user_id IS NULL OR p_token_hash IS NULL
     OR octet_length(p_token_hash) <> 32 THEN
    RETURN false;
  END IF;

  -- Serializes all redemptions of this token; revocation must lock same row.
  SELECT * INTO v_inv
    FROM public.trusted_person_invitations
    WHERE token_hash = p_token_hash
    FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  v_time := clock_timestamp();
  IF v_inv.intended_user_id IS DISTINCT FROM p_verified_user_id
     OR v_inv.accepted_at IS NOT NULL
     OR v_inv.revoked_at IS NOT NULL
     OR v_inv.expires_at IS NULL
     OR v_inv.expires_at <= v_time THEN
    RETURN false;
  END IF;

  -- Ownership transfers MUST lock this same row in compatible order.
  SELECT owner_user_id INTO v_owner
    FROM public.vault_ownership
    WHERE vault_id = v_inv.vault_id
    FOR UPDATE;
  IF NOT FOUND OR v_owner IS DISTINCT FROM v_inv.invited_by_user_id THEN
    RETURN false;
  END IF;

  -- Do not resurrect a revoked or existing trusted-person assignment.
  IF EXISTS (
    SELECT 1 FROM public.vault_trusted_persons
    WHERE vault_id = v_inv.vault_id
      AND trusted_user_id = p_verified_user_id
  ) THEN RETURN false; END IF;

  INSERT INTO public.vault_trusted_persons
    (vault_id, trusted_user_id, invitation_id, status)
  VALUES (v_inv.vault_id, p_verified_user_id, v_inv.invitation_id, 'active');

  UPDATE public.trusted_person_invitations
     SET accepted_by_user_id = p_verified_user_id,
         accepted_at = clock_timestamp()
   WHERE invitation_id = v_inv.invitation_id
     AND accepted_at IS NULL AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'redemption_state_changed';
  END IF;
  RETURN true;
  -- PostgreSQL rolls back the entire invoking transaction on uncaught errors.
  -- Caller must treat unique violations/errors as generic denial; no retries
  -- that silently reactivate existing assignments.
END;
$$;

-- REVOKE must be part of the SAME deployment transaction as CREATE FUNCTION.
REVOKE ALL ON FUNCTION public.redeem_trusted_person_invitation_internal(uuid, bytea)
  FROM PUBLIC, anon, authenticated;
-- Deliberately no GRANT. Explicitly authorize only a reviewed internal role.
--
-- OPEN SECURITY BLOCKERS:
-- 1. This is not yet authenticated end-to-end. A privileged caller could
--    impersonate any UUID. Require trusted server auth.getUser and a
--    restricted non-browser execution role.
-- 2. Confirm vault_ownership schema and ownership-change locking contract.
-- 3. Audit SECURITY DEFINER owner, schema CREATE rights and RLS bypass.
-- 4. Add audit/rate limits and uniform error responses outside the function.
-- 5. Test rollback, revocation races, concurrent redemption and expiry.
-- 6. Review whether all privileged write paths preserve accepted-state FK.
