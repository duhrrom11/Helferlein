'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routes = [...new Set([...home.matchAll(/href=["'](tools\\/[^"'#?]+\\.html)["']/g)].map(match => match[1]))];
assert.ok(routes.length >= 11, 'Expected all eleven tool routes on the homepage');
let checks = 1;
for (const route of routes) {
  const absolute = path.resolve(root, route);
  assert.ok(absolute.startsWith(root + path.sep), 'Route escapes repository: ' + route);
  assert.ok(fs.existsSync(absolute), 'Missing linked tool: ' + route);
  const html = fs.readFileSync(absolute, 'utf8');
  assert.match(html, /<title[^>]*>[^<]+<\\/title>/i, 'Missing title: ' + route);
  assert.match(html, /<meta[^>]+charset=/i, 'Missing charset: ' + route);
  assert.match(html, /<meta[^>]+name=["']viewport/i, 'Missing mobile viewport: ' + route);
  assert.match(html, /<body[\\s>]/i, 'Missing body: ' + route);
  checks += 6;
}
assert.match(home, /<title[^>]*>[^<]+<\\/title>/i, 'Homepage title missing');
checks++;
console.log('Production route smoke OK: ' + routes.length + ' tools, ' + checks + ' assertions');
