'use strict';
// Fully offline smoke-script regression: fetch is replaced before the script loads.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const script = path.join(__dirname, 'vault-api-smoke.cjs');

function run(url, mocked = false) {
  const code = mocked
    ? `const originalTimeout = AbortSignal.timeout;
      AbortSignal.timeout = (milliseconds) => {
        if (milliseconds !== 10000) throw Error('Timeout must be exactly 10000 ms');
        return originalTimeout(milliseconds);
      };
      globalThis.fetch = async (_url, options) => {
        if (options.redirect !== 'manual') throw Error('Redirects must be disabled');
        if (!options.signal || typeof options.signal.addEventListener !== 'function')
          throw Error('Request timeout signal missing');
        return {status: 401, text: async () => ''};
      };
      require(${JSON.stringify(script)});`
    : `globalThis.fetch = () => { throw Error('Unexpected network request'); };
      require(${JSON.stringify(script)});`;
  return spawnSync(process.execPath, ['-e', code], {
    encoding: 'utf8', timeout: 5000,
    env: {
      ...process.env,
      VAULT_API_TEST_URL: url,
      VAULT_API_TEST_ANON_KEY: 'offline-placeholder',
      VAULT_API_TEST_TOKEN_A: '',
      VAULT_API_TEST_TOKEN_B: '',
      VAULT_API_TEST_VAULT_ID: ''
    }
  });
}

test('rejects production Supabase host before any request', () => {
  const result = run('https://avapuibsidubuzxjtyld.supabase.co/functions/v1/vault-api');
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /Produktives Supabase-Projekt/);
});
test('rejects URLs containing embedded credentials or query strings', () => {
  for (const url of [
    'https://name:pass@abcdefghijklmnopqrst.supabase.co/functions/v1/vault-api',
    'https://abcdefghijklmnopqrst.supabase.co/functions/v1/vault-api?token=abc',
    'http://abcdefghijklmnopqrst.supabase.co/functions/v1/vault-api',
    'https://example.com/functions/v1/vault-api'
  ]) {
    const result = run(url);
    assert.equal(result.status, 2, url + ': ' + result.stderr);
  }
});
test('uses manual redirects and a timeout signal for requests', () => {
  const result = run('https://abcdefghijklmnopqrst.supabase.co/functions/v1/vault-api', true);
  // The mocked 401 is sufficient for the first two checks; the OPTIONS check
  // must fail on status, proving the request was intercepted without network.
  assert.equal(result.status, 1, result.stderr);
  assert.doesNotMatch(result.stderr, /timeout signal missing|Timeout must be exactly 10000 ms|Redirects must be disabled/);
  assert.match(result.stderr, /Smoke-Test fehlgeschlagen/);
});
