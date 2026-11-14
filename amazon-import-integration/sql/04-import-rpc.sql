-- STAGING REVIEW ONLY. Never run on production without separate authorization.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- REVIEW ONLY. DO NOT EXECUTE ON PRODUCTION. Verified against read-only live schema on 2026-11-12.
-- IMPORTANT: Postgres RPC executes atomically per call; multiple calls are NOT one transaction.
-- The function requires a pre-existing wishlist_profiles row and publishes imported wishes.
-- One PostgREST RPC call = one PostgreSQL transaction; errors roll back all inserts.
-- SECURITY INVOKER preserves wishlist_* RLS. Requires verified unique constraints
-- on wishlist_products(marketplace,asin) and wishlist_wishes(user_id,product_id).
create or replace function public.wishlist_import_amazon_batch(p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid := (select auth.uid());
  v_item jsonb;
  v_asin text;
  v_title text;
  v_product_id public.wishlist_products.id%type;
  v_added integer := 0;
  v_skipped integer := 0;
  v_seen text[] := array[]::text[];
begin
  if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Import requires READ COMMITTED' using errcode='25000';
  end if;
  if v_owner is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not exists (select 1 from public.wishlist_profiles where user_id=v_owner) then
    raise exception 'Profile required' using errcode='23503';
  end if;
  -- Reject malformed input before any INSERT; preserve all-or-nothing semantics.
  if p_items is null or pg_catalog.octet_length(p_items::text) > 40000 then
    raise exception 'Invalid batch payload size' using errcode='22023';
  end if;
  if pg_catalog.jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Invalid batch type' using errcode='22023';
  end if;
  if pg_catalog.jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Invalid batch size' using errcode='22023';
  end if;
  -- Canonical ASIN order across concurrent batches reduces opposing product row-lock orders.
  -- All validations remain atomic: an error rolls back the whole RPC transaction.
  for v_item in select value from pg_catalog.jsonb_array_elements(p_items)
    order by pg_catalog.upper(value->>'asin') collate "C" loop
    if pg_catalog.jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Invalid item type' using errcode='22023';
    end if;
    if (select count(*) from pg_catalog.jsonb_object_keys(v_item)) <> 2
      or not (v_item ? 'asin' and v_item ? 'title') then
      raise exception 'Invalid item shape' using errcode='22023';
    end if;
    if pg_catalog.jsonb_typeof(v_item->'asin') is distinct from 'string'
       or pg_catalog.jsonb_typeof(v_item->'title') is distinct from 'string' then
      raise exception 'ASIN and title must be strings' using errcode='22023';
    end if;
    v_asin := pg_catalog.upper(v_item->>'asin');
    v_title := pg_catalog.btrim(v_item->>'title');
    if v_asin !~ '^[A-Z0-9]{10}$' or v_title is null or pg_catalog.char_length(v_title) not between 1 and 250 then
      raise exception 'Invalid product data' using errcode='22023';
    end if;
    if v_asin = any(v_seen) then raise exception 'Duplicate ASIN in batch' using errcode='22023'; end if;
    v_seen := pg_catalog.array_append(v_seen,v_asin);
    insert into public.wishlist_products(marketplace,asin,title)
      values ('amazon.de',v_asin,v_title)
      on conflict (marketplace,asin) do nothing;
    select id into v_product_id from public.wishlist_products where marketplace='amazon.de' and asin=v_asin;
    if v_product_id is null then raise exception 'Product not accessible' using errcode='42501'; end if;
    insert into public.wishlist_wishes(user_id,product_id,note,priority,visibility)
      values(v_owner,v_product_id,'',2,'public')
      on conflict (user_id,product_id) do nothing;
    if found then v_added:=v_added+1; else v_skipped:=v_skipped+1; end if;
  end loop;
  return pg_catalog.jsonb_build_object('inserted',v_added,'skipped',v_skipped);
end $$;
-- Function privileges are changed in the same release transaction as CREATE.
-- PUBLIC means the PostgreSQL pseudo-role, not the public schema.
revoke all on function public.wishlist_import_amazon_batch(jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.wishlist_import_amazon_batch(jsonb) to authenticated;

COMMIT;
