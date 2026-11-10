'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const doc=fs.readFileSync(path.join(root,'docs/nachlass-v2-db-role-security-review.md'),'utf8');
const {QUERY}=require('../tools/digitaler-nachlass/heir-repository-v2.cjs');
test('locking query remains blocked for SELECT-only role until privilege review',()=>{
 assert.match(QUERY,/for share of v, m, e/i);
 assert.match(doc,/BLOCKER:[^\n]*UPDATE/);
 assert.match(doc,/nicht aktiviert/);
 assert.match(doc,/www\.postgresql\.org\/docs\/current\/ddl-priv\.html/);
});
test('review never recommends blanket UPDATE or service_role in browser',()=>{
 assert.match(doc,/Keine pauschalen UPDATE-Rechte/);
 assert.match(doc,/niemals den Supabase-/);
});
