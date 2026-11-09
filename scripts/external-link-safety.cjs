'use strict';
// Offline HTML safety check for links opening a new browsing context.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const files = ['index.html', ...fs.readdirSync(path.join(root, 'tools'), {withFileTypes:true})
  .filter(entry => entry.isDirectory())
  .map(entry => `tools/${entry.name}/index.html`)
  .filter(file => fs.existsSync(path.join(root,file)))];
let links = 0;
for (const file of files) {
  const html = fs.readFileSync(path.join(root,file), 'utf8');
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\btarget\s*=\s*(['"])_blank\1/i.test(tag)) continue;
    links++;
    const rel = tag.match(/\brel\s*=\s*(['"])(.*?)\1/i)?.[2] || '';
    assert.ok(rel.split(/\s+/).includes('noopener'), `${file}: target=_blank link missing rel=noopener`);
  }
}
assert.ok(links > 0, 'No external-window links checked');
console.log(`External-link safety OK: ${links} target=_blank links across ${files.length} pages`);
