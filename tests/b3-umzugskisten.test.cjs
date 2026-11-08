'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/umzugskisten-inventar/index.html'),'utf8');
const core=fs.readFileSync(path.join(root,'assets/helferlein-b3-core.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-umzugskisten.css'),'utf8');
test('B3 Umzugskisten uses shared shell and four distinct panels',()=>{
 for(const file of ['helferlein-b3.css','helferlein-b3-umzugskisten.css','helferlein-b3-core.js'])assert.ok(html.includes(file),file);
 for(const id of ['stats','values','create','inventory'])assert.equal((html.match(new RegExp('data-b3-panel="'+id+'"','g'))||[]).length,1,id);
 assert.equal((html.match(/<h1\\b/g)||[]).length,1);
 assert.ok(html.includes('b3-settings-trigger'));
});
test('Existing inventory data, QR and barcode logic remain available',()=>{
 for(const id of ['settingsModal','userInfo','cloudStatus','statBoxes','statLocs','statValue','locName','locIcon','boxName','boxLocationSelect','boxPhotoInput','inventoryContainer','searchBox','tagFilter','sortFilter','helpBox','helpToggleBtn','scannerModal'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['registerUser','loginUser','logoutUser','saveLocation','saveBox','updateBox','deleteBox','renderInventory','exportInventoryPDF','exportQrLabelsPDF','exportBackup','importBackup','openScannerModal','closeScannerModal','toggleHelp'])assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 assert.ok(html.includes('mini_homebox_pro'),'existing storage key');
 assert.doesNotMatch(core,/mini_homebox_pro|supabaseClient|saveBox\\(|saveLocation\\(/);
});
test('Unified settings, theme and footer are configured',()=>{
 assert.ok(html.includes("key:'umzugskisten'"));
 assert.ok(html.includes("helpId:'helpBox'"));
 assert.ok(core.includes('helferlein_ui_theme_v1'));
 assert.ok(core.includes('helferlein_ui_layout_'));
 assert.ok(core.includes('Entdecke mehr Helferlein'));
 assert.ok(core.includes('https://ko-fi.com/duhrrom'));
 assert.ok(css.includes('body.b3-umzugskisten'));
});
