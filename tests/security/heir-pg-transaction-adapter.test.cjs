'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(resolve(__dirname, '../../supabase/functions/_shared/heir-pg-transaction-adapter.ts'), 'utf8');
// Node 22 type-stripping retains TS import type statements on some versions.
const js = stripTypeScriptTypes(source, { mode: 'strip' }).replace(/^import type .*;\s*/gm, '').replace(/^export /gm, '');
const make = vm.runInNewContext(js + '\ncreateHeirPgTransactionAdapter', { Number, Error }, { timeout: 1000 });
function mockedPool(failOn) {
  const queries = []; let released = 0;
  return {
    queries,
    get released() { return released; },
    async connect() {
      return {
        async query(sql, params = []) {
          queries.push({ sql, params });
          if (sql === failOn) throw Error('failed query');
          if (/^SELECT/.test(sql)) return { rows: [{ owner_user_id: 'owner' }], rowCount: 1 };
          return { rows: [], rowCount: /^INSERT/.test(sql) ? 1 : null };
        },
        release() { released++; },
      };
    },
  };
}
test('successful transaction parameterizes queries, commits and releases exactly once', async () => {
  const pool = mockedPool();
  const tx = make(pool);
  const result = await tx.transaction(async q => {
    assert.equal((await q.one('SELECT owner_user_id FROM public.vault_cloud_snapshots WHERE owner_user_id=$1', ['uuid'])).owner_user_id, 'owner');
    return q.exec('INSERT INTO heir_private.heir_invitations VALUES($1)', ['parameter-not-interpolated']);
  });
  assert.equal(result, 1);
  assert.equal(pool.queries.at(-1).sql, 'COMMIT');
  assert.equal(pool.queries.find(x=>x.sql.startsWith('INSERT')).params[0], 'parameter-not-interpolated');
  assert.equal(pool.released, 1);
});
test('failed unit rolls back and releases connection', async () => {
  const pool = mockedPool(); const tx = make(pool);
  await assert.rejects(tx.transaction(async q => { await q.exec('INSERT INTO heir_private.heir_invitations VALUES($1)', ['secret']); throw Error('rejected'); }));
  assert.equal(pool.queries.at(-1).sql, 'ROLLBACK');
  assert.equal(pool.released, 1);
});
test('driver failure rolls back and releases connection; no commit follows failure', async () => {
  const pool = mockedPool('INSERT INTO heir_private.heir_invitations VALUES($1)'); const tx = make(pool);
  await assert.rejects(tx.transaction(q => q.exec('INSERT INTO heir_private.heir_invitations VALUES($1)', ['secret'])));
  assert.equal(pool.queries.at(-1).sql, 'ROLLBACK');
  assert.equal(pool.queries.some(x=>x.sql === 'COMMIT'), false);
  assert.equal(pool.released, 1);
});
