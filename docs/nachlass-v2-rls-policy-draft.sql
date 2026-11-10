-- REVIEW ONLY: fail-closed policy boundary for the isolated nachlass_v2 schema.
-- NOT a deployment migration. Do not apply to production.
-- Resolves cross-table RLS recursion/visibility by NOT granting direct heir
-- SELECT access to either memberships or encrypted envelopes.
-- All heir reads MUST pass through an independently reviewed server endpoint:
-- verify JWT with Supabase Auth getUser(token), load trusted membership and
-- release state in one transaction, check revocation, return only the
-- requesting heir's encrypted envelope. Never expose service_role to clients.
--
-- Prerequisite: docs/nachlass-v2-isolated-rls-proposal.sql
-- The prerequisite revokes ALL schema/table privileges from authenticated;
-- the owner policy below does not by itself grant SELECT or expose the schema.
-- Review privileges and JWT claims in an isolated DB before deployment.

create policy vault_owner_select on nachlass_v2.vaults
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

-- No authenticated SELECT policy on heir_memberships or heir_envelopes.
-- No authenticated INSERT, UPDATE, DELETE policies on any of these tables.
-- The separate server authorization layer must also enforce ownership,
-- state transitions, audit, idempotency, and transaction-safe release.
