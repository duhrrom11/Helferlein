import test from 'node:test';
import assert from 'node:assert/strict';
import { composeHeirServerStaging } from '../../supabase/functions/_shared/heir-server-composition-staging.ts';

const OWNER = '11111111-1111-4111-8111-111111111111';
const HEIR = '22222222-2222-4222-8222-222222222222';
const ORIGIN = 'https://example.org';
const VAULT = 'v_abcdefgh';

function sandbox() {
  const calls = { auth: 0, rate: 0, invites: 0 };
  const deps = {
    database: {
      async transaction(fn) {
        const tx = {
          async one(sql, args) {
            if (sql.includes('heir_http_limits')) { calls.rate++; return { hits: 1 }; }
            if (sql.includes('public.vault_cloud_snapshots')) {
              return args[0] === OWNER ? { vault_id: VAULT } : null;
            }
            if (sql.includes('count(*)::int AS n')) return { n: 0 };
            return null;
          },
          async exec(sql) {
            if (sql.includes('INSERT INTO heir_private.heir_invitations')) {
              calls.invites++;
              return 1;
            }
            return 0;
          },
        };
        return fn(tx);
      },
    },
    supabaseAuth: {
      auth: {
        async getUser(token) {
          calls.auth++;
          return token === 'valid_token_abcdefg'
            ? { data: { user: { id: OWNER } }, error: null }
            : { data: { user: null }, error: 'invalid' };
        },
      },
    },
    trustedIngress: {
      async remoteIdentity() { return 'ci-loopback-test-only'; },
    },
    allowedOrigins: [ORIGIN],
  };
  return { deps, calls, handler: composeHeirServerStaging(deps) };
}

function req(path, data, token='valid_token_abcdefg', origin=ORIGIN) {
  return new Request('https://api.example.org' + path, {
    method: 'POST',
    headers: { origin, authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
}

test('inert assembly fails closed unless all trusted dependencies are supplied', () => {
  assert.throws(() => composeHeirServerStaging({}), /unconfigured/);
  const { deps } = sandbox();
  assert.throws(() => composeHeirServerStaging({ ...deps, trustedIngress: null }), /unconfigured/);
  assert.throws(() => composeHeirServerStaging({ ...deps, allowedOrigins: ['*'] }), /unconfigured/);
});

test('owner invitation flows through real composed HTTP, Supabase getUser and DB admission', async () => {
  const { handler, calls } = sandbox();
  const response = await handler(req('/v1/heirs/invitations/create',
    { vaultId: VAULT, intendedUserId: HEIR, ttlSeconds: 3600 }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(Object.keys(data).sort(), ['ok', 'token']);
  assert.match(data.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(calls.invites, 1);
  assert.ok(calls.auth >= 2, 'HTTP and domain both verify the token');
  assert.equal(calls.rate, 2, 'pre-auth and verified-user quotas both used');
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
});

test('unknown requests, forged owner fields and invalid bearer never mutate invitations', async () => {
  const { handler, calls } = sandbox();
  assert.equal((await handler(req('/v1/heirs/envelopes/fetch', {}))).status, 404);
  assert.equal((await handler(req('/v1/heirs/invitations/create',
    { vaultId: VAULT, intendedUserId: HEIR, ttlSeconds: 3600, ownerUserId: OWNER }))).status, 400);
  assert.equal((await handler(req('/v1/heirs/invitations/create',
    { vaultId: VAULT, intendedUserId: HEIR, ttlSeconds: 3600 }, 'invalid_token_abcde'))).status, 401);
  assert.equal((await handler(req('/v1/heirs/invitations/create',
    { vaultId: VAULT, intendedUserId: HEIR, ttlSeconds: 3600 }, 'valid_token_abcdefg',
    'https://evil.example.org'))).status, 403);
  assert.equal(calls.invites, 0);
});

test('HTTP invitation list excludes token material and rejects unverified identity', async () => {
  const { handler, deps } = sandbox();
  // CI memory adapter provides only a metadata result; the real SQL query is
  // exercised in the isolated PostgreSQL 17 service integration test.
  const original = deps.database.transaction;
  deps.database.transaction = async work => original(async tx => {
    const one = tx.one;
    tx.one = async (sql, args) => sql.includes('jsonb_agg(')
      ? { invitations: [{ invitationId: '44444444-4444-4444-8444-444444444444',
          intendedUserId: HEIR, status: 'pending', createdAt: '2026-11-11T00:00:00Z',
          expiresAt: '2026-11-12T00:00:00Z', token_hash: 'secret' }] }
      : one(sql, args);
    return work(tx);
  });
  const response = await handler(req('/v1/heirs/invitations/list',{vaultId:VAULT}));
  assert.equal(response.status,200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ['hasMore','invitations','ok']);
  assert.deepEqual(Object.keys(body.invitations[0]).sort(),
    ['createdAt','expiresAt','intendedUserId','invitationId','status']);
  assert.equal(JSON.stringify(body).includes('secret'), false);
  const denied = await handler(req('/v1/heirs/invitations/list',{vaultId:VAULT},'invalid_token_abcde'));
  assert.equal(denied.status,401);
});
