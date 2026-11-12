-- REVIEW ONLY: disables entry points, does not delete wishlist or quota data.
-- Disable gateway/edge/frontend BEFORE this script. Do not re-enable old RPCs.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $do$
BEGIN
 IF pg_catalog.to_regprocedure('public.wishlist_import_amazon_batch(jsonb)') IS NOT NULL THEN
   EXECUTE 'REVOKE ALL ON FUNCTION public.wishlist_import_amazon_batch(jsonb) FROM PUBLIC, anon, authenticated';
 END IF;
 IF pg_catalog.to_regprocedure('public.wishlist_amazon_scrape_claim_v11(uuid,text,text)') IS NOT NULL THEN
   EXECUTE 'REVOKE ALL ON FUNCTION public.wishlist_amazon_scrape_claim_v11(uuid,text,text) FROM PUBLIC, anon, authenticated, service_role';
 END IF;
 IF pg_catalog.to_regprocedure('public.wishlist_amazon_quota_cleanup_v12(integer)') IS NOT NULL THEN
   EXECUTE 'REVOKE ALL ON FUNCTION public.wishlist_amazon_quota_cleanup_v12(integer) FROM PUBLIC, anon, authenticated, service_role';
 END IF;
END $do$;
COMMIT;
