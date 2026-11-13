-- Additive-only draft for the existing alltagshelfer project.
-- REVIEW before applying to production. No existing tables are modified.
create table if not exists public.wishlist_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.wishlist_products (
  id bigint generated always as identity primary key,
  marketplace text not null check (marketplace = 'amazon.de'),
  asin text not null check (asin ~ '^[A-Z0-9]{10}$'),
  title text not null check (char_length(title) between 1 and 250),
  created_at timestamptz not null default now(),
  unique (marketplace, asin)
);
create table if not exists public.wishlist_wishes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.wishlist_profiles(user_id) on delete cascade,
  product_id bigint not null references public.wishlist_products(id) on delete cascade,
  priority smallint not null default 2 check (priority between 1 and 3),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists wishlist_wishes_created_idx on public.wishlist_wishes (created_at desc, id desc);
create index if not exists wishlist_wishes_product_idx on public.wishlist_wishes (product_id);
create table if not exists public.wishlist_follows (
  follower_id uuid not null references public.wishlist_profiles(user_id) on delete cascade,
  followed_id uuid not null references public.wishlist_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index if not exists wishlist_follows_followed_idx on public.wishlist_follows (followed_id);
alter table public.wishlist_profiles enable row level security;
alter table public.wishlist_products enable row level security;
alter table public.wishlist_wishes enable row level security;
alter table public.wishlist_follows enable row level security;
create policy "wishlist profiles public read" on public.wishlist_profiles for select to anon, authenticated using (true);
create policy "wishlist profiles owner insert" on public.wishlist_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "wishlist profiles owner update" on public.wishlist_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "wishlist profiles owner delete" on public.wishlist_profiles for delete to authenticated using ((select auth.uid()) = user_id);
create policy "wishlist products public read" on public.wishlist_products for select to anon, authenticated using (true);
create policy "wishlist products authenticated insert" on public.wishlist_products for insert to authenticated with check ((select auth.uid()) is not null);
create policy "wishlist wishes public read" on public.wishlist_wishes for select to anon, authenticated using (true);
create policy "wishlist wishes owner insert" on public.wishlist_wishes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "wishlist wishes owner update" on public.wishlist_wishes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "wishlist wishes owner delete" on public.wishlist_wishes for delete to authenticated using ((select auth.uid()) = user_id);
create policy "wishlist follows public read" on public.wishlist_follows for select to anon, authenticated using (true);
create policy "wishlist follows owner insert" on public.wishlist_follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "wishlist follows owner delete" on public.wishlist_follows for delete to authenticated using ((select auth.uid()) = follower_id);
grant usage on schema public to anon, authenticated;
grant select on public.wishlist_profiles, public.wishlist_products, public.wishlist_wishes, public.wishlist_follows to anon;
grant select, insert, update, delete on public.wishlist_profiles, public.wishlist_wishes to authenticated;
grant select, insert on public.wishlist_products to authenticated;
grant select, insert, delete on public.wishlist_follows to authenticated;
grant usage, select on sequence public.wishlist_products_id_seq, public.wishlist_wishes_id_seq to authenticated;
