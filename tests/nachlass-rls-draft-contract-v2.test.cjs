'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.join(__dirname, '../docs/nachlass-v2-rls-policy-draft.sql'), 'utf8');
test('only owner SELECT policy exists; no direct heir envelope policy', () => {
  const policies = [...sql.matchAll(/^create policy\s+(\w+)\s+on\s+([\w.]+)/gim)].map(m => [m[1],m[2]]);
  assert.deepEqual(policies, [['vault_owner_select','nachlass_v2.vaults']]);
});
test('owner read uses auth.uid and does not join other protected tables', () => {
  const statement = sql.split(';').find(x => /create policy vault_owner_select/i.test(x));
  assert.match(statement, /owner_user_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(statement, /\bexists\s*\(|\bjoin\b/i);
});
test('no SQL grants or mutating policies introduced', () => {
  const statements = sql.split(';').map(s => s.replace(/--[^\n]*/g,'').trim()).filter(Boolean);
  assert.equal(statements.length,1);
  assert.doesNotMatch(statements[0], /\bgrant\b|\b(insert|update|delete)\b/i);
});
