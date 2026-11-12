-- STAGING REVIEW ONLY. Never run on production without separate authorization.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- REVIEW ONLY. V11 replaces V9 quota RPC and adds persistent one-time nonce tracking.
-- The gateway must generate a cryptographically random nonce per request.
-- Deploy only with explicitly approved staging/production migration and Gateway v11.
create table if not exists public.wishlist_amazon_gateway_nonces (
  nonce text primary key check(nonce ~ '^[0-9a-f]{32}$'),
  expires_at timestamptz not null
);
alter table public.wishlist_amazon_gateway_nonces enable row level security;
revoke all on table public.wishlist_amazon_gateway_nonces from PUBLIC, anon, authenticated;
grant select,insert on public.wishlist_amazon_gateway_nonces to service_role;
-- Keep nonce records longer than the signature validity window (30 seconds).
-- Periodic cleanup must be configured; do not delete active nonces.
-- REVIEW ONLY. Do not execute on production without explicit authorization.
-- Requires the V7 user quota table. The trusted ingress MUST sign source IPs.
-- Store only keyed HMAC fingerprints, not plaintext IPs.
create table if not exists public.wishlist_amazon_ip_quota (
  ip_fingerprint text not null check (ip_fingerprint ~ '^[0-9a-f]{64}$'),
  period text not null check (period in ('15m','day')),
  window_start timestamptz not null,
  requests integer not null check (requests between 0 and 100000),
  primary key (ip_fingerprint,period,window_start)
);
alter table public.wishlist_amazon_ip_quota enable row level security;
revoke all on table public.wishlist_amazon_ip_quota from PUBLIC, anon, authenticated;
grant select,insert,update on public.wishlist_amazon_ip_quota to service_role;

create or replace function public.wishlist_amazon_scrape_claim_v11(p_user_id uuid,p_ip_fingerprint text,p_nonce text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz;
  v_short timestamptz;
  v_day timestamptz;
  v_user_short integer;
  v_user_day integer;
  v_ip_short integer;
  v_ip_day integer;
  v_retry integer;
begin
  if current_user <> 'service_role' then raise exception 'Unauthorized quota claim' using errcode='42501'; end if;
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Quota claim requires READ COMMITTED' using errcode='25000';
  end if;
  if p_nonce is null or p_nonce !~ '^[0-9a-f]{32}$' then raise exception 'Invalid nonce' using errcode='22023'; end if;
  if p_user_id is null or p_ip_fingerprint is null or p_ip_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid quota identity' using errcode='22023';
  end if;
  -- Lock order is identical for all callers: IP first, user second.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ip:'||p_ip_fingerprint,712447));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('user:'||p_user_id::text,712447));
  -- Use wall-clock time AFTER advisory locks, not before waiting for them.
  -- Otherwise a delayed request could be charged to an already expired window.
  v_now := pg_catalog.clock_timestamp();
  -- The unique nonce is consumed atomically in the SAME transaction as the quota.
  -- On replay return an explicit rejection; do not consume any user/IP quota.
  insert into public.wishlist_amazon_gateway_nonces(nonce,expires_at)
    values(p_nonce,v_now + interval '2 minutes')
    on conflict(nonce) do nothing;
  if not found then
    return pg_catalog.jsonb_build_object('allowed',false,'retry_after_seconds',1,'reason','REPLAY');
  end if;
  v_short := pg_catalog.to_timestamp(pg_catalog.floor(pg_catalog.extract(epoch from v_now)/900)*900);
  v_day := pg_catalog.to_timestamp(pg_catalog.floor(pg_catalog.extract(epoch from v_now)/86400)*86400);
  select requests into v_user_short from public.wishlist_amazon_scrape_quota where user_id=p_user_id and period='15m' and window_start=v_short;
  select requests into v_user_day from public.wishlist_amazon_scrape_quota where user_id=p_user_id and period='day' and window_start=v_day;
  select requests into v_ip_short from public.wishlist_amazon_ip_quota where ip_fingerprint=p_ip_fingerprint and period='15m' and window_start=v_short;
  select requests into v_ip_day from public.wishlist_amazon_ip_quota where ip_fingerprint=p_ip_fingerprint and period='day' and window_start=v_day;
  if pg_catalog.coalesce(v_user_short,0)>=3 or pg_catalog.coalesce(v_user_day,0)>=12 or
     pg_catalog.coalesce(v_ip_short,0)>=20 or pg_catalog.coalesce(v_ip_day,0)>=80 then
    v_retry := case when pg_catalog.coalesce(v_user_day,0)>=12 or pg_catalog.coalesce(v_ip_day,0)>=80
      then pg_catalog.ceil(pg_catalog.extract(epoch from v_day+interval '1 day'-v_now))::integer
      else pg_catalog.ceil(pg_catalog.extract(epoch from v_short+interval '15 minutes'-v_now))::integer end;
    return pg_catalog.jsonb_build_object('allowed',false,'retry_after_seconds',pg_catalog.greatest(1,v_retry));
  end if;
  insert into public.wishlist_amazon_scrape_quota(user_id,period,window_start,requests)
    values(p_user_id,'15m',v_short,1), (p_user_id,'day',v_day,1)
    on conflict(user_id,period,window_start) do update set requests=public.wishlist_amazon_scrape_quota.requests+1;
  insert into public.wishlist_amazon_ip_quota(ip_fingerprint,period,window_start,requests)
    values(p_ip_fingerprint,'15m',v_short,1),(p_ip_fingerprint,'day',v_day,1)
    on conflict(ip_fingerprint,period,window_start) do update set requests=public.wishlist_amazon_ip_quota.requests+1;
  return pg_catalog.jsonb_build_object('allowed',true,'retry_after_seconds',0);
end $$;
revoke all on function public.wishlist_amazon_scrape_claim_v11(uuid,text,text) from PUBLIC, anon, authenticated;
grant execute on function public.wishlist_amazon_scrape_claim_v11(uuid,text,text) to service_role;
-- Retention cleanup for expired windows is a separate, reviewed deployment step.

-- After verified cutover: revoke EXECUTE on old V9 RPC and retire it under an approved migration.

COMMIT;
