'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const sql=fs.readFileSync(path.join(root,'docs/nachlass-v2-heir-definer-review.sql'),'utf8');
const plan=fs.readFileSync(path.join(root,'docs/nachlass-v2-parallel-review-plan.md'),'utf8');
test('review draft fails closed on existing function rather than inheriting privileges',()=>{
 assert.match(sql,/\bCREATE FUNCTION nachlass_v2\.read_heir_envelope_trusted/);
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION/i);
 assert.match(sql,/REVOKE ALL ON FUNCTION/);
 assert.match(sql,/ROLLBACK;/);
 assert.doesNotMatch(sql,/^\s*GRANT\s/im);
});
test('parallel test plan explicitly requires independent sessions and covers ordering',()=>{
 for(const phrase of ['wegwerfbare lokale PostgreSQL-17-Instanz','unabhängige PostgreSQL-Sessions','Widerruf vor Lesen','Lesen vor Widerruf','Widerruf vor Sperrerwerb','Konkurrierende Freigabe','lock_timeout'])assert.ok(plan.includes(phrase),phrase);
});
test('review plan rejects caller impersonation, broad RLS bypass and production changes',()=>{
 for(const phrase of ['auth.getUser(token)','gefälschte verifizierte UUID','BYPASSRLS','pg_proc.proacl','has_function_privilege','search_path','Keine Datenbank- oder Rollenkonfiguration auf produktiven Systemen'])assert.ok(plan.includes(phrase),phrase);
});
