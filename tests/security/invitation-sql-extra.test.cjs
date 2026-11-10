'use strict';
// Offline source-contract checks; not PostgreSQL/RLS/concurrency evidence.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.resolve(__dirname, '../../docs/sql-drafts/redeem_invitation_function_REVIEW_ONLY.sql'), 'utf8');
const code = s => s.replace(/--[^\n]*/g, ' ');
const guards = {
  digest: s => /octet_length\(p_token_hash\)\s*<>\s*32/i.test(code(s)),
  identity: s => /AND intended_user_id = p_verified_user_id/i.test(code(s)),
  accepted: s => /AND accepted_at IS NULL/i.test(code(s)),
  revoke: s => /AND revoked_at IS NULL/i.test(code(s)),
  noGrant: s => !/\bGRANT EXECUTE ON FUNCTION/i.test(code(s)),
};
test('source safeguards remain present', () => {
  assert.deepEqual(Object.entries(guards).filter(([, fn]) => !fn(sql)), []);
});
for (const [name, before, after] of [
  ['digest', 'octet_length(p_token_hash) <> 32', 'octet_length(p_token_hash) <> 64'],
  ['identity', 'AND intended_user_id = p_verified_user_id', 'AND true'],
  ['accepted', 'AND accepted_at IS NULL', 'AND true'],
  ['revoke', 'AND revoked_at IS NULL', 'AND true'],
  ['noGrant', '-- Deliberately no GRANT.', 'GRANT EXECUTE ON FUNCTION public.redeem_trusted_person_invitation_internal(uuid, bytea) TO PUBLIC;\n-- Deliberately no GRANT.'],
]) {
  test('rejects mutation: ' + name, () => {
    assert.ok(sql.includes(before));
    assert.equal(guards[name](sql.replace(before, after)), false);
  });
}
