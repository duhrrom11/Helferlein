-- REVIEW ONLY / NOT DEPLOYED. Run only after both existing heir_private SQL drafts
-- in the isolated PG17 test database. Do not add to supabase/migrations.
BEGIN;
CREATE TABLE heir_private.heir_http_limits (
  identity_hash bytea NOT NULL CHECK (octet_length(identity_hash) = 32),
  route text NOT NULL CHECK (length(route) BETWEEN 1 AND 120),
  window_start timestamptz NOT NULL,
  hits integer NOT NULL CHECK (hits >= 1),
  PRIMARY KEY(identity_hash, route)
);
ALTER TABLE heir_private.heir_http_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE heir_private.heir_http_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON heir_private.heir_http_limits FROM PUBLIC, anon, authenticated;
-- No GRANT to a server role here. The reviewed restricted runtime principal
-- must be specifically granted SELECT/INSERT/UPDATE under explicit RLS policies.
-- Expired rows require a vetted retention-cleanup strategy before deployment.
COMMIT;
