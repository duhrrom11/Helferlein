const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const files = [
  'index.html',
  'tools/wg-organisator/index.html',
  'tools/haushaltsbuch-kassenbon/index.html'
];
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
const homepage = fs.readFileSync('index.html', 'utf8');
for (const target of files.slice(1)) {
  assert.ok(homepage.includes(target), 'Homepage must link to ' + target);
}
console.log('Release smoke checks passed');
