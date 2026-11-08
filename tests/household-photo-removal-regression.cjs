const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const start = html.indexOf('function clearReceiptPhotos()');
const end = html.indexOf('function applyCanvasFilter()', start);
assert.ok(start >= 0 && end > start, 'photo clear function found');
assert.match(html, /onclick="clearReceiptPhotos\(\)"/);
const elements = new Map();
const element = id => {
    if (!elements.has(id)) elements.set(id, {
        value: 'old', children: ['old'], classList: {add(name) { this[name] = true; }},
        replaceChildren() { this.children = []; }
    });
    return elements.get(id);
};
const context = vm.createContext({
    ocrGeneration: 7,
    photoReadFailed: true,
    photoReadGeneration: 4,
    pendingPhotoReads: 2,
    currentUploadedPhotos: ['old'],
    rawImage: {},
    document: {getElementById: element}
});
vm.runInContext(html.slice(start, end) + 'clearReceiptPhotos();', context);
assert.equal(context.ocrGeneration, 8);
assert.equal(context.photoReadGeneration, 5);
assert.equal(context.photoReadFailed, false);
assert.equal(context.pendingPhotoReads, 0);
assert.equal(context.currentUploadedPhotos.length, 0);
assert.equal(context.rawImage, null);
assert.equal(element('receiptPhotoInput').value, '');
assert.equal(element('uploadGalleryPreview').children.length, 0);
assert.equal(element('uploadGalleryPreview').classList.hidden, true);
assert.match(html, /photos: \[\.\.\.currentUploadedPhotos\]/);
console.log('Receipt photo removal regression checks passed');
