-- Applied to production Supabase alltagshelfer on 2026-11-08.
-- RLS does not protect TRUNCATE, TRIGGER or REFERENCES privileges.
-- Revoke these from browser-facing roles on wishlist tables.
-- No data rows or normal SELECT/INSERT/UPDATE/DELETE privileges are changed.
BEGIN;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
  public.wishlist_profiles,
  public.wishlist_products,
  public.wishlist_wishes,
  public.wishlist_follows
FROM anon, authenticated;
COMMIT;
