-- Applied to production on 2026-11-08. Existing WG payloads are unchanged.
create table if not exists public.wg_members (
 wg_id uuid not null references public.wg_spaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (wg_id,user_id),
 constraint wg_members_not_owner check (user_id <> owner_id)
);
create index if not exists wg_members_user_idx on public.wg_members(user_id);
alter table public.wg_members enable row level security;
create policy wg_members_select on public.wg_members for select to authenticated
 using (user_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy wg_members_insert on public.wg_members for insert to authenticated
 with check (owner_id = (select auth.uid()) and exists
  (select 1 from public.wg_spaces s where s.id = wg_id and s.owner_id = (select auth.uid())));
create policy wg_members_delete on public.wg_members for delete to authenticated
 using (owner_id = (select auth.uid()));
revoke all on public.wg_members from anon;
grant select, insert, delete on public.wg_members to authenticated;
create policy wg_spaces_member_select on public.wg_spaces for select to authenticated
 using (exists (select 1 from public.wg_members m where m.wg_id = id and m.user_id = (select auth.uid())));
create policy wg_spaces_member_update on public.wg_spaces for update to authenticated
 using (exists (select 1 from public.wg_members m where m.wg_id = id and m.user_id = (select auth.uid())))
 with check (exists (select 1 from public.wg_members m where m.wg_id = id and m.user_id = (select auth.uid())));
revoke update on public.wg_spaces from authenticated;
grant update (payload, updated_at) on public.wg_spaces to authenticated;
