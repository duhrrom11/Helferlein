-- EPHEMERAL CI DATABASE ONLY. This grants no role in the production Supabase project.
\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database() <> 'helferlein_heir_ci' THEN RAISE EXCEPTION 'CI-only SQL'; END IF;
END $$;
CREATE ROLE heir_ci_backend LOGIN PASSWORD 'test-server-role-local-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA heir_private TO heir_ci_backend;
GRANT USAGE ON SCHEMA auth TO heir_ci_backend;
GRANT SELECT(id,user_id) ON auth.sessions TO heir_ci_backend;
CREATE POLICY heir_ci_active_sessions ON auth.sessions FOR SELECT TO heir_ci_backend USING (true);
-- Explicit allowlist; future private tables do not silently inherit grants.
GRANT SELECT,INSERT,UPDATE ON
  heir_private.heir_invitations,
  heir_private.heir_assignments,
  heir_private.heir_public_keys,
  heir_private.heir_envelopes,
  heir_private.heir_key_proofs,
  heir_private.heir_release_cases,
  heir_private.heir_http_limits
TO heir_ci_backend;
GRANT SELECT(owner_user_id,vault_id) ON public.vault_cloud_snapshots TO heir_ci_backend;
-- SELECT FOR UPDATE requires UPDATE privileges. Only a non-secret bookkeeping
-- column may be updated; no encrypted_data or keys can be modified by this role.
GRANT UPDATE(updated_at) ON public.vault_cloud_snapshots TO heir_ci_backend;
CREATE POLICY heir_ci_snapshot_select ON public.vault_cloud_snapshots FOR SELECT TO heir_ci_backend USING (true);
CREATE POLICY heir_ci_snapshot_lock ON public.vault_cloud_snapshots FOR UPDATE TO heir_ci_backend USING (true) WITH CHECK (true);
CREATE POLICY heir_ci_invitations ON heir_private.heir_invitations TO heir_ci_backend USING(true) WITH CHECK(true);
CREATE POLICY heir_ci_assignments ON heir_private.heir_assignments TO heir_ci_backend USING(true) WITH CHECK(true);
CREATE POLICY heir_ci_public_keys ON heir_private.heir_public_keys TO heir_ci_backend USING(true) WITH CHECK(true);
CREATE POLICY heir_ci_envelopes ON heir_private.heir_envelopes TO heir_ci_backend USING(true) WITH CHECK(true);
CREATE POLICY heir_ci_key_proofs ON heir_private.heir_key_proofs TO heir_ci_backend USING(true) WITH CHECK(true);
CREATE POLICY heir_ci_release_cases ON heir_private.heir_release_cases TO heir_ci_backend USING(true) WITH CHECK(true);
-- The server role is not a login for clients, and cannot modify the RLS schema.

-- CI-only API throttle privilege: private and RLS-enforced.
CREATE POLICY heir_ci_http_limits ON heir_private.heir_http_limits TO heir_ci_backend USING(true) WITH CHECK(true);
