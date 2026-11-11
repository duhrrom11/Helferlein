'use strict';
// Offline handler contract tests. These do not prove live JWT validation or RLS.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const source = readFileSync(resolve(__dirname, '../../supabase/functions/vault-api/index.ts'), 'utf8');
const OWNER = '4d9a6129-dcfb-4f93-a83e-0ac791636742';
const VAULT_ID = 'v_abcdefgh';
const encryptedSecret = { ciphertext: 'never-return-this', iv: 'secret-iv' };

function handlerFor({ owner = OWNER, dbError = null, missing = false } = {}) {
  let handler;
  let usedServiceKey = false;
  let usedJwtForQuery = false;
  const createClient = (_url, key, options = {}) => {
    if (key === 'service-secret') usedServiceKey = true;
    const authHeader = options.global?.headers?.Authorization;
    return {
      auth: {
        getUser: async (token) => token === 'owner-token'
          ? { data: { user: { id: OWNER } }, error: null }
          : { data: { user: null }, error: { message: 'denied' } },
      },
      from: (table) => {
        assert.equal(table, 'vault_cloud_snapshots');
        assert.equal(authHeader, 'Bearer owner-token');
        usedJwtForQuery = true;
        const filters = {};
        return {
          select(columns) {
            assert.equal(columns, 'vault_id, owner_user_id, updated_at');
            return this;
          },
          eq(column, value) {
            filters[column] = value;
            return this;
          },
          async maybeSingle() {
            assert.equal(filters.vault_id, VAULT_ID);
            assert.equal(filters.owner_user_id, OWNER);
            return dbError
              ? { data: null, error: { code: dbError } }
              : { data: missing ? null : { vault_id: VAULT_ID, owner_user_id: owner, updated_at: '2026-11-10T00:00:00Z', encrypted_data: encryptedSecret }, error: null };
          },
        };
      },
    };
  };
  // Remove only the import; Node's built-in TS stripper handles the rest.
  const javascript = stripTypeScriptTypes(source.replace('import { createClient } from "npm:@supabase/supabase-js@2";', ''), { mode: 'strip' });
  vm.runInNewContext(javascript, {
    createClient,
    Deno: {
      serve: fn => { handler = fn; },
      env: { get: key => ({ SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'publishable-key', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' })[key] },
    },
    Request, Response, Headers, TextDecoder, Uint8Array, console,
  }, { timeout: 1000 });
  assert.equal(typeof handler, 'function');
  return { handler, flags: () => ({ usedServiceKey, usedJwtForQuery }) };
}
function request(token = 'owner-token', body = { vaultId: VAULT_ID }) {
  return new Request('https://example.invalid/functions/v1/vault-api', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  });
}
test('owner sees metadata only via JWT-scoped client, no service role or ciphertext', async () => {
  const app = handlerFor();
  const res = await app.handler(request());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { vaultId: VAULT_ID, updatedAt: '2026-11-10T00:00:00Z', access: 'owner_metadata_only' });
  assert.deepEqual(app.flags(), { usedServiceKey: false, usedJwtForQuery: true });
});
test('missing or invalid bearer token rejected before any query', async () => {
  for (const token of [null, 'invalid-token']) {
    const app = handlerFor();
    const res = await app.handler(request(token));
    assert.equal(res.status, 401);
    assert.equal(app.flags().usedJwtForQuery, false);
  }
});
test('foreign owner and missing vault are indistinguishable not-found responses', async () => {
  const foreign = handlerFor({ owner: '00000000-0000-4000-8000-000000000000' });
  const missing = handlerFor({ missing: true });
  const a = await foreign.handler(request());
  const b = await missing.handler(request());
  assert.equal(a.status, 404);
  assert.equal(b.status, 404);
  assert.deepEqual(await a.json(), await b.json());
});
test('database error fails closed and does not expose details', async () => {
  const app = handlerFor({ dbError: '42501' });
  const res = await app.handler(request());
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'service_unavailable' });
});
test('invalid vault id fails before database access', async () => {
  const app = handlerFor();
  const res = await app.handler(request('owner-token', { vaultId: 'v_bad' }));
  assert.equal(res.status, 400);
  assert.equal(app.flags().usedJwtForQuery, false);
});
