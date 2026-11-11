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
