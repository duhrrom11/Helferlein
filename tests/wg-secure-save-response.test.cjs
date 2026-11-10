'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'tools', 'wg-organisator', 'index.html'), 'utf8');
const start = html.indexOf('async function saveSecureWg(payload');
const end = html.indexOf('const kofiSprueche', start);
assert.ok(start >= 0 && end > start, 'secure WG save implementation exists');
const source = html.slice(start, end);

async function scenario(kind) {
  let resolveRequest, requestStarted;
  const response = new Promise(resolve => { resolveRequest = resolve; });
  const started = new Promise(resolve => { requestStarted = resolve; });
  const context = vm.createContext({
    wgBinId: 'secure_AAAA',
    secureWgRevision: '2026-01-01T00:00:00.000Z',
    secureWgSaveBlocked: false,
    SECURE_WG_PREFIX: 'secure_',
    getAuthenticatedWgUser: async () => ({ id: 'user' }),
    supabaseClient: {
      from: () => ({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: () => { requestStarted(); return response; }
              })
            })
          })
        })
      })
    }
  });
  vm.runInContext(source, context);
  const pending = vm.runInContext('saveSecureWg({ data: [] })', context);
  await started;
  if (kind === 'switch') {
    context.wgBinId = 'secure_BBBB';
    context.secureWgRevision = '2026-03-01T00:00:00.000Z';
  }
  resolveRequest(kind === 'network'
    ? { data: null, error: { message: 'network' } }
    : kind === 'conflict'
      ? { data: null, error: null }
      : { data: { updated_at: '2026-02-01T00:00:00.000Z' }, error: null });
  let result;
  try { result = await pending; } catch (error) { result = error.message; }
  return { context, result };
}

test('successful secure save updates revision', async () => {
  const { context, result } = await scenario('success');
  assert.equal(result, true);
  assert.equal(context.secureWgRevision, '2026-02-01T00:00:00.000Z');
});
test('network error preserves revision and allows retry', async () => {
  const { context, result } = await scenario('network');
  assert.equal(result, 'network');
  assert.equal(context.secureWgRevision, '2026-01-01T00:00:00.000Z');
  assert.equal(context.secureWgSaveBlocked, false);
});
test('revision conflict blocks subsequent writes', async () => {
  const { context, result } = await scenario('conflict');
  assert.match(result, /Speicherkonflikt/);
  assert.equal(context.secureWgSaveBlocked, true);
});
test('late response for old WG cannot alter new WG revision', async () => {
  const { context, result } = await scenario('switch');
  assert.equal(result, false);
  assert.equal(context.secureWgRevision, '2026-03-01T00:00:00.000Z');
  assert.equal(context.secureWgSaveBlocked, false);
});
