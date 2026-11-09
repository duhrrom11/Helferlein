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
if (parsed.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(parsed.hostname) ||
    parsed.pathname !== '/functions/v1/vault-api' || parsed.search || parsed.hash ||
    parsed.username || parsed.password || parsed.port) {
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
    redirect: 'manual', // Keine Weitergabe des apikey-Headers an Redirect-Ziele.
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
  }, [204]); // Browser-Preflight muss die Function erreichen.
  // Erweiterte Tests nur mit zwei getrennten TEST-Konten und serverseitig
  // dem Konto A zugeordnetem Test-Tresor aktivieren.
  const tokenA = process.env.VAULT_API_TEST_TOKEN_A;
  const tokenB = process.env.VAULT_API_TEST_TOKEN_B;
  const testVaultId = process.env.VAULT_API_TEST_VAULT_ID;
  const provided = [tokenA, tokenB, testVaultId].filter(Boolean).length;
  if (provided !== 0 && provided !== 3) {
    throw new Error('Fuer Eigentuemertests muessen TOKEN_A, TOKEN_B und VAULT_ID gemeinsam gesetzt sein.');
  }
  if (provided === 3) {
    assert.match(testVaultId, /^v_[A-Za-z0-9_-]{8,80}$/);
    assert.notEqual(tokenA, tokenB, 'Testkonten muessen verschiedene Tokens besitzen');
    const post = token => ({
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ vaultId: testVaultId })
    });
    await check('fremdes Konto darf Tresor nicht sehen', post(tokenB), [404]);
    await check('Eigentuemer erhaelt noch keine Tresordaten', post(tokenA), [503]);
    await check('ungueltige Tresor-ID mit gueltiger Anmeldung', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + tokenA, 'content-type': 'application/json' },
      body: JSON.stringify({ vaultId: '../invalid' })
    }, [400]);
    await check('uebergrosser JSON-Body mit gueltiger Anmeldung', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + tokenA, 'content-type': 'application/json' },
      body: JSON.stringify({ vaultId: testVaultId, padding: 'x'.repeat(5000) })
    }, [413]);
    console.log('Eigentuemer- und Body-Limit-Tests abgeschlossen.');
  } else {
    console.log('Eigentuemertests uebersprungen (keine Test-Tokens gesetzt).');
  }
  console.log('Basistests abgeschlossen.');
})().catch(error => {
  console.error('Smoke-Test fehlgeschlagen:', error.message);
  process.exitCode = 1;
});
