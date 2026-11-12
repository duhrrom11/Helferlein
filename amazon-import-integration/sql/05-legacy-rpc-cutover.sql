-- STAGING REVIEW ONLY. Run only AFTER gateway/edge v11 cutover and checks.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $do$
BEGIN
 IF pg_catalog.to_regprocedure('public.wishlist_amazon_scrape_claim(uuid)') IS NOT NULL THEN
   EXECUTE 'REVOKE ALL ON FUNCTION public.wishlist_amazon_scrape_claim(uuid) FROM PUBLIC, anon, authenticated, service_role';
 END IF;
 IF pg_catalog.to_regprocedure('public.wishlist_amazon_scrape_claim_v9(uuid,text)') IS NOT NULL THEN
   EXECUTE 'REVOKE ALL ON FUNCTION public.wishlist_amazon_scrape_claim_v9(uuid,text) FROM PUBLIC, anon, authenticated, service_role';
 END IF;
END $do$;
COMMIT;
