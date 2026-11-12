-- Owner-only invitation overview. No token or vault contents are returned.
BEGIN;
CREATE FUNCTION public.list_heir_invitations_atomic(p_owner_user_id uuid)
RETURNS TABLE(invitation_id uuid, recipient_user_id uuid, status text, expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT i.id, i.recipient_user_id,
    CASE WHEN i.revoked_at IS NOT NULL THEN 'revoked'
         WHEN i.accepted_at IS NOT NULL THEN 'accepted'
         WHEN i.expires_at <= clock_timestamp() THEN 'expired'
         ELSE 'pending' END,
    i.expires_at
  FROM nachlass_private.heir_invitations i
  WHERE i.owner_user_id = p_owner_user_id
    AND EXISTS (SELECT 1 FROM public.vault_cloud_snapshots s WHERE s.owner_user_id = p_owner_user_id)
  ORDER BY i.created_at DESC, i.id DESC
  LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.list_heir_invitations_atomic(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_heir_invitations_atomic(uuid) TO service_role;
COMMIT;
