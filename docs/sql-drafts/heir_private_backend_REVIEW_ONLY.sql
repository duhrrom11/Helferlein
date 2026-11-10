-- REVIEW ONLY. NEVER EXECUTE OR DEPLOY IN PRODUCTION.
-- PostgreSQL 17 staging schema, not in supabase/migrations.
-- Requires isolated PG17 integration tests, role/ownership/EXECUTE audit,
-- protocol review, and an explicit migration release decision.
-- No public functions, no grants, no synthetic production data.
-- Backend uses public.vault_cloud_snapshots.owner_user_id as the owner lock.
BEGIN;
CREATE SCHEMA heir_private;
REVOKE ALL ON SCHEMA heir_private FROM PUBLIC, anon, authenticated;

CREATE TABLE heir_private.heir_invitations (
  invitation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.vault_cloud_snapshots(owner_user_id) ON DELETE RESTRICT,
  vault_id text NOT NULL CHECK (vault_id ~ '^v_[A-Za-z0-9_-]{8,80}$'),
  intended_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  UNIQUE (invitation_id, owner_user_id, intended_user_id),
  CONSTRAINT heir_invite_time CHECK (expires_at > created_at),
  CONSTRAINT heir_invite_accept_time CHECK (accepted_at IS NULL OR accepted_at >= created_at),
  CONSTRAINT heir_invite_exclusive CHECK (accepted_at IS NULL OR revoked_at IS NULL),
  CONSTRAINT heir_invite_no_self CHECK (owner_user_id <> intended_user_id)
);
CREATE INDEX heir_invitation_owner_idx ON heir_private.heir_invitations(owner_user_id, expires_at);

CREATE TABLE heir_private.heir_assignments (
  owner_user_id uuid NOT NULL,
  heir_user_id uuid NOT NULL,
  invitation_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (owner_user_id, heir_user_id),
  FOREIGN KEY (invitation_id,owner_user_id,heir_user_id)
    REFERENCES heir_private.heir_invitations(invitation_id,owner_user_id,intended_user_id)
    ON DELETE RESTRICT,
  CONSTRAINT heir_assignment_status CHECK (
    (status='active' AND revoked_at IS NULL) OR
    (status='revoked' AND revoked_at IS NOT NULL)
  )
);

-- Key enrollment/attestation is intentionally NOT provided by this package.
-- Only an independently verified heir public key may receive an envelope.
CREATE TABLE heir_private.heir_public_keys (
  key_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heir_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  suite text NOT NULL CHECK (suite = 'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM'),
  public_key bytea NOT NULL CHECK (octet_length(public_key)=32),
  fingerprint bytea NOT NULL CHECK (octet_length(fingerprint)=32),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  verified_at timestamptz,
  revoked_at timestamptz,
  UNIQUE (heir_user_id,key_id),
  UNIQUE (heir_user_id,fingerprint),
  CONSTRAINT heir_verified_not_revoked CHECK (verified_at IS NULL OR verified_at >= created_at)
);

CREATE TABLE heir_private.heir_envelopes (
  owner_user_id uuid NOT NULL,
  heir_user_id uuid NOT NULL,
  key_id uuid NOT NULL,
  assignment_version bigint NOT NULL CHECK (assignment_version > 0),
  suite text NOT NULL CHECK (suite = 'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM'),
  encapsulated_key bytea NOT NULL CHECK (octet_length(encapsulated_key)=32),
  wrapped_dek bytea NOT NULL CHECK (octet_length(wrapped_dek) BETWEEN 48 AND 4096),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  PRIMARY KEY (owner_user_id,heir_user_id),
  FOREIGN KEY (owner_user_id,heir_user_id)
    REFERENCES heir_private.heir_assignments(owner_user_id,heir_user_id) ON DELETE RESTRICT,
  FOREIGN KEY (heir_user_id,key_id)
    REFERENCES heir_private.heir_public_keys(heir_user_id,key_id) ON DELETE RESTRICT
);

-- Private staging schema, no browser/API SELECT/INSERT/UPDATE/DELETE.
ALTER TABLE heir_private.heir_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_public_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_public_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_envelopes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA heir_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA heir_private FROM PUBLIC, anon, authenticated;
-- IMPORTANT: No GRANT for any server role yet. Missing privileged role &
-- transaction adapter mean that this is intentionally NONEXECUTABLE as a live API.
-- In isolated PG17: inspect existing privileges, role membership, bypassrls,
-- schema CREATE rights, table owner, clock/row locks, duplicate redemption,
-- concurrent revoke vs putEnvelope, and user-owned key proof of possession.
COMMIT;
