'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const html = readFileSync(resolve(__dirname, '../../tools/digitaler-nachlass/erben.html'), 'utf8');

test('no legacy Firebase/EmailJS, remote scripts, alarm, countdown, decryption or network connectivity', () => {
  for (const denied of [/firebase/i, /firestore/i, /emailjs/i, /<script\s+[^>]*src=/i, /fetch\s*\(/i, /XMLHttpRequest/i, /decryptVaultData/i, /triggerEmergencyAlarm/i, /24-Stunden-Notfall/i]) {
    assert.doesNotMatch(html, denied);
  }
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /Erben-Portal derzeit gesperrt/);
  assert.doesNotMatch(html, /<form\b/i);
});

test('query and fragment are removed without reading secret values', () => {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'early scrub script missing');
  for (const [search, hash] of [['?vaultId=v_abcdefghi&key=private', '#key=secret'], ['', '#key=secret'], ['?key=secret', '']]) {
    const calls = [];
    const location = { pathname: '/Helferlein/tools/digitaler-nachlass/erben.html', search, hash };
    const history = { replaceState(...args) { calls.push(args); } };
    vm.runInNewContext(match[1], { location, history }, { timeout: 500 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][2], location.pathname);
  }
});

test('scrubbing is before any page content; no inherited remote styles/scripts', () => {
  const scrub = html.indexOf('<script>');
  const body = html.indexOf('<body>');
  assert.ok(scrub > 0 && scrub < body);
  assert.doesNotMatch(html, /https?:\/\//i);
});
