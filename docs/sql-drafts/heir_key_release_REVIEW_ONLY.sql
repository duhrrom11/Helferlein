-- REVIEW ONLY. DO NOT EXECUTE, MIGRATE OR DEPLOY AS-IS.
-- Staging-only extension of heir_private_backend_REVIEW_ONLY.sql.
-- Requires isolated PostgreSQL 17 with two sessions, privilege/RLS audit,
-- verified actual vault snapshot shape, transaction ownership review,
-- restricted server-only role and a separately approved release policy.
-- No browser endpoints, table grants or production data changes.
BEGIN;

-- Heir proves possession of the exact X25519 private key registered under
-- heir_private.heir_public_keys. Only expected SHA256(proof) is persisted;
-- ephemeral server private key, ECDH shared secret and proof are never stored.
CREATE TABLE heir_private.heir_key_proofs (
  challenge_id uuid PRIMARY KEY,
  key_id uuid NOT NULL,
  heir_user_id uuid NOT NULL,
  expected_hash bytea NOT NULL CHECK (octet_length(expected_hash) = 32),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CONSTRAINT heir_key_proof_key_fk FOREIGN KEY (heir_user_id,key_id)
    REFERENCES heir_private.heir_public_keys(heir_user_id,key_id)
    ON DELETE RESTRICT,
  CONSTRAINT heir_key_proof_ttl CHECK (expires_at > created_at),
  CONSTRAINT heir_key_proof_consumption CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);
CREATE INDEX heir_key_proofs_expiration_idx
  ON heir_private.heir_key_proofs(expires_at) WHERE consumed_at IS NULL;

-- 'grace' is only an ALARM state. Elapsed grace does NOT grant heir access.
-- An independent, legally reviewed approval path is NOT implemented.
-- owner_user_id is the real primary key of vault_cloud_snapshots.
CREATE TABLE heir_private.heir_release_cases (
  owner_user_id uuid PRIMARY KEY REFERENCES public.vault_cloud_snapshots(owner_user_id)
    ON DELETE RESTRICT,
  triggered_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  state text NOT NULL CHECK (state IN ('grace','cancelled')),
  triggered_at timestamptz NOT NULL,
  grace_until timestamptz NOT NULL,
  cancelled_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT heir_grace_after_alarm CHECK (grace_until >= triggered_at + interval '24 hours'),
  CONSTRAINT heir_cancel_consistency CHECK (
    (state='grace' AND cancelled_at IS NULL)
    OR (state='cancelled' AND cancelled_at IS NOT NULL)
  )
);

ALTER TABLE heir_private.heir_key_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_key_proofs FORCE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_release_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_release_cases FORCE ROW LEVEL SECURITY;
REVOKE ALL ON heir_private.heir_key_proofs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON heir_private.heir_release_cases FROM PUBLIC, anon, authenticated;

-- NO GRANT to any service role; NO RPC/SECURITY DEFINER; NO data insertion.
-- An isolated PG17 integration test must validate that INSERT/UPDATE/SELECT
-- are truly available ONLY to a narrowly authorized server principal, not
-- browser roles, and that real lock ordering and races are safe.
COMMIT;
