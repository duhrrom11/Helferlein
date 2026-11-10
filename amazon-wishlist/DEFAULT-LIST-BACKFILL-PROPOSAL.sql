-- PREPARATION ONLY. Do not execute against production without explicit permission.
-- Run only AFTER LISTS-SCHEMA-PROPOSAL.sql, after schema review.
-- Creates one default list per existing account with wishes and assigns all existing wishes.
-- Re-running is safe for the same existing title, but user-created lists with this title
-- are treated as the default; review this decision before production rollout.
insert into public.wishlist_lists (user_id,title,description,icon,color,visibility)
select distinct w.user_id,'Meine Wünsche','Deine bisherigen Wünsche','🎁','#9D78E8','private'
from public.wishlist_wishes w
where not exists (
 select 1 from public.wishlist_lists l
 where l.user_id=w.user_id and l.title='Meine Wünsche'
);
insert into public.wishlist_list_items (list_id,user_id,wish_id)
select l.id,w.user_id,w.id
from public.wishlist_wishes w
join lateral (
 select id from public.wishlist_lists
 where user_id=w.user_id and title='Meine Wünsche'
 order by created_at,id limit 1
) l on true
on conflict (list_id,wish_id) do nothing;
-- Existing wishes remain public in the existing feed; list visibility does not override this.
