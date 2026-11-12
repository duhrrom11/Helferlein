-- STAGING REVIEW ONLY. Never run on production without separate authorization.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- REVIEW ONLY. Do NOT execute without approved deployment.
-- Retention policy: nonce expires after 2 minutes; additional 30 seconds of grace
-- before deletion. The signature is valid only for +/- 30 seconds.
-- Delete bounded batches with SKIP LOCKED; a background scheduler must invoke
-- this under a trusted service role, with a small batch size and monitored cadence.
-- Keep this function inaccessible to browser users.
create or replace function public.wishlist_amazon_quota_cleanup_v12(p_batch integer default 500)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_nonce integer := 0;
  v_user integer := 0;
  v_ip integer := 0;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if current_user <> 'service_role' then
    raise exception 'Unauthorized cleanup' using errcode='42501';
  end if;
  if p_batch is null or p_batch < 1 or p_batch > 1000 then
    raise exception 'Invalid batch size' using errcode='22023';
  end if;

  with expired as (
    select nonce from public.wishlist_amazon_gateway_nonces
    where expires_at < v_now - interval '30 seconds'
    order by expires_at, nonce
    limit p_batch for update skip locked
  ), removed as (
    delete from public.wishlist_amazon_gateway_nonces n
    using expired e where n.nonce=e.nonce returning n.nonce
  ) select pg_catalog.count(*)::integer into v_nonce from removed;

  -- Retain both 15m and day buckets for at least 48 hours after their start.
  -- This exceeds all live bucket lifetimes; never delete active quota windows.
  with expired as (
    select user_id,period,window_start
    from public.wishlist_amazon_scrape_quota
    where window_start < v_now - interval '48 hours'
    order by window_start,user_id,period
    limit p_batch for update skip locked
  ), removed as (
    delete from public.wishlist_amazon_scrape_quota q using expired e
    where q.user_id=e.user_id and q.period=e.period and q.window_start=e.window_start
    returning q.user_id
  ) select pg_catalog.count(*)::integer into v_user from removed;

  with expired as (
    select ip_fingerprint,period,window_start
    from public.wishlist_amazon_ip_quota
    where window_start < v_now - interval '48 hours'
    order by window_start,ip_fingerprint,period
    limit p_batch for update skip locked
  ), removed as (
    delete from public.wishlist_amazon_ip_quota q using expired e
    where q.ip_fingerprint=e.ip_fingerprint and q.period=e.period and q.window_start=e.window_start
    returning q.ip_fingerprint
  ) select pg_catalog.count(*)::integer into v_ip from removed;

  return pg_catalog.jsonb_build_object('nonces',v_nonce,'user_buckets',v_user,'ip_buckets',v_ip);
end $$;
grant delete on public.wishlist_amazon_gateway_nonces, public.wishlist_amazon_scrape_quota, public.wishlist_amazon_ip_quota to service_role;
revoke all on function public.wishlist_amazon_quota_cleanup_v12(integer) from PUBLIC, anon, authenticated;
grant execute on function public.wishlist_amazon_quota_cleanup_v12(integer) to service_role;
-- Scheduler/cron, retention monitoring, alerting and rollback are NOT configured.

COMMIT;
