const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const start = html.indexOf('function addWarrantyMonths(');
const end = html.indexOf('function renderApp()', start);
assert.ok(start >= 0 && end > start, 'warranty helper found');
const context = vm.createContext({Date});
vm.runInContext(html.slice(start, end), context);
const check = (date, months) => vm.runInContext(
    'addWarrantyMonths(new Date(' + JSON.stringify(date) + '), ' + JSON.stringify(months) + ')?.toISOString().slice(0, 10) ?? null',
    context
);
assert.equal(check('2025-01-31T12:00:00', 1), '2025-02-28');
assert.equal(check('2024-01-31T12:00:00', 1), '2024-02-29');
assert.equal(check('2025-08-31T12:00:00', 6), '2026-02-28');
assert.equal(check('2025-01-15T12:00:00', 1), '2025-02-15');
assert.equal(check('2025-01-15T12:00:00', -1), null);
assert.equal(check('2025-01-15T12:00:00', 1.5), null);
console.log('Warranty month-end regression checks passed');
