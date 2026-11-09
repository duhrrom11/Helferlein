const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const homepage = fs.readFileSync('index.html', 'utf8');
// Offline release guardrails: structural checks, not browser tests.
assert.match(homepage, /<html\b[^>]*\blang=["']de["']/i, 'Homepage must declare German language');
assert.match(homepage, /<title>[^<\s][^<]*<\/title>/i, 'Homepage must have a nonempty title');
assert.match(homepage, /<meta\s+name=["']viewport["'][^>]*>/i, 'Homepage must declare a mobile viewport');
assert.match(homepage, /<meta\s+name=["']description["'][^>]*content=["'][^"']+["']/i, 'Homepage must have a nonempty SEO description');
assert.match(homepage, /<link\s+rel=["']canonical["'][^>]*href=["']https:\/\/[^"']+["']/i, 'Homepage must declare an HTTPS canonical URL');

const linkedTools = [...new Set(
  [...homepage.matchAll(/(?:href|src)="(tools\/[^"#?]+\.html)"/g)]
    .map(match => match[1])
)];
assert.ok(linkedTools.length >= 11, 'Homepage must link to all 11 tools');
for (const tool of linkedTools) {
  assert.match(tool, /^tools\\/[a-z0-9-]+\\/index\\.html$/, 'Unexpected tool link path: ' + tool);
  assert.ok(fs.existsSync(tool), 'Linked tool page is missing: ' + tool);
}
const files = ['index.html', ...linkedTools];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /<!doctype html>/i, file + ' must be an HTML document');
  assert.match(html, /<html\\b/i, file + ' must contain an html element');
  assert.match(html, /<title>[^<\\s][^<]*<\\/title>/i, file + ' must have a nonempty title');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let checkedScripts = 0;
  let checkedJson = 0;
  for (const [index, match] of scripts.entries()) {
    const attrs = match[1];
    const code = match[2];
    if (!code.trim()) continue;
    const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase().trim() || '';
    if (type === 'application/ld+json' || type === 'application/json') {
      JSON.parse(code);
      checkedJson++;
    } else if (!type || type === 'text/javascript' || type === 'application/javascript' || type === 'module') {
      new vm.Script(code, { filename: file + '#inline-' + index });
      checkedScripts++;
    }
  }
  console.log('OK', file, checkedScripts, 'inline scripts,', checkedJson, 'JSON blocks');
}
for (const target of linkedTools) {
  assert.ok(homepage.includes(target), 'Homepage must link to ' + target);
}
console.log('Release smoke checks passed');
