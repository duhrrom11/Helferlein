import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./lists-dashboard.mjs',import.meta.url),'utf8');
test('private extras load only after successful list membership',()=>{
 assert.match(source,/membershipReady=true;[\s\S]*?render\(\);\s*void loadPrivateWishExtras\(id,generation\)/);
});
test('private extras query is scoped to signed-in owner and loaded wishes',()=>{
 assert.match(source,/from\('wishlist_wish_extras'\)\.select\('wish_id,image_url,target_price,quantity,wish_status'\)\.eq\('user_id',ownerId\)\.in\('wish_id',batch\)/);
 assert.match(source,/generation!==loadGeneration\|\|getUser\(\)\?\.id!==ownerId\|\|loadedOwner!==ownerId/);
});
test('local extras win and cloud cache clears on reset',()=>{
 assert.match(source,/Object\.keys\(local\)\.length\?local:cloudWishExtras\.get\(String\(wish\.id\)\)/);
 assert.match(source,/loadedOwner=null;cloudWishExtras=new Map\(\);lists=\[\]/);
 assert.match(source,/const generation=\+\+loadGeneration;cloudWishExtras=new Map\(\)/);
});
