import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
test('private cloud extras require an explicit editor action',()=>{
 assert.match(html,/id="saveWishExtrasCloud"[^>]*hidden/);
 assert.match(app,/\$\('saveWishExtrasCloud'\)\.onclick=run\(async/);
 assert.match(app,/from\('wishlist_wish_extras'\)\.insert\(payload\)/);
 assert.doesNotMatch(app,/from\('wishlist_wish_extras'\)\.upsert\(/);
});
test('cloud extras do not silently replace existing records',()=>{
 assert.match(app,/result\.error\.code==='23505'/);
 assert.match(app,/Cloud-Daten\. Sie wurden nicht überschrieben/);
 assert.match(app,/wishEditorRevision!==revision/);
});
test('cloud feedback is announced accessibly',()=>{
 assert.match(html,/id="wishExtrasCloudFeedback" role="status" aria-live="polite"/);
});

test('updates require confirmation and exact stored version',()=>{
 assert.match(html,/id="updateWishExtrasCloud"[^>]*hidden/);
 assert.match(app,/\$\('updateWishExtrasCloud'\)\.onclick=run\(async/);
 assert.match(app,/if\(!confirm\(details/);
 assert.match(app,/\.eq\('version',old\.version\)\.select\('wish_id,version'\)/);
 assert.doesNotMatch(app,/updated_at:new Date\(\)\.toISOString\(\)/);
 assert.match(app,/changed\.data\?\.length!==1/);
 assert.doesNotMatch(app,/from\('wishlist_wish_extras'\)\.upsert\(/);
});

test('feed cloud extras are owner-scoped and private to own cards',()=>{
 assert.match(app,/page\.items\.filter\(w=>w\.user_id===feedUserId\)/);
 assert.match(app,/from\('wishlist_wish_extras'\)\.select\('wish_id,image_url,target_price,quantity,wish_status'\)\.eq\('user_id',feedUserId\)\.in\('wish_id',ownIds\)/);
 assert.match(app,/appendWishExtras\(div,w,cloudExtrasByWish\.get\(String\(w\.id\)\)\)/);
 assert.match(app,/if\(wish\.user_id!==user\?\.id\)return/);
});
test('local extras take precedence and stale cloud results are discarded',()=>{
 assert.match(app,/Object\.keys\(local\)\.length\?local:cloudExtras/);
 assert.match(app,/if\(isStale\(\)\)\{feedRefreshPending=true;return;\}/);
});

test('cloud actions show network errors locally and discard stale results',()=>{
 assert.match(app,/let wishExtrasCloudOperation=0/);
 assert.match(app,/operation===wishExtrasCloudOperation/);
 assert.match(app,/operation!==wishExtrasCloudOperation/);
 assert.match(app,/Cloud-Speicherung wegen Netzwerkfehler fehlgeschlagen/);
 assert.match(app,/Cloud-Stand wegen Netzwerkfehler nicht lesbar/);
 assert.match(app,/Cloud-Aktualisierung durch Netzwerkfehler unterbrochen/);
});
