'use strict';
// Offline fixture tests. Never contacts GitHub, Supabase, or production services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'helferlein-smoke-'));
const script = path.resolve(__dirname, '../scripts/release-smoke.cjs');
const tools = Array.from({ length: 11 }, (_, i) => 'tools/tool-' + (i + 1) + '/index.html');
const toolHtml = '<!doctype html><html lang="de"><head><title>Tool</title></head><body><script>const ok = 1;</script></body></html>';
const homepage = '<!doctype html><html lang="de"><head><title>Helferlein</title>' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<meta name="description" content="Elf praktische Tools">' +
  '<link rel="canonical" href="https://example.org/index.html"></head><body>' +
  tools.map(t => '<a href="' + t + '">Tool</a>').join('') +
  '<script type="application/json">{"ok":true}</script></body></html>';

function write(relative, data) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
}
function reset() {
  write('index.html', homepage);
  for (const tool of tools) write(tool, toolHtml);
}
function run() {
  return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 15000 });
}
function expectFailure(name, mutate, fragment) {
  reset();
  mutate();
  const result = run();
  assert.equal(result.error, undefined, name + ': test process failed to launch');
  assert.notEqual(result.signal, 'SIGTERM', name + ': test timed out');
  assert.notEqual(result.status, 0, name + ': expected failure');
  assert.match(result.stderr + result.stdout, fragment, name + ': wrong error');
  console.log('PASS rejects:', name);
}
try {
  reset();
  const good = run();
  assert.equal(good.error, undefined, 'valid fixture process must launch');
  assert.equal(good.status, 0, 'valid fixture should pass: ' + good.stderr);
  console.log('PASS accepts: valid 11-tool site');

  expectFailure('missing tool file', () => fs.unlinkSync(path.join(root, tools[0])), /missing/i);
  expectFailure('bad tool path', () => write('index.html', homepage.replace('tools/tool-1/index.html', 'tools/../tool-1/index.html')), /Unexpected tool link path/);
  expectFailure('missing German language', () => write('index.html', homepage.replace('lang="de"', 'lang="en"')), /German language/);
  expectFailure('missing viewport', () => write('index.html', homepage.replace(/<meta name="viewport"[^>]*>/, '')), /mobile viewport/);
  expectFailure('missing description', () => write('index.html', homepage.replace(/<meta name="description"[^>]*>/, '')), /SEO description/);
  expectFailure('non-HTTPS canonical', () => write('index.html', homepage.replace('https://example.org', 'http://example.org')), /HTTPS canonical/);
  expectFailure('missing tool title', () => write(tools[0], toolHtml.replace('<title>Tool</title>', '')), /nonempty title/);
  expectFailure('invalid inline JavaScript', () => write(tools[0], toolHtml.replace('const ok = 1;', 'const = ;')), /SyntaxError|Unexpected token/);
  expectFailure('invalid inline JSON', () => write('index.html', homepage.replace('{"ok":true}', '{oops}')), /SyntaxError|JSON/);
  expectFailure('missing homepage title', () => write('index.html', homepage.replace('<title>Helferlein</title>', '')), /nonempty title/);
  expectFailure('missing homepage doctype', () => write('index.html', homepage.replace('<!doctype html>', '')), /HTML document/);
  expectFailure('missing tool doctype', () => write(tools[0], toolHtml.replace('<!doctype html>', '')), /HTML document/);
  expectFailure('missing tool html element', () => write(tools[0], toolHtml.replace('<html lang="de">', '<main>').replace('</html>', '</main>')), /html element/);
  expectFailure('missing homepage html element', () => write('index.html', homepage.replace('<html lang="de">', '<main>').replace('</html>', '</main>')), /German language/);
  expectFailure('missing tool link', () => write('index.html', homepage.replace('<a href="' + tools[0] + '">Tool</a>', '')), /all 11 tools/);
  expectFailure('invalid homepage JavaScript', () => write('index.html', homepage.replace('</body>', '<script>const = ;</script></body>')), /SyntaxError|Unexpected token/);
  expectFailure('empty meta description', () => write('index.html', homepage.replace('content="Elf praktische Tools"', 'content=""')), /SEO description/);
  console.log('Release smoke regression fixtures passed (18 cases)');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
