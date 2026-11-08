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
class ThrowingReader {
    readAsDataURL() { throw new Error('File cannot be read'); }
}
ctx.FileReader = ThrowingReader;
ctx.console = {error() {}};
const validInput = {files: [{type: 'image/png', size: 1024}], value: 'selected'};
ctx.loadPhotosToCanvas({target: validInput});
assert.equal(ctx.pendingPhotoReads, 0, 'failed reads must not leave upload pending');
assert.equal(ctx.photoReadFailed, true, 'failed reads block saving');
assert.match(alerts[alerts.length - 1], /nicht geöffnet/);
ctx.photoReadFailed = false;
ctx.currentUploadedPhotos = ['existing-photo'];
gallery.innerHTML = 'original';
const oversizedInput = {files: [{type: 'image/png', size: 5 * 1024 * 1024}], value: 'selected'};
ctx.loadPhotosToCanvas({target: oversizedInput});
assert.equal(oversizedInput.value, '');
assert.equal(ctx.currentUploadedPhotos[0], 'existing-photo');
assert.equal(ctx.photoReadFailed, false);
assert.equal(gallery.innerHTML, 'original');
assert.match(alerts[alerts.length - 1], /maximal 4 MB/);
let pendingImage;
ctx.FileReader = class {
    readAsDataURL() { this.onload({target: {result: 'data:image/png;base64,AAAA'}}); }
};
ctx.Image = class {
    set src(value) { pendingImage = this; }
};
ctx.safeReceiptPhoto = () => true;
gallery.children = [];
gallery.insertBefore = () => {};
gallery.classList.remove = () => {};
ctx.document.getElementById = () => gallery;
ctx.document.createElement = () => ({dataset: {}});
ctx.loadPhotosToCanvas({target: {files: [{type: 'image/png', size: 100}], value: 'selected'}});
assert.equal(ctx.pendingPhotoReads, 1, 'first image must finish decoding before save');
pendingImage.onerror();
assert.equal(ctx.pendingPhotoReads, 0);
assert.equal(ctx.photoReadFailed, true, 'image decode failure blocks save');
ctx.FileReader = class {
    constructor() { throw new Error('Reader unavailable'); }
};
ctx.loadPhotosToCanvas({target: {files: [{type: 'image/png', size: 100}], value: 'selected'}});
assert.equal(ctx.pendingPhotoReads, 0, 'reader startup failure must finish pending upload');
assert.equal(ctx.photoReadFailed, true, 'reader startup failure blocks saving');
assert.match(alerts[alerts.length - 1], /Bildleser/);

ctx.FileReader = class {
    readAsDataURL() { this.onload({target: {result: 'data:image/png;base64,AAAA'}}); }
};
ctx.Image = class {
    set src(value) { throw new Error('Image source unavailable'); }
};
ctx.loadPhotosToCanvas({target: {files: [{type: 'image/png', size: 100}], value: 'selected'}});
assert.equal(ctx.pendingPhotoReads, 0, 'image source failure must finish pending upload');
assert.equal(ctx.photoReadFailed, true, 'image source failure blocks saving');
assert.match(alerts[alerts.length - 1], /nicht geöffnet/);
const filterStart = html.indexOf('function applyCanvasFilter()');
const filterEnd = html.indexOf('function extractReceiptTotal(', filterStart);
const canvas = {
    width: 0, height: 0,
    getContext: () => ({drawImage() {}}),
    toDataURL: () => 'data:image/jpeg;base64,AAAA'
};
const filterContext = vm.createContext({
    rawImage: {width: 400, height: 8000},
    currentUploadedPhotos: ['original'],
    document: {getElementById: id => id === 'photoCanvas' ? canvas : {value: '0'}}
});
vm.runInContext(html.slice(filterStart, filterEnd), filterContext);
filterContext.applyCanvasFilter();
assert.equal(canvas.height, 900);
assert.ok(canvas.width > 0 && canvas.width <= 600);
filterContext.rawImage = {width: 8000, height: 400};
filterContext.applyCanvasFilter();
assert.equal(canvas.width, 600);
assert.ok(canvas.height > 0 && canvas.height <= 900);
filterContext.rawImage = {width: 0, height: 400};
assert.throws(() => filterContext.applyCanvasFilter(), /Ungültige Bildabmessungen/);
console.log('Receipt photo format regression checks passed');
