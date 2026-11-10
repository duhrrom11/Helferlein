-- Read-only production release audit. No INSERT/UPDATE/DELETE and no test data.
-- Run using a privileged SQL inspection connection; role/JWT context is simulated
-- from an existing auth.users identity, NOT a real browser login.
begin read only;
select set_config('request.jwt.claim.sub',
  (select id::text from auth.users order by created_at limit 1), true);
set local role authenticated;
select
  auth.uid() is not null as existing_authenticated_claim,
  has_table_privilege(current_user,'public.wishlist_lists','SELECT') as list_select_granted,
  has_table_privilege(current_user,'public.wishlist_lists','INSERT') as list_insert_granted,
  has_table_privilege(current_user,'public.wishlist_list_items','INSERT') as membership_insert_granted,
  not has_table_privilege(current_user,'public.wishlist_lists','TRUNCATE') as list_truncate_denied,
  not has_table_privilege(current_user,'public.wishlist_list_items','UPDATE') as membership_update_denied,
  (select count(*) from public.wishlist_lists) as visible_lists,
  (select count(*) from public.wishlist_list_items) as visible_memberships;
rollback;
