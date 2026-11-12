-- Versioned migration draft. NOT EXECUTED; deployment requires separate approval.
-- Existing verified production anchor: public.vault_cloud_snapshots(owner_user_id uuid PK).
-- Invitations are issued only for an EXISTING registered recipient UUID.
-- No heir access to vault_cloud_snapshots is granted by this migration.
BEGIN;
CREATE SCHEMA IF NOT EXISTS nachlass_private;
REVOKE ALL ON SCHEMA nachlass_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS nachlass_private.heir_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.vault_cloud_snapshots(owner_user_id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash_hex text NOT NULL UNIQUE CHECK (token_hash_hex ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (owner_user_id <> recipient_user_id),
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS heir_invitations_owner_idx ON nachlass_private.heir_invitations(owner_user_id);
CREATE TABLE IF NOT EXISTS nachlass_private.heir_assignments (
  owner_user_id uuid NOT NULL REFERENCES public.vault_cloud_snapshots(owner_user_id) ON DELETE CASCADE,
  heir_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL UNIQUE REFERENCES nachlass_private.heir_invitations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (owner_user_id, heir_user_id),
  CHECK (owner_user_id <> heir_user_id)
);
ALTER TABLE nachlass_private.heir_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nachlass_private.heir_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA nachlass_private FROM PUBLIC, anon, authenticated;

-- One transaction: lock invitation, verify recipient, owner still exists,
-- expiry and revocation, no previous assignment, insert and accept.
-- This function must be owned by a trusted migration role; only service_role may EXECUTE.
CREATE OR REPLACE FUNCTION public.redeem_heir_invitation_atomic(
  p_token_hash_hex text, p_verified_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_inv nachlass_private.heir_invitations%ROWTYPE;
BEGIN
  IF p_verified_user_id IS NULL OR p_token_hash_hex IS NULL
     OR p_token_hash_hex !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  SELECT * INTO v_inv FROM nachlass_private.heir_invitations
   WHERE token_hash_hex = p_token_hash_hex FOR UPDATE;
  IF NOT FOUND OR v_inv.recipient_user_id <> p_verified_user_id
     OR v_inv.revoked_at IS NOT NULL OR v_inv.accepted_at IS NOT NULL
     OR v_inv.expires_at <= clock_timestamp() THEN RETURN false; END IF;
  -- Lock owner row to serialize owner deletion against redemption.
  PERFORM 1 FROM public.vault_cloud_snapshots
   WHERE owner_user_id = v_inv.owner_user_id FOR KEY SHARE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM nachlass_private.heir_assignments
             WHERE owner_user_id = v_inv.owner_user_id AND heir_user_id = p_verified_user_id)
  THEN RETURN false; END IF;
  INSERT INTO nachlass_private.heir_assignments(owner_user_id, heir_user_id, invitation_id)
    VALUES(v_inv.owner_user_id, p_verified_user_id, v_inv.id);
  UPDATE nachlass_private.heir_invitations SET accepted_at = clock_timestamp()
    WHERE id = v_inv.id AND accepted_at IS NULL AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'redemption_conflict'; END IF;
  RETURN true;
EXCEPTION WHEN unique_violation OR foreign_key_violation THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_heir_invitation_atomic(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_heir_invitation_atomic(text,uuid) TO service_role;
COMMIT;