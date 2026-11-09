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
