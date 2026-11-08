-- Applied to production alltagshelfer on 2026-11-08.
-- Align table grants with existing RLS policies; keep public wishlist SELECT.
BEGIN;
REVOKE INSERT, UPDATE, DELETE ON
  public.wishlist_profiles, public.wishlist_products,
  public.wishlist_wishes, public.wishlist_follows
FROM anon;
REVOKE UPDATE, DELETE ON public.wishlist_products FROM authenticated;
REVOKE UPDATE ON public.wishlist_follows FROM authenticated;
ALTER POLICY "Users can read own data" ON public.user_data TO authenticated;
ALTER POLICY "Users can insert own data" ON public.user_data TO authenticated;
ALTER POLICY "Users can update own data" ON public.user_data TO authenticated;
ALTER POLICY "Users can delete own data" ON public.user_data TO authenticated;
COMMIT;
