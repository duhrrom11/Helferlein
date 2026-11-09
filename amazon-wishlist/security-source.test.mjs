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
