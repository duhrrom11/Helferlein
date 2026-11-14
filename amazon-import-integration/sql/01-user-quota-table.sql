-- STAGING REVIEW ONLY. Never run on production without separate authorization.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
create table if not exists public.wishlist_amazon_scrape_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('15m','day')),
  window_start timestamptz not null,
  requests integer not null check (requests between 0 and 100000),
  primary key (user_id, period, window_start)
);
alter table public.wishlist_amazon_scrape_quota enable row level security;
revoke all on table public.wishlist_amazon_scrape_quota from PUBLIC, anon, authenticated;
grant select, insert, update on table public.wishlist_amazon_scrape_quota to service_role;


COMMIT;
