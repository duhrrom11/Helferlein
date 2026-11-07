#!/usr/bin/env node
// Isolierter Smoke-Test gegen eine eigens bereitgestellte Supabase-TEST-Edge-Function.
// Aufruf: VAULT_API_TEST_URL=https://TESTPROJECT.supabase.co/functions/v1/vault-api \
//         VAULT_API_TEST_ANON_KEY=... node tests/vault-api-smoke.cjs
// Keine produktiven Zugangsdaten oder Tresor-IDs verwenden.
const assert = require('node:assert/strict');

const url = process.env.VAULT_API_TEST_URL;
const anonKey = process.env.VAULT_API_TEST_ANON_KEY;
if (!url || !anonKey) {
  console.error('Testumgebung fehlt: VAULT_API_TEST_URL und VAULT_API_TEST_ANON_KEY setzen.');
  process.exit(2);
}
let parsed;
try { parsed = new URL(url); } catch { console.error('Ungueltige Test-URL'); process.exit(2); }
if (parsed.protocol !== 'https:' || !parsed.pathname.endsWith('/functions/v1/vault-api')) {
  console.error('Nur HTTPS-URL einer vault-api Edge Function erlaubt.');
  process.exit(2);
}
if (parsed.hostname === 'avapuibsidubuzxjtyld.supabase.co') {
  console.error('Produktives Supabase-Projekt ist fuer Smoke-Tests gesperrt.');
  process.exit(2);
}

async function check(name, request, expectedStatuses) {
  const response = await fetch(url, {
    ...request,
    headers: { apikey: anonKey, ...(request.headers || {}) },
    signal: AbortSignal.timeout(10000)
  });
  assert.ok(expectedStatuses.includes(response.status),
    name + ': HTTP ' + response.status + ' statt ' + expectedStatuses.join('/'));
  const body = await response.text();
  assert.ok(body.length < 8192, name + ': Antwort unerwartet gross');
  assert.doesNotMatch(body, /encryptedData|masterKeyHex|service_role/i,
    name + ': potenziell sensible Antwort');
  console.log('OK:', name, '(' + response.status + ')');
}

(async () => {
  await check('kein Token', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ vaultId: 'v_test12345678' })
  }, [401, 403]);
  await check('ungueltiger Token', {
    method: 'POST',
    headers: { authorization: 'Bearer definitely-invalid', 'content-type': 'application/json' },
    body: JSON.stringify({ vaultId: 'v_test12345678' })
  }, [401, 403]);
  await check('fremder Origin Preflight', {
    method: 'OPTIONS',
    headers: { Origin: 'https://attacker.example', 'access-control-request-method': 'POST' }
  }, [403, 401]); // Gateway kann OPTIONS vor Funktionscode blockieren.
  await check('gueltiger Origin Preflight', {
    method: 'OPTIONS',
    headers: { Origin: 'https://duhrrom11.github.io', 'access-control-request-method': 'POST' }
  }, [204, 401, 403]); // 401/403 hier zeigt Gateway-Konfigurationsbedarf an.
  console.log('Basistests abgeschlossen; Gateway-Status bei OPTIONS separat bewerten.');
})().catch(error => {
  console.error('Smoke-Test fehlgeschlagen:', error.message);
  process.exitCode = 1;
});
