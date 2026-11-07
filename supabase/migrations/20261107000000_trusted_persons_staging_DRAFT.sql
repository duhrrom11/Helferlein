-- Helferlein staging ONLY: DRAFT, DO NOT EXECUTE without review.
-- No production deployment. No seed data. No triggers or email.
-- This migration intentionally grants no client access.
BEGIN;

CREATE TABLE public.trusted_person_invitations (
  invitation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id text NOT NULL CHECK (length(vault_id) BETWEEN 1 AND 200),
  invited_by_user_id uuid NOT NULL,
  intended_user_id uuid NOT NULL,
  token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  expires_at timestamptz NOT NULL,
  accepted_by_user_id uuid,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitation_acceptance_consistent CHECK (
    (accepted_at IS NULL AND accepted_by_user_id IS NULL)
    OR (accepted_at IS NOT NULL AND accepted_by_user_id = intended_user_id)
  ),
  CONSTRAINT invitation_not_accepted_and_revoked CHECK (
    accepted_at IS NULL OR revoked_at IS NULL
  ),
  CONSTRAINT invitation_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX trusted_person_invitations_vault_idx
  ON public.trusted_person_invitations (vault_id);
CREATE INDEX trusted_person_invitations_intended_idx
  ON public.trusted_person_invitations (intended_user_id);

CREATE TABLE public.vault_trusted_persons (
  vault_id text NOT NULL CHECK (length(vault_id) BETWEEN 1 AND 200),
  trusted_user_id uuid NOT NULL,
  invitation_id uuid NOT NULL REFERENCES public.trusted_person_invitations(invitation_id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (vault_id, trusted_user_id),
  CONSTRAINT trusted_person_revocation_consistent CHECK (
    (status = 'active' AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX vault_trusted_persons_invitation_idx
  ON public.vault_trusted_persons (invitation_id);

ALTER TABLE public.trusted_person_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_trusted_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_person_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vault_trusted_persons FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.trusted_person_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.vault_trusted_persons FROM PUBLIC, anon, authenticated;

-- No RLS policies. No direct API read/write for browser roles.
-- Application-side atomic acceptance, owner validation, token generation,
-- token hashing, audit and rate limits are NOT implemented here.
-- Before execution: review existing schema, permissions, FK/ownership checks,
-- race handling and migration rollback in isolated staging.
COMMIT;
