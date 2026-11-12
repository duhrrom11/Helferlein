'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routes = [...new Set([...home.matchAll(/href=["'](tools\/[^"'#?]+\.html)["']/g)].map(match => match[1]))];
assert.ok(routes.length >= 11, 'Expected all eleven tool routes on the homepage');
let checks = 1;
for (const route of routes) {
  const absolute = path.resolve(root, route);
  assert.ok(absolute.startsWith(root + path.sep), 'Route escapes repository: ' + route);
  assert.ok(fs.existsSync(absolute), 'Missing linked tool: ' + route);
  const html = fs.readFileSync(absolute, 'utf8');
  assert.match(html, /<title[^>]*>[^<]+<\/title>/i, 'Missing title: ' + route);
  assert.match(html, /<meta[^>]+charset=/i, 'Missing charset: ' + route);
  assert.match(html, /<meta[^>]+name=["']viewport/i, 'Missing mobile viewport: ' + route);
  assert.match(html, /<body[\s>]/i, 'Missing body: ' + route);
  checks += 6;
}
assert.match(home, /<title[^>]*>[^<]+<\/title>/i, 'Homepage title missing');
checks++;
console.log('Production route smoke OK: ' + routes.length + ' tools, ' + checks + ' assertions');

// A11: Chart.js canvases must have an accessible name; camera preview is not a data chart.
for (const tool of ['haushaltsbuch-kassenbon', 'wg-organisator']) {
  const html = fs.readFileSync(path.join(root, 'tools', tool, 'index.html'), 'utf8');
  for (const id of ['categoryChart', 'cashflowChart']) {
    const match = html.match(new RegExp('<canvas\\b[^>]*\\bid="' + id + '"[^>]*>', 'i'));
    assert.ok(match, 'Missing financial chart: ' + tool + '/' + id);
    assert.match(match[0], /\brole="img"/, 'Missing chart image semantics: ' + tool + '/' + id);
    assert.match(match[0], /\baria-label="[^"]+"/, 'Missing chart accessible name: ' + tool + '/' + id);
  }
}

// A11: data-dependent chart text alternatives must be present and use safe text output.
for (const tool of ['haushaltsbuch-kassenbon', 'wg-organisator']) {
  const html = fs.readFileSync(path.join(root, 'tools', tool, 'index.html'), 'utf8');
  for (const id of ['categoryChart', 'cashflowChart']) {
    assert.match(html, new RegExp('id="' + id + 'Summary"'), 'Missing chart text summary: ' + tool + '/' + id);
    assert.match(html, new RegExp("getElementById\\('" + id + "Summary'\\)\\.textContent"), 'Summary must be updated safely: ' + tool + '/' + id);
  }
  assert.match(html, /Object\\.entries\\(categoryExpenses\\)/, 'Category summary must derive from real chart values: ' + tool);
  assert.match(html, /formatChartAmount\\(totalIncome - totalExpense\\)/, 'Cashflow summary must include calculated balance: ' + tool);
}
