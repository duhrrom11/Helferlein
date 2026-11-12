-- Applied to Helferlein production Supabase on 2026-11-12. Depends on 20261112070000_heir_invitations_private_schema.sql.
-- All RPCs restricted to service_role. Edge Function MUST verify caller JWT with auth.getUser.
BEGIN;
CREATE FUNCTION public.issue_heir_invitation_atomic(
 p_owner_user_id uuid, p_recipient_user_id uuid, p_token_hash_hex text,
 p_expires_at timestamptz
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
 IF p_owner_user_id IS NULL OR p_recipient_user_id IS NULL OR p_owner_user_id = p_recipient_user_id
    OR p_token_hash_hex IS NULL OR p_token_hash_hex !~ '^[a-f0-9]{64}$'
    OR p_expires_at IS NULL OR p_expires_at <= clock_timestamp()
    OR p_expires_at > clock_timestamp() + interval '7 days' THEN RETURN NULL; END IF;
 -- Serialize issuance by locking the owner row once (no lock upgrade).
 PERFORM 1 FROM public.vault_cloud_snapshots WHERE owner_user_id = p_owner_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 PERFORM 1 FROM auth.users WHERE id = p_recipient_user_id FOR KEY SHARE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 -- Existing assignment, including revoked assignments, blocks re-issue until separately reviewed.
 IF EXISTS (SELECT 1 FROM nachlass_private.heir_assignments
            WHERE owner_user_id = p_owner_user_id AND heir_user_id = p_recipient_user_id) THEN RETURN NULL; END IF;
 IF EXISTS (SELECT 1 FROM nachlass_private.heir_invitations
            WHERE owner_user_id = p_owner_user_id AND recipient_user_id = p_recipient_user_id
              AND revoked_at IS NULL AND accepted_at IS NULL AND expires_at > clock_timestamp())
 THEN RETURN NULL; END IF;
 INSERT INTO nachlass_private.heir_invitations(owner_user_id,recipient_user_id,token_hash_hex,expires_at)
 VALUES(p_owner_user_id,p_recipient_user_id,p_token_hash_hex,p_expires_at) RETURNING id INTO v_id;
 RETURN v_id;
EXCEPTION WHEN unique_violation OR foreign_key_violation THEN RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.issue_heir_invitation_atomic(uuid,uuid,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_heir_invitation_atomic(uuid,uuid,text,timestamptz) TO service_role;

CREATE FUNCTION public.revoke_heir_invitation_atomic(
 p_owner_user_id uuid, p_invitation_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_inv nachlass_private.heir_invitations%ROWTYPE;
BEGIN
 IF p_owner_user_id IS NULL OR p_invitation_id IS NULL THEN RETURN false; END IF;
 -- Lock owner before invitation to match issuance and redemption.
 PERFORM 1 FROM public.vault_cloud_snapshots WHERE owner_user_id = p_owner_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO v_inv FROM nachlass_private.heir_invitations
  WHERE id = p_invitation_id AND owner_user_id = p_owner_user_id FOR UPDATE;
 IF NOT FOUND OR v_inv.revoked_at IS NOT NULL THEN RETURN false; END IF;
 -- Accepted invitations are revoked through the assignment, too; no vault access granted here.
 UPDATE nachlass_private.heir_assignments SET revoked_at = clock_timestamp()
 WHERE invitation_id = v_inv.id AND owner_user_id = p_owner_user_id AND revoked_at IS NULL;
 UPDATE nachlass_private.heir_invitations SET revoked_at = clock_timestamp() WHERE id = v_inv.id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.revoke_heir_invitation_atomic(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_heir_invitation_atomic(uuid,uuid) TO service_role;
-- Accepted invitations may be revoked: schema deliberately has no
-- mutually-exclusive accepted_at/revoked_at CHECK constraint.
COMMIT;