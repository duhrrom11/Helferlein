'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { handleNachlassV2 } = require('../tools/digitaler-nachlass/server-api-v2.cjs');
const url = 'https://localhost/v2/vaults/v_123456789/alarm';
const request = (urlValue = url, options = {}) => new Request(urlValue, { method: 'POST', ...options });

test('API defaults to unavailable with no sensitive response', async () => {
  const response = await handleNachlassV2(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'not_configured' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});
test('all future operations remain disabled', async () => {
  for (const action of ['alarm', 'check-in', 'revoke', 'heir-envelope']) {
    const response = await handleNachlassV2(request(url.replace('/alarm', '/' + action)));
    assert.equal(response.status, 503);
  }
});
test('spoofed authentication, owner and release flags never enable access', async () => {
  const response = await handleNachlassV2(request(url, {
    headers: { authorization: 'Bearer fake', 'content-type': 'application/json' },
    body: JSON.stringify({
      actorId: 'trusted-server', ownerId: 'owner', state: 'RELEASED',
      serverNowMs: 9999999999999, releaseAt: 0, keyEnvelope: 'secret'
    })
  }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret|trusted-server|owner/);
});
test('rejects unknown paths and methods without echoing values', async () => {
  assert.equal((await handleNachlassV2(request('https://localhost/v2/vaults/bad/alarm'))).status, 404);
  assert.equal((await handleNachlassV2(request(url.replace('alarm', 'dump-all')))).status, 404);
  assert.equal((await handleNachlassV2(new Request(url, { method: 'GET' }))).status, 405);
  assert.equal((await handleNachlassV2(new Request(url, { method: 'OPTIONS' }))).status, 405);
});
test('rejects oversized declared requests without reading bodies', async () => {
  const response = await handleNachlassV2(request(url, {
    headers: { 'content-length': '9999999' }
  }));
  assert.equal(response.status, 413);
});
