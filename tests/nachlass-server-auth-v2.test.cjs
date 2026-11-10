'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBearer, authenticate } = require('../tools/digitaler-nachlass/server-auth-v2.cjs');
const uid = '123e4567-e89b-42d3-a456-426614174000';
const req = (header) => new Request('https://localhost/v2/vaults/v_123456789/alarm', {
  method: 'POST', headers: header ? { authorization: header } : {}
});
test('reject missing, malformed, and excessively long bearer credentials', () => {
  for (const value of [null, '', 'Basic abc', 'Bearer abc', 'Bearer x y', 'Bearer ' + 'a'.repeat(8200)]) {
    assert.throws(() => parseBearer(value), /unauthorized/);
  }
});
test('verifier is mandatory; unverified identity fails closed', async () => {
  await assert.rejects(authenticate(req('Bearer abcdefghijklmnop')), /unauthorized/);
  await assert.rejects(authenticate(req('Bearer abcdefghijklmnop'), async () => null), /unauthorized/);
  await assert.rejects(authenticate(req('Bearer abcdefghijklmnop'), async () => ({ userId: uid })), /unauthorized/);
  await assert.rejects(authenticate(req('Bearer abcdefghijklmnop'), async () => { throw Error('internal token'); }), /unauthorized/);
});
test('accept only server-verified UUID identity; never trust injected role fields', async () => {
  const principal = await authenticate(req('Bearer abcdefghijklmnop'), async token => {
    assert.equal(token, 'abcdefghijklmnop');
    return { userId: uid, verified: true, isAdmin: true, ownerId: 'other', role: 'superuser' };
  });
  assert.deepEqual(principal, { userId: uid });
  assert.equal(Object.isFrozen(principal), true);
});
test('reject invalid user ID despite verified flag', async () => {
  await assert.rejects(authenticate(req('Bearer abcdefghijklmnop'), async () =>
    ({ userId: 'attacker', verified: true })), /unauthorized/);
});
