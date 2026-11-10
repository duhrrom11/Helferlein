-- REVIEW-ONLY: intended RLS policies for isolated nachlass_v2 schema.
-- Not executed, not deployed, and no browser grants are added here.
-- Requires an isolated PostgreSQL integration test with authenticated JWT claims
-- and an audited deployment plan before applying.
--
-- Owner may SELECT own encrypted vault, but not change release state directly.
create policy vault_owner_select on nachlass_v2.vaults
  for select to authenticated using ((select auth.uid()) = owner_user_id);

-- Owner may see memberships for their own vault. Heirs can see only their
-- own membership; never expose other heirs' identities.
create policy membership_select on nachlass_v2.heir_memberships
  for select to authenticated
  using (
    heir_user_id = (select auth.uid())
    or exists (
      select 1 from nachlass_v2.vaults v
      where v.id = vault_id and v.owner_user_id = (select auth.uid())
    )
  );

-- Heir can SELECT their own encrypted envelope only after RELEASED, while
-- membership is active and identity-verified. No envelope access via URL ID.
create policy released_envelope_select on nachlass_v2.heir_envelopes
  for select to authenticated
  using (
    heir_user_id = (select auth.uid())
    and exists (
      select 1 from nachlass_v2.heir_memberships m
      join nachlass_v2.vaults v on v.id = m.vault_id
      where m.vault_id = heir_envelopes.vault_id
        and m.heir_user_id = (select auth.uid())
        and m.status = 'ACTIVE'
        and m.identity_verified is true
        and v.state = 'RELEASED'
    )
  );
-- No INSERT/UPDATE/DELETE policies for authenticated.
-- WARNING: the parent schema proposal revokes authenticated schema/table
-- privileges, so these policies alone do not grant access.
-- Server mutations require separate transaction-safe authorization.
