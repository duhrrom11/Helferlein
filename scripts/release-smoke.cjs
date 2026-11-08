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
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(code => code.trim());
  for (const [index, code] of scripts.entries()) {
    new vm.Script(code, { filename: file + '#inline-' + index });
  }
  console.log('OK', file, scripts.length, 'inline scripts');
}
for (const target of linkedTools) {
  assert.ok(homepage.includes(target), 'Homepage must link to ' + target);
}
console.log('Release smoke checks passed');
