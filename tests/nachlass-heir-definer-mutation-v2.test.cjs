'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.join(__dirname, '../docs/nachlass-v2-heir-definer-review.sql'), 'utf8');
function review(source) {
  const body = source.replace(/--[^\n]*/g, '');
  const checks = {
    noReplace: /\bCREATE\s+FUNCTION\s+nachlass_v2\.read_heir_envelope_trusted\s*\(/i.test(body) && !/\bOR\s+REPLACE\b/i.test(body),
    definer: /\bSECURITY\s+DEFINER\b/i.test(body),
    searchPath: /\bSET\s+search_path\s*=\s*pg_catalog\s*,\s*pg_temp\b/i.test(body),
    trustedId: /\bm\.heir_user_id\s*=\s*p_verified_user_id\b/i.test(body),
    ownerDenied: /\bv\.owner_user_id\s*<>\s*p_verified_user_id\b/i.test(body),
    released: /\bv\.state\s*=\s*'RELEASED'/i.test(body),
    active: /\bm\.status\s*=\s*'ACTIVE'/i.test(body),
    verified: /\bm\.identity_verified\s+IS\s+TRUE\b/i.test(body),
    locked: /\bFOR\s+SHARE\s+OF\s+v\s*,\s*m\s*,\s*e\b/i.test(body),
    revoke: /\bREVOKE\s+ALL\s+ON\s+FUNCTION\s+nachlass_v2\.read_heir_envelope_trusted\s*\(\s*text\s*,\s*uuid\s*\)\s+FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role\s*;/i.test(body),
    noGrant: !/\bGRANT\b/i.test(body),
    rollback: /\bROLLBACK\s*;\s*$/i.test(body),
  };
  return Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
}
test('original draft passes static review gate', () => assert.deepEqual(review(sql), []));
const mutations = [
  ['replace inherits existing privileges', 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 'noReplace'],
  ['invoker executes without definer boundary', 'SECURITY DEFINER', 'SECURITY INVOKER', 'definer'],
  ['unsafe search path', 'pg_catalog, pg_temp', 'public, pg_temp', 'searchPath'],
  ['caller identity no longer checked', 'm.heir_user_id = p_verified_user_id', 'm.heir_user_id IS NOT NULL', 'trustedId'],
  ['owner exclusion removed', 'v.owner_user_id <> p_verified_user_id', 'v.owner_user_id IS NOT NULL', 'ownerDenied'],
  ['release guard removed', "v.state = 'RELEASED'", 'v.state IS NOT NULL', 'released'],
  ['membership guard removed', "m.status = 'ACTIVE'", 'm.status IS NOT NULL', 'active'],
  ['verification guard removed', 'm.identity_verified IS TRUE', 'm.identity_verified IS NOT NULL', 'verified'],
  ['row locks removed', 'FOR SHARE OF v, m, e', '', 'locked'],
  ['public execution revoked incorrectly', 'FROM PUBLIC, anon, authenticated, service_role;', 'FROM anon, authenticated, service_role;', 'revoke'],
  ['unreviewed execute grant added', 'ROLLBACK;', 'GRANT EXECUTE ON FUNCTION nachlass_v2.read_heir_envelope_trusted(text, uuid) TO PUBLIC;\nROLLBACK;', 'noGrant'],
  ['rollback removed', 'ROLLBACK;', 'COMMIT;', 'rollback'],
];
for (const [label, before, after, expected] of mutations) {
  test('mutation rejected: ' + label, () => {
    assert.ok(sql.includes(before), 'fixture must contain mutation target');
    assert.ok(review(sql.replace(before, after)).includes(expected));
  });
}
