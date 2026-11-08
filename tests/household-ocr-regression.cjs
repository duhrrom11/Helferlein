const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const dateStart = html.indexOf('function parseReceiptDate(');
const dateEnd = html.indexOf('function addWarrantyMonths(', dateStart);
const ocrStart = html.indexOf('function extractReceiptTotal(');
const ocrEnd = html.indexOf('/* --- Buchung Speichern --- */', ocrStart);
assert.ok(dateStart >= 0 && dateEnd > dateStart && ocrStart >= 0 && ocrEnd > ocrStart);
const fields = new Map([
    ['receiptPhotoInput', {files: [{name: 'receipt.png'}]}],
    ['ocrStatus', {innerText: '', classList: {remove() {}}}],
    ['receiptPrice', {value: ''}],
    ['receiptDate', {value: '', dataset: {autoDefault: 'false'}}]
]);
let workerTerminated = 0;
let recognizedText = '';
const ctx = vm.createContext({
    ocrGeneration: 0,
    document: {getElementById: id => fields.get(id)},
    Tesseract: {createWorker: async () => ({
        recognize: async () => ({data: {text: recognizedText}}),
        terminate: async () => {workerTerminated++;}
    })},
    alert: () => {},
    console: {warn() {}}
});
vm.runInContext(html.slice(dateStart, dateEnd) + html.slice(ocrStart, ocrEnd), ctx);
(async () => {
    recognizedText = 'Datum 31.02.2025';
    await vm.runInContext('runOCR()', ctx);
    assert.equal(fields.get('receiptDate').value, '');
    recognizedText = 'Datum 29.02.2024';
    await vm.runInContext('runOCR()', ctx);
    assert.equal(fields.get('receiptDate').value, '2024-02-29');
    fields.get('receiptDate').value = '';
    recognizedText = 'Ungültig 31.02.2025\\nKaufdatum: 15.03.2025';
    await vm.runInContext('runOCR()', ctx);
    assert.equal(fields.get('receiptDate').value, '2025-03-15');
    fields.get('receiptDate').value = '';
    recognizedText = 'Lieferdatum 10.03.2025\\nRechnungsdatum: 12.03.2025';
    await vm.runInContext('runOCR()', ctx);
    assert.equal(fields.get('receiptDate').value, '2025-03-12');
    fields.get('receiptDate').value = '2026-11-08';
    fields.get('receiptDate').dataset.autoDefault = 'true';
    recognizedText = 'Datum 01.10.2026';
    await vm.runInContext('runOCR()', ctx);
    assert.equal(fields.get('receiptDate').value, '2026-10-01');
    assert.equal(fields.get('receiptDate').dataset.autoDefault, 'false');
    recognizedText = 'Datum 02.10.2026';
    await vm.runInContext('runOCR()', ctx);
    assert.equal(fields.get('receiptDate').value, '2026-10-01', 'user or OCR date is preserved');
    assert.equal(workerTerminated, 6, 'OCR workers released after every scan');
    console.log('OCR date validation regression checks passed');
})().catch(error => {console.error(error); process.exitCode = 1;});
