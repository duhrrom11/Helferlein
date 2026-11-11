/** Isolated PostgreSQL-17 CI only. Never point at production. */
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import pg from 'pg';
import { createHeirPgTransactionAdapter } from '../../supabase/functions/_shared/heir-pg-transaction-adapter.ts';
import { createHeirPgAdmission } from '../../supabase/functions/_shared/heir-http-rate-limit-staging.ts';

if (process.env.HEIR_ISOLATED_TEST_DB !== '1' || process.env.PGDATABASE !== 'helferlein_heir_ci' ||
    process.env.PGHOST !== '127.0.0.1' || process.env.PGUSER !== 'heir_ci_backend') {
  throw new Error('isolated_database_only');
}
globalThis.crypto ??= webcrypto;
const pool = new pg.Pool({
  host: process.env.PGHOST, port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER, password: process.env.HEIR_CI_ROLE_PASSWORD,
  database: process.env.PGDATABASE, max: 10,
});
try {
  const db = createHeirPgTransactionAdapter(pool);
  const admission = createHeirPgAdmission(db, { remoteIdentity: async () => 'test-runner-loopback' });
  const request = new Request('https://backend.example.invalid/v1/heirs/invitations/create', { method: 'GET' });
  const route = '/v1/heirs/invitations/create';
  const attempts = await Promise.all(Array.from({ length: 36 }, () => admission.preAuth(request, route)));
  assert.equal(attempts.filter(Boolean).length, 30, 'atomic concurrent pre-auth limit: exactly 30 accepted');
  assert.equal(await admission.preAuth(request, route), false);
  // Dedicated synthetic quota identity: independent of the owner E2E requests.
  const uid = '99999999-9999-4999-8999-999999999999';
  const userAttempts = await Promise.all(Array.from({ length: 6 }, () => admission.user(uid, route)));
  assert.equal(userAttempts.filter(Boolean).length, 3, 'atomic user invite limit: exactly 3 accepted');
  assert.equal(await admission.user(uid, '/v1/heirs/invitations/redeem'), true);
  console.log(JSON.stringify({ status:'passed', engine:'PostgreSQL 17', limiter:'real restricted SQL role', checks:['concurrent pre-auth 30/36', 'concurrent user invite 3/6', 'separate route bucket'] }));
} finally { await pool.end(); }
