-- Helferlein: Zuordnung von Supabase-Identitaeten zu bestehenden Firestore-Tresoren.
-- Diese Migration ist nur ein Schemaentwurf und wird nicht automatisch ausgefuehrt.
-- Bestehende Tresore werden NICHT automatisch einem Benutzer zugeordnet.
create table if not exists public.vault_ownership (
  vault_id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  verified_at timestamptz not null default now(),
  verification_method text not null,
  created_at timestamptz not null default now(),
  constraint vault_id_format check (vault_id ~ '^v_[A-Za-z0-9_-]{8,80}$'),
  constraint verification_method_allowed check (
    verification_method in ('admin_verified_migration', 'server_verified_creation')
  )
);

create index if not exists vault_ownership_owner_user_id_idx
  on public.vault_ownership(owner_user_id);

alter table public.vault_ownership enable row level security;

-- Keine Client-Policies: anon und authenticated haben keinen direkten Zugriff.
-- Eigentuemerdaten duerfen ausschliesslich von vertrauenswuerdiger
-- serverseitiger Logik mit verifizierter Identitaet gelesen/geaendert werden.
revoke all on table public.vault_ownership from anon, authenticated;

comment on table public.vault_ownership is
  'Serverseitig verwaltete Tresor-Eigentuemerzuordnung; keine Selbstzuordnung durch Clients.';
