import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const schema=readFileSync(new URL('./LISTS-SCHEMA-PROPOSAL.sql',import.meta.url),'utf8');

test('list items use the production bigint wish ID and composite owner foreign keys',()=>{
 assert.match(schema,/wish_id bigint not null/);
 assert.match(schema,/foreign key\(list_id,user_id\) references public\.wishlist_lists\(id,user_id\)/);
 assert.match(schema,/foreign key\(wish_id,user_id\) references public\.wishlist_wishes\(id,user_id\)/);
 assert.match(schema,/wishlist_wishes_id_owner_unique unique \(id,user_id\)/);
});

test('all exposed list tables enable RLS and owner-scoped write policies',()=>{
 for(const table of ['wishlist_lists','wishlist_list_items']){
  assert.match(schema,new RegExp('alter table public\\.'+table+' enable row level security'));
 }
 assert.match(schema,/create policy "lists owner update"[\s\S]*?using \(\(select auth\.uid\(\)\)=user_id\) with check \(\(select auth\.uid\(\)\)=user_id\)/);
 assert.match(schema,/create policy "list items owner insert"[\s\S]*?exists \(select 1 from public\.wishlist_wishes w where w\.id=wish_id and w\.user_id=\(select auth\.uid\(\)\)\)/);
 assert.match(schema,/revoke all privileges on table public\.wishlist_lists, public\.wishlist_list_items from public, anon, authenticated/);
 assert.match(schema,/grant select,insert,delete on public\.wishlist_list_items to authenticated/);
 assert.doesNotMatch(schema,/grant[^;]*to anon/i);
});
