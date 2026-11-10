-- Applied to production alltagshelfer on 2026-11-08.
-- Keep authenticated USAGE for INSERT defaults (nextval), remove SELECT/UPDATE
-- to prevent client roles reading or resetting sequence counters.
BEGIN;
REVOKE ALL PRIVILEGES ON SEQUENCE
  public.user_data_id_seq,
  public.wishlist_products_id_seq,
  public.wishlist_wishes_id_seq
FROM anon;
REVOKE SELECT, UPDATE ON SEQUENCE
  public.user_data_id_seq,
  public.wishlist_products_id_seq,
  public.wishlist_wishes_id_seq
FROM authenticated;
COMMIT;
