'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { authorize } = require('../tools/digitaler-nachlass/supabase-heir-access-v2.cjs');
const OWNER = '11111111-1111-4111-8111-111111111111';
const HEIR = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const vault = { id: 'v_12345678', ownerUserId: OWNER, state: 'LOCKED' };
const membership = { vaultId: vault.id, userId: HEIR, status: 'ACTIVE', identityVerified: true };
const check = (userId, action, changes = {}) => authorize({
  principal: { userId, verified: true }, vault: { ...vault, ...changes },
  membership, action
});
test('only verified owner can read own vault or cancel alarm', () => {
  assert.equal(check(OWNER, 'READ_OWNER').allowed, true);
  assert.equal(check(HEIR, 'READ_OWNER').allowed, false);
  assert.equal(check(OWNER, 'CANCEL_ALARM', { state: 'ALARM_PENDING' }).allowed, true);
  assert.equal(check(HEIR, 'CANCEL_ALARM', { state: 'ALARM_PENDING' }).allowed, false);
});
test('heir must have server-side active verified membership', () => {
  assert.equal(check(HEIR, 'TRIGGER_ALARM').allowed, true);
  assert.equal(check(OTHER, 'TRIGGER_ALARM').allowed, false);
  for (const change of [{ status: 'REVOKED' }, { identityVerified: false }, { vaultId: 'other' }]) {
    assert.equal(authorize({ principal: { userId: HEIR, verified: true }, vault,
      membership: { ...membership, ...change }, action: 'TRIGGER_ALARM' }).allowed, false);
  }
});
test('no heir envelope before release or after revocation', () => {
  assert.equal(check(HEIR, 'READ_HEIR_ENVELOPE').allowed, false);
  assert.equal(check(HEIR, 'READ_HEIR_ENVELOPE', { state: 'RELEASED' }).allowed, true);
  assert.equal(check(HEIR, 'READ_HEIR_ENVELOPE', { state: 'REVOKED' }).allowed, false);
  assert.equal(check(OTHER, 'READ_HEIR_ENVELOPE', { state: 'RELEASED' }).allowed, false);
});
test('unverified principal, forged role and unknown action fail closed', () => {
  assert.equal(authorize({ principal: { userId: OWNER, verified: false, role: 'admin' },
    vault, membership, action: 'READ_OWNER' }).allowed, false);
  assert.equal(authorize({ principal: { userId: 'invalid', verified: true },
    vault, membership, action: 'READ_OWNER' }).allowed, false);
  assert.equal(check(OWNER, 'RELEASE').allowed, false);
  assert.equal(authorize().allowed, false);
});
test('missing or malformed vault IDs fail closed for owners and heirs', () => {
  for (const id of [undefined, null, '', '../other', 'v_short', 'v_12345678/other']) {
    assert.equal(check(OWNER, 'READ_OWNER', { id }).allowed, false);
    assert.equal(check(HEIR, 'TRIGGER_ALARM', { id }).allowed, false);
    assert.equal(check(HEIR, 'READ_HEIR_ENVELOPE', { id, state: 'RELEASED' }).allowed, false);
  }
});
