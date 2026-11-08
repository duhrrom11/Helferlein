-- Applied to production project avapuibsidubuzxjtyld on 2026-11-08.
-- New secure WG spaces are owner-only; existing npoint WGs are NOT migrated.
create table if not exists public.wg_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint wg_spaces_payload_object check (jsonb_typeof(payload) = 'object')
);
create index if not exists wg_spaces_owner_idx on public.wg_spaces(owner_id);
alter table public.wg_spaces enable row level security;
create policy "wg_spaces_owner_select" on public.wg_spaces for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "wg_spaces_owner_insert" on public.wg_spaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "wg_spaces_owner_update" on public.wg_spaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "wg_spaces_owner_delete" on public.wg_spaces for delete to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.wg_spaces from anon;
grant select, insert, update, delete on public.wg_spaces to authenticated;
