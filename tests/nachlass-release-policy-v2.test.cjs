'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { STATES, MIN_DELAY_MS, decide, releaseDue } = require('../tools/digitaler-nachlass/release-policy-v2.cjs');

const NOW = 1800000000000;
const context = (changes = {}) => ({
  state: STATES.LOCKED, serverNowMs: NOW, ownerId: 'owner',
  actorId: 'heir-a', activeHeirIds: ['heir-a'], version: 2, ...changes
});
test('known invited heir may request alarm, stranger cannot', () => {
  assert.equal(decide(context(), 'TRIGGER_ALARM').nextState, STATES.ALARM_PENDING);
  assert.equal(decide(context({ actorId: 'stranger' }), 'TRIGGER_ALARM').allowed, false);
  assert.equal(decide(context({ actorId: 'owner' }), 'TRIGGER_ALARM').allowed, false);
});
test('only owner may cancel or revoke', () => {
  const pending = { state: STATES.ALARM_PENDING, alarmStartedAtMs: NOW - 1000 };
  assert.equal(decide(context({ ...pending, actorId: 'owner' }), 'CANCEL_ALARM').nextState, STATES.CANCELLED);
  assert.equal(decide(context(pending), 'CANCEL_ALARM').allowed, false);
  assert.equal(decide(context({ actorId: 'owner' }), 'REVOKE').nextState, STATES.REVOKED);
  assert.equal(decide(context(), 'REVOKE').allowed, false);
});
test('release timing is a non-authorizing predicate; RELEASE is never a public action', () => {
  const pending = { state: STATES.ALARM_PENDING, alarmStartedAtMs: NOW - MIN_DELAY_MS };
  assert.equal(releaseDue(context({ ...pending, serverNowMs: NOW - 1 })), false);
  assert.equal(releaseDue(context(pending)), true);
  assert.equal(releaseDue(context({ ...pending, actorId: 'stranger' })), true);
  for (const actorId of ['trusted-server', 'owner', 'heir-a', 'stranger']) {
    assert.equal(decide(context({ ...pending, actorId }), 'RELEASE').allowed, false);
  }
  assert.equal(releaseDue(context({ state: STATES.REVOKED })), false);
});
test('key envelope is denied until released and only invited heir can read', () => {
  assert.equal(decide(context(), 'READ_HEIR_ENVELOPE').allowed, false);
  assert.equal(decide(context({ state: STATES.RELEASED }), 'READ_HEIR_ENVELOPE').allowed, true);
  assert.equal(decide(context({ state: STATES.RELEASED, actorId: 'stranger' }), 'READ_HEIR_ENVELOPE').allowed, false);
  assert.equal(decide(context({ state: STATES.REVOKED }), 'READ_HEIR_ENVELOPE').allowed, false);
});
test('malformed timestamps, states and identity context fail closed', () => {
  for (const change of [
    { state: 'UNLOCKED' }, { serverNowMs: NaN }, { actorId: '' },
    { activeHeirIds: null }, { version: -1 },
    { state: STATES.ALARM_PENDING, alarmStartedAtMs: NOW + 1 }
  ]) assert.throws(() => decide(context(change), 'READ_HEIR_ENVELOPE'), /invalid_/);
  assert.equal(decide(context(), 'NOT_A_REAL_ACTION').allowed, false);
});
test('no side effects and version increments only for transitions', () => {
  const input = Object.freeze(context());
  assert.equal(decide(input, 'TRIGGER_ALARM').nextVersion, 3);
  assert.equal(decide(input, 'READ_HEIR_ENVELOPE').nextVersion, 2);
  assert.equal(input.state, STATES.LOCKED);
});
