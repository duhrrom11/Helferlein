'use strict';
// Offline-only checks: never requests the public site or production services.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const base = 'https://duhrrom11.github.io/Helferlein/';
function localFile(url, label) {
  const parsed = new URL(url, base);
  assert.equal(parsed.origin, new URL(base).origin, label + ': unexpected origin');
  assert.ok(parsed.pathname.startsWith('/Helferlein/'), label + ': outside project root');
  const relative = decodeURIComponent(parsed.pathname.slice('/Helferlein/'.length));
  assert.ok(relative && !relative.split('/').includes('..'), label + ': unsafe path');
  const full = path.resolve(root, relative);
  assert.ok(full.startsWith(root + path.sep), label + ': outside checkout');
  assert.ok(fs.existsSync(full) && fs.statSync(full).isFile(), label + ': missing ' + relative);
  return relative;
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const entries = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m => m[1].trim());
assert.ok(entries.length >= 12, 'sitemap should list the homepage and 11 tools');
assert.equal(new Set(entries).size, entries.length, 'duplicate sitemap URL');
for (const entry of entries) localFile(entry, 'sitemap');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.ok(typeof manifest.name === 'string' && manifest.name.trim(), 'manifest name missing');
assert.ok(typeof manifest.short_name === 'string' && manifest.short_name.trim(), 'manifest short_name missing');
assert.equal(manifest.display, 'standalone', 'unexpected manifest display');
localFile(manifest.start_url, 'manifest start_url');
for (const icon of manifest.icons || []) localFile(icon.src, 'manifest icon');
console.log(`Site integrity OK: ${entries.length} sitemap URLs, manifest start URL, ${(manifest.icons || []).length} icons`);
