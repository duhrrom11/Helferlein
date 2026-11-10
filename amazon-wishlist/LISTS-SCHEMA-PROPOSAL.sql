-- PREPARED ONLY. Production rollout requires validated CI and explicit release gate.
-- Existing wishlist_wishes remain PUBLIC; a private collection does not make its linked wishes private.
create table if not exists public.wishlist_lists (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(trim(title)) between 1 and 80),
 description text not null default '' check (char_length(description)<=500),
 icon text not null default '🎁' check (char_length(icon)<=16),
 color text not null default '#9D78E8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
 visibility text not null default 'private' check (visibility in ('private','public')),
 archived boolean not null default false,
 created_at timestamptz not null default now(),
 unique (id,user_id)
);
-- Composite ownership key prevents a user from assigning another user's wish.
-- Required by the composite foreign key below.
alter table public.wishlist_wishes add constraint wishlist_wishes_id_owner_unique unique (id,user_id);
create table if not exists public.wishlist_list_items (
 list_id uuid not null,
 user_id uuid not null,
 wish_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(list_id,wish_id),
 foreign key(list_id,user_id) references public.wishlist_lists(id,user_id) on delete cascade,
 foreign key(wish_id,user_id) references public.wishlist_wishes(id,user_id) on delete cascade
);
create index if not exists wishlist_lists_owner_idx on public.wishlist_lists(user_id,created_at desc);
create index if not exists wishlist_list_items_owner_idx on public.wishlist_list_items(user_id,wish_id);
alter table public.wishlist_lists enable row level security;
alter table public.wishlist_list_items enable row level security;
create policy "lists owner read" on public.wishlist_lists for select to authenticated using ((select auth.uid())=user_id);
create policy "lists owner insert" on public.wishlist_lists for insert to authenticated with check ((select auth.uid())=user_id);
create policy "lists owner update" on public.wishlist_lists for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "lists owner delete" on public.wishlist_lists for delete to authenticated using ((select auth.uid())=user_id);
create policy "list items owner read" on public.wishlist_list_items for select to authenticated using ((select auth.uid())=user_id);
create policy "list items owner insert" on public.wishlist_list_items for insert to authenticated with check ((select auth.uid())=user_id and exists (select 1 from public.wishlist_lists l where l.id=list_id and l.user_id=(select auth.uid())) and exists (select 1 from public.wishlist_wishes w where w.id=wish_id and w.user_id=(select auth.uid())));
create policy "list items owner delete" on public.wishlist_list_items for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.wishlist_lists to authenticated;
grant select,insert,delete on public.wishlist_list_items to authenticated;
