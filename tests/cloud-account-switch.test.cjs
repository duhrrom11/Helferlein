/* Offline account-boundary regression. Does not connect to Supabase. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync('shared/helferlein-cloud-migration.js', 'utf8');

function harness(shared, uid) {
  const elements = [];
  const events = new Map();
  let reloads = 0;
  const classes = new Set(['helferlein-account-check']);
  class Element {
    constructor(tag) {
      this.tagName = tag;
      this.children = [];
      this.attrs = {};
      this.listeners = {};
      this.style = {};
      this.classList = {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name)
      };
      this.value = '';
      elements.push(this);
    }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.children.push(node); }
    prepend(...nodes) { this.children.unshift(...nodes); }
    setAttribute(key, val) { this.attrs[key] = val; }
    removeAttribute(key) { delete this.attrs[key]; }
    addEventListener(key, cb) { this.listeners[key] = cb; }
    remove() { this.removed = true; }
    focus() {}
    querySelectorAll(selector) { return elements.filter(e => e.tagName === selector); }
  }
  const document = {
    documentElement: { classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) } },
    body: new Element('body'),
    createElement: tag => new Element(tag),
    addEventListener() {},
    removeEventListener() {},
    visibilityState: 'visible'
  };
  const localStorage = {
    getItem: key => shared.has(key) ? shared.get(key) : null,
    setItem: (key, value) => { shared.set(key, String(value)); },
    removeItem: key => { shared.delete(key); }
  };
  const window = {
    location: { reload: () => { reloads++; } },
    addEventListener: (event, cb) => events.set(event, cb),
    removeEventListener: event => events.delete(event),
    HelferleinCloudStore: { createStore: () => ({
      dispose() {},
      status() { return {}; },
      async load() { return { source: 'cloud-empty', data: null }; },
      async hasPending() { return false; },
      async flush() { return false; }
    }) }
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: uid ? { id: uid } : null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    }
  };
  const ctx = vm.createContext({ window, document, navigator: { onLine: true },
    localStorage, setTimeout, confirm: () => true, console });
  vm.runInContext(script, ctx);
  const bridge = window.HelferleinCloudMigration.mount({
    client, tool: 'test-tool', localKey: 'test_records', collection: 'items',
    refresh() {}
  });
  async function wait() { await new Promise(resolve => setTimeout(resolve, 20)); }
  return {
    wait, bridge, classes, shared,
    get reloads() { return reloads; },
    async switch() {
      await wait();
      const button = elements.find(e => e.tagName === 'button' &&
        e.textContent === 'Zum derzeit angemeldeten Konto wechseln');
      assert.ok(button, 'account-switch action shown for mismatched owner');
      await button.listeners.click();
    }
  };
}
const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const owner = 'helferlein_cloud_owner_test-tool';
const slot = uid => 'helferlein_cloud_slot_test-tool_' + uid;
const journal = 'helferlein_cloud_switch_test-tool';

(async () => {
  const shared = new Map([[owner, A], ['test_records', JSON.stringify({ items: [{ id: 'a' }] })]]);
  const first = harness(shared, B);
  await first.switch();
  assert.equal(shared.get(owner), B);
  assert.equal(shared.has('test_records'), false, 'second account starts empty');
  assert.equal(JSON.parse(shared.get(slot(A))).bytes,
    JSON.stringify({ items: [{ id: 'a' }] }), 'original account data saved');
  assert.equal(shared.has(journal), false, 'switch journal committed');
  assert.equal(first.reloads, 1);

  shared.set('test_records', JSON.stringify({ items: [{ id: 'b' }] }));
  const second = harness(shared, A);
  await second.switch();
  assert.equal(shared.get(owner), A);
  assert.deepEqual(JSON.parse(shared.get('test_records')), { items: [{ id: 'a' }] });
  assert.equal(JSON.parse(shared.get(slot(B))).bytes,
    JSON.stringify({ items: [{ id: 'b' }] }));
  assert.equal(second.reloads, 1);

  shared.set(journal, JSON.stringify({
    from: A, bytes: JSON.stringify({ items: [{ id: 'a' }] })
  }));
  shared.set(owner, B);
  shared.set('test_records', JSON.stringify({ items: [{ id: 'b' }] }));
  const recovered = harness(shared, B);
  await recovered.wait();
  assert.equal(shared.get(owner), A, 'interrupted switch restores original owner');
  assert.deepEqual(JSON.parse(shared.get('test_records')), { items: [{ id: 'a' }] });
  assert.equal(shared.has(journal), false);
  assert.equal(recovered.reloads, 1);

  shared.set(owner, A);
  shared.set(slot(B), '{"bytes":"not-json"}');
  const rejected = harness(shared, B);
  await rejected.switch();
  assert.equal(shared.get(owner), A, 'damaged destination cannot replace active account');
  assert.equal(shared.has(journal), false);
  console.log('Cloud account switching offline regression passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
