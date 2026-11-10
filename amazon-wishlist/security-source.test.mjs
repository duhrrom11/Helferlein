import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');

test('browser source does not embed privileged Supabase secrets or raw HTML rendering',()=>{
 assert.doesNotMatch(app,/service_role|sb_secret_/i);
 assert.doesNotMatch(app,/\.innerHTML\s*=|insertAdjacentHTML\s*\(/);
 assert.doesNotMatch(html,/sb_secret_|service_role/i);
});
test('public wishlist queries explicitly select fields rather than all columns',()=>{
 const selects=[...app.matchAll(/\.select\(\s*(['"`])([\s\S]*?)\1\s*\)/g)].map(m=>m[2]);
 assert.ok(selects.length>=5,'expected multiple explicit projections');
 for(const projection of selects)assert.notEqual(projection.trim(),'*','public query must not fetch all columns');
});
test('UI warns that wish notes and profile information are public',()=>{
 assert.match(html,/öffentlich angezeigt/);
 assert.match(html,/für alle sichtbar/);
});

test('every statically referenced UI element exists exactly once',()=>{
 const references=[...app.matchAll(/\$\('([A-Za-z][\w-]*)'\)/g)].map(match=>match[1]);
 const declared=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 const ids=new Set(declared);
 assert.ok(references.length>=20,'expected the wishlist UI to be wired to the document');
 for(const id of new Set(references))assert.ok(ids.has(id),'missing UI element: '+id);
 assert.equal(ids.size,declared.length,'duplicate HTML IDs');
});

test('external Amazon links use noreferrer and sponsored attributes',()=>{
 assert.match(app,/a\.target='\_blank'/);
 assert.match(app,/a\.rel='noopener noreferrer sponsored'/);
});

test('wishlist UI does not load a service role key or expose user emails in public projections',()=>{
 const projections=[...app.matchAll(/\.select\(\s*(['"`])([\s\S]*?)\1\s*\)/g)].map(match=>match[2]);
 assert.ok(projections.length>=5);
 for(const projection of projections)assert.doesNotMatch(projection,/(^|[,()])\s*(email|encrypted_password|raw_user_meta_data)\s*(,|$)/i);
});

test('backup preview is read-only and never posts selected file content to Supabase',()=>{
 const start=app.indexOf("$('previewBackup').onclick=");
 const end=app.indexOf("$('saveWish').onclick=",start);
 assert.ok(start>=0&&end>start,'backup preview handler must be present');
 const handler=app.slice(start,end);
 assert.match(handler,/previewWishlistBackup\(/);
 assert.match(handler,/file\.text\(\)/);
 assert.doesNotMatch(handler,/db\.from\(|\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
 assert.match(html,/Es wird nichts importiert, überschrieben oder in Supabase gespeichert/);
});


test('production app mounts dashboard and retains backup/export controls',()=>{
 const dashboard=readFileSync(new URL('./lists-dashboard.mjs',import.meta.url),'utf8');
 assert.match(app,/import \{mountListsDashboard\} from '\.\/lists-dashboard\.mjs'/);
 assert.match(app,/mountListsDashboard\(db,\(\)=>user\)/);
 assert.match(app,/dashboard\.refresh\(\)/);
 assert.match(app,/dashboard\.assignWish\(/);
 for(const id of ['listsDashboard','wishListSelect','listWishCards','bulkConfirmDialog','exportWishes','exportWishesJson','backupFile','previewBackup']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(dashboard,/return \{refresh:/);
});

test('Playwright discovers the real production HTML dashboard integration suite',()=>{
 const config=readFileSync(new URL('./playwright.config.mjs',import.meta.url),'utf8');
 assert.match(config,/production-dashboard\.integration\.spec\.mjs/);
});

test('auth lifecycle refreshes private dashboard before profile requests and on logout',()=>{
 const authStart=app.indexOf('async function auth()');
 const signinStart=app.indexOf("$('signin').onclick",authStart);
 const authBody=app.slice(authStart,signinStart);
 assert.ok(authStart>=0&&signinStart>authStart);
 assert.match(authBody,/await dashboard\.refresh\(\)/);
 assert.ok(authBody.indexOf('await dashboard.refresh()')<authBody.indexOf("db.from('wishlist_profiles')"));
 assert.match(app,/\$\('logout'\)\.onclick=run\(async\(\)=>[\s\S]*?await auth\(\)/);
 assert.match(app,/db\.auth\.onAuthStateChange\(/);
});
