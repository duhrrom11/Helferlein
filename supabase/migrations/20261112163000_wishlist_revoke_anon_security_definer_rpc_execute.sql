-- Production migration applied on 2026-11-12 under the name
-- wishlist_revoke_anon_security_definer_rpc_execute.
-- All eight RPCs require auth.uid(); remove unnecessary anonymous EXECUTE.
REVOKE EXECUTE ON FUNCTION public.wishlist_cancel_wish_reservation(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wishlist_gift_dashboard_reservations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.wishlist_my_gift_coordination(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wishlist_my_gift_reservations(integer,timestamp with time zone,bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wishlist_my_reservation_for_plan(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wishlist_reservation_status(bigint[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wishlist_reserve_wish(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wishlist_update_gift_progress(uuid,text,boolean) FROM anon;
