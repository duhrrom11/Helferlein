const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const start = html.indexOf('function steuerCsvFeld(');
const end = html.indexOf('function exportBackup()', start);
assert.ok(start >= 0 && end > start);
assert.match(html, /handler:'exportAllBookingsCSV'/);
let csv = '';
let download = '';
let clicked = false;
const context = vm.createContext({
    getData: () => [
        {date: '2026-11-01', entryType: 'einnahme', title: 'Lohn', price: 1500, isTax: false},
        {date: '2026-11-02', entryType: 'ausgabe', title: '=HYPERLINK("x")', price: 15.5, isTax: true, isFixkosten: true}
    ],
    Blob: function(parts) { csv = parts.join(''); },
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    document: {createElement: () => ({click() {clicked = true;}, set download(value) {download = value;}})},
    setTimeout() {},
    alert(message) { throw Error(message); }
});
vm.runInContext(html.slice(start, end), context);
vm.runInContext('exportAllBookingsCSV()', context);
assert.equal(clicked, true);
assert.match(download, /^alle-buchungen-\d{4}-\d{2}-\d{2}\.csv$/);
assert.ok(csv.startsWith('\uFEFF'));
const lines = csv.slice(1).trim().split('\r\n');
assert.equal(lines.length, 3, 'all bookings included');
assert.match(lines[0], /Fixkosten;Steuerrelevant/);
assert.match(lines[1], /"Nein";"Nein"/);
assert.match(lines[2], /"'=HYPERLINK\(""x""\)"/);
assert.match(lines[2], /"Ja";"Ja"/);
console.log('All bookings CSV regression checks passed');
