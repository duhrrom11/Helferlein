-- EPHEMERAL CI DATABASE ONLY. This file must never run against production.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() <> 'helferlein_heir_ci' THEN
    RAISE EXCEPTION 'Refusing to initialize non-CI database: %', current_database();
  END IF;
END $$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
-- Synthetic active sessions, never auth system or customer data.
CREATE TABLE auth.sessions (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id));
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions FORCE ROW LEVEL SECURITY;
CREATE TABLE public.vault_cloud_snapshots (
  owner_user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  vault_id text NOT NULL CHECK(vault_id ~ '^v_[A-Za-z0-9_-]{8,80}$'),
  encrypted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  recovery_key jsonb,
  encrypted_config jsonb
);
ALTER TABLE public.vault_cloud_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY vault_owner_select ON public.vault_cloud_snapshots
  FOR SELECT TO authenticated USING (owner_user_id = NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid);
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
INSERT INTO auth.sessions (id,user_id) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','33333333-3333-4333-8333-333333333333'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','22222222-2222-4222-8222-222222222222');
INSERT INTO public.vault_cloud_snapshots (owner_user_id,vault_id)
 VALUES ('11111111-1111-4111-8111-111111111111','v_abcdefgh');
