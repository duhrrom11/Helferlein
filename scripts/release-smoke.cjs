const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const homepage = fs.readFileSync('index.html', 'utf8');
const linkedTools = [...new Set(
  [...homepage.matchAll(/(?:href|src)="(tools\/[^"#?]+\.html)"/g)]
    .map(match => match[1])
)];
assert.ok(linkedTools.length >= 11, 'Homepage must link to all 11 tools');
const files = ['index.html', ...linkedTools];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /<!doctype html>/i, file + ' must be an HTML document');
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
