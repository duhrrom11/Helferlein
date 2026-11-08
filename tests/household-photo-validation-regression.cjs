const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const start = html.indexOf('function loadPhotosToCanvas(event)');
const end = html.indexOf('function clearReceiptPhotos()', start);
assert.ok(start >= 0 && end > start);
const gallery = {innerHTML: 'original', classList: {remove() {}}};
const alerts = [];
const ctx = vm.createContext({
    photoReadGeneration: 3, ocrGeneration: 2, pendingPhotoReads: 0,
    photoReadFailed: false, currentUploadedPhotos: ['existing-photo'], rawImage: null,
    document: {getElementById: () => gallery},
    alert: message => alerts.push(message)
});
vm.runInContext(html.slice(start, end), ctx);
const input = {files: [{type: 'image/svg+xml'}], value: 'selected'};
ctx.loadPhotosToCanvas({target: input});
assert.equal(input.value, '');
assert.equal(ctx.photoReadGeneration, 3);
assert.equal(ctx.currentUploadedPhotos.length, 1);
assert.equal(ctx.currentUploadedPhotos[0], 'existing-photo');
assert.equal(gallery.innerHTML, 'original');
assert.equal(alerts.length, 1);
assert.match(html.slice(html.indexOf('function saveReceipt()')), /if \(photoReadFailed\)/);
console.log('Receipt photo format regression checks passed');
