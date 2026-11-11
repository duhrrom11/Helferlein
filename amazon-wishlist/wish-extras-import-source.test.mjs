import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
test('import requires preview, explicit click and confirmation',()=>{
 assert.match(html,/id="previewWishExtrasImport"/);
 assert.match(html,/id="confirmWishExtrasImport"/);
 assert.match(app,/planWishExtrasImport\(local,remote,owned\)/);
 assert.match(app,/if\(!confirm\(preview\.entries\.length/);
});
test('import never overwrites existing cloud records',()=>{
 assert.match(app,/from\('wishlist_wish_extras'\)\.insert\(payload\)\.select\('wish_id'\)\.single\(\)/);
 assert.doesNotMatch(app,/from\('wishlist_wish_extras'\)\.upsert\(/);
 assert.match(app,/r\.error\.code==='23505'/);
});
test('import guards account changes, changed local data and stale previews',()=>{
 assert.match(app,/generation!==wishExtrasImportGeneration/);
 assert.match(app,/localStorage\.getItem\(localWishExtrasKey\(preview\.ownerId\)\)!==preview\.raw/);
 assert.match(app,/user\?\.id!==preview\.ownerId/);
});

test('import prevents overlapping submissions and changes during upload',()=>{
 assert.match(app,/let wishExtrasImportBusy=false/);
 assert.match(app,/if\(wishExtrasImportBusy\)return;/);
 assert.match(app,/wishExtrasImportBusy=true/);
 assert.match(app,/finally\{wishExtrasImportBusy=false/);
});
