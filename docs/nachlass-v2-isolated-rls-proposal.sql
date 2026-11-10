-- Nachlass v2: REVIEW-ONLY RLS proposal. DO NOT execute on production.
-- Separate from existing public.vault_cloud_snapshots. No migration or grants.
-- SECURITY REVIEW: This schema has no owner/heir SELECT policies by design.
-- It is NOT a functioning heir portal and MUST NOT be applied as a migration.
-- Before any deployment: use an isolated DB, confirm schema exposure settings,
-- review role grants/default privileges and service_role/BYPASSRLS paths,
-- test authenticated/anon cross-user access and release/revocation races.
-- CREATE SCHEMA IF NOT EXISTS is not safe as a general-purpose migration on
-- an existing schema; review ownership and pre-existing objects first.
begin;
create schema if not exists nachlass_v2;
create table if not exists nachlass_v2.vaults (
  id text primary key check (id ~ '^v_[A-Za-z0-9_-]{8,128}$'),
  owner_user_id uuid not null references auth.users(id),
  state text not null default 'LOCKED' check (state in ('LOCKED','ALARM_PENDING','RELEASED','CANCELLED','REVOKED')),
  encrypted_data jsonb not null,
  version bigint not null default 0 check (version >= 0)
);
create table if not exists nachlass_v2.heir_memberships (
  vault_id text not null references nachlass_v2.vaults(id) on delete cascade,
  heir_user_id uuid not null references auth.users(id),
  status text not null default 'INVITED' check (status in ('INVITED','ACTIVE','REVOKED')),
  identity_verified boolean not null default false,
  primary key (vault_id, heir_user_id)
);
create table if not exists nachlass_v2.heir_envelopes (
  vault_id text not null,
  heir_user_id uuid not null,
  encrypted_envelope jsonb not null,
  primary key (vault_id, heir_user_id),
  foreign key (vault_id, heir_user_id) references nachlass_v2.heir_memberships(vault_id, heir_user_id) on delete cascade
);
alter table nachlass_v2.vaults enable row level security;
alter table nachlass_v2.heir_memberships enable row level security;
alter table nachlass_v2.heir_envelopes enable row level security;
-- Explicitly no GRANT to anon/authenticated; the schema is not exposed.
-- Access must go through separately audited server endpoints. No permissive
-- policies here; absence of policies is default-deny for browser roles.
revoke all on schema nachlass_v2 from public, anon, authenticated;
revoke all on all tables in schema nachlass_v2 from public, anon, authenticated;
commit;
