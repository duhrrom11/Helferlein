const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const start = html.indexOf('function exportPDF()');
assert.ok(start >= 0, 'PDF export exists');
const calls = [];
const doc = {
    setFontSize() {},
    text(value) { calls.push(String(value)); },
    splitTextToSize(value) { return [value]; },
    addPage() {},
    save(name) { calls.push('saved:' + name); }
};
const context = vm.createContext({
    window: {jspdf: {jsPDF: function () { return doc; }}},
    parseReceiptDate: value => new Date(value + 'T12:00:00'),
    getData: () => [
        {date: '2026-01-01', title: 'Lohn', entryType: 'einnahme', price: 2000},
        {date: '2026-01-02', title: 'Miete', entryType: 'ausgabe', price: 750},
        {date: '2026-01-03', title: 'Einkauf', entryType: 'ausgabe', price: 49.5},
        {date: '2026-01-04', title: 'Unvollständig', price: 'invalid'}
    ]
});
vm.runInContext(html.slice(start, html.lastIndexOf('</script>')), context);
vm.runInContext('exportPDF()', context);
assert.ok(calls.includes('Buchungen: 3'));
assert.ok(calls.includes('Einnahmen: 2000,00 EUR'));
assert.ok(calls.includes('Ausgaben: 799,50 EUR'));
assert.ok(calls.includes('Saldo: 1200,50 EUR'));
assert.ok(calls.includes('Zeitraum: 01.01.2026 bis 03.01.2026'));
assert.ok(calls.some(value => value.startsWith('saved:finanz-bericht-')));
console.log('Household PDF summary regression checks passed');
