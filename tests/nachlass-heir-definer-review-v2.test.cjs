'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../docs/nachlass-v2-heir-definer-review.sql'),'utf8');
test('review-only definer has constrained identity, membership, and release checks',()=>{
 for(const token of ['SECURITY DEFINER','SET search_path = pg_catalog, pg_temp', 'm.heir_user_id = p_verified_user_id',"v.state = 'RELEASED'", "m.status = 'ACTIVE'", 'm.identity_verified IS TRUE', 'v.owner_user_id <> p_verified_user_id','FOR SHARE OF v, m, e'])assert.ok(sql.includes(token),token);
});
test('draft has no public execution, grants, data changes or activation',()=>{
 assert.match(sql,/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated, service_role/);
 assert.doesNotMatch(sql,/^\s*GRANT\s/im);
 assert.doesNotMatch(sql,/^\s*(UPDATE|DELETE|INSERT|TRUNCATE|ALTER ROLE|CREATE ROLE)\s/im);
 assert.match(sql,/ROLLBACK;/);
});
