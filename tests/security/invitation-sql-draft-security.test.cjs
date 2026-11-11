'use strict';
// Offline source-contract checks only. Not a PostgreSQL/RLS/concurrency test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const file = path.resolve(__dirname, '../../docs/sql-drafts/redeem_invitation_function_REVIEW_ONLY.sql');
const source = fs.readFileSync(file, 'utf8');

function executable(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\s+/g, ' ');
}
function checks(sql) {
  const s = executable(sql);
  return {
    reviewOnly: /REVIEW ONLY\. NEVER RUN OR DEPLOY AS-IS\./i.test(sql),
    definer: /LANGUAGE plpgsql SECURITY DEFINER SET search_path\s*=\s*''/i.test(s),
    fullyQualified: /FROM public\.trusted_person_invitations\b/i.test(s) && /FROM public\.vault_ownership\b/i.test(s) && /INTO public\.vault_trusted_persons\b/i.test(s),
    invitationLock: /FROM public\.trusted_person_invitations\b[\s\S]*?WHERE token_hash\s*=\s*p_token_hash\s+FOR UPDATE\b/i.test(s),
    ownerLock: /FROM public\.vault_ownership\b[\s\S]*?WHERE vault_id\s*=\s*v_inv\.vault_id\s+FOR UPDATE\b/i.test(s),
    verifiedIdentity: /v_inv\.intended_user_id IS DISTINCT FROM p_verified_user_id/i.test(s),
    revokeGuard: /v_inv\.revoked_at IS NOT NULL/i.test(s) && /AND revoked_at IS NULL/i.test(s),
    expiryGuard: /v_inv\.expires_at <= v_time/i.test(s) && /AND expires_at > clock_timestamp\(\)/i.test(s),
    ownerGuard: /v_owner IS DISTINCT FROM v_inv\.invited_by_user_id/i.test(s),
    noResurrection: /FROM public\.vault_trusted_persons\b[\s\S]*?trusted_user_id\s*=\s*p_verified_user_id/i.test(s),
    rollbackOnFailure: /IF NOT FOUND THEN RAISE EXCEPTION 'redemption_state_changed'; END IF/i.test(s),
    explicitRevoke: /REVOKE ALL ON FUNCTION public\.redeem_trusted_person_invitation_internal\(uuid, bytea\) FROM PUBLIC, anon, authenticated/i.test(s),
    noGrant: !/\bGRANT\s+EXECUTE\b/i.test(s),
    spoofingWarning: /spoofing by ANY role with EXECUTE/i.test(sql),
  };
}

test('original draft satisfies offline source-contract checks', () => {
  const results = checks(source);
  assert.deepEqual(Object.entries(results).filter(([, ok]) => !ok), []);
  assert.equal(Object.keys(results).length, 14);
});
const mutations = [
  ['unsafe search_path', /SET search_path = ''/, 'SET search_path = public', 'definer'],
  ['missing invitation lock', /WHERE token_hash = p_token_hash\s+FOR UPDATE/, 'WHERE token_hash = p_token_hash', 'invitationLock'],
  ['missing ownership lock', /WHERE vault_id = v_inv.vault_id\s+FOR UPDATE/, 'WHERE vault_id = v_inv.vault_id', 'ownerLock'],
  ['removed identity binding', /v_inv.intended_user_id IS DISTINCT FROM p_verified_user_id/, 'false', 'verifiedIdentity'],
  ['removed revocation predicate', /AND revoked_at IS NULL/, 'AND true', 'revokeGuard'],
  ['removed expiry recheck', /AND expires_at > clock_timestamp\(\)/, 'AND true', 'expiryGuard'],
  ['removed owner comparison', /v_owner IS DISTINCT FROM v_inv.invited_by_user_id/, 'false', 'ownerGuard'],
  ['removed rollback exception', /RAISE EXCEPTION 'redemption_state_changed'/, 'RETURN false', 'rollbackOnFailure'],
  ['removed EXECUTE revoke', /REVOKE ALL ON FUNCTION public\.redeem_trusted_person_invitation_internal\(uuid, bytea\)\s+FROM PUBLIC, anon, authenticated;/, '', 'explicitRevoke'],
  ['unsafe EXECUTE grant', /-- Deliberately no GRANT\./, 'GRANT EXECUTE ON FUNCTION public.redeem_trusted_person_invitation_internal(uuid, bytea) TO PUBLIC;\n-- Deliberately no GRANT.', 'noGrant'],
];
for (const [name, pattern, replacement, guard] of mutations) {
  test(`detects mutation: ${name}`, () => {
    assert.match(source, pattern, 'mutation anchor must exist in original');
    const mutated = source.replace(pattern, replacement);
    assert.notEqual(mutated, source);
    assert.equal(checks(mutated)[guard], false);
  });
}
