'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/verliehene-gegenstaende-verwalten/index.html'),'utf8');
const core=fs.readFileSync(path.join(root,'assets/helferlein-b3-core.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-verleih.css'),'utf8');
test('B3 Verleih preserves all five dashboard sections and compact header',()=>{
 for(const file of ['helferlein-b3.css','helferlein-b3-verleih.css','helferlein-b3-core.js'])assert.ok(html.includes(file),file);
 for(const id of ['stats','create','inventory','loans','recommendations'])assert.equal((html.match(new RegExp('data-b3-panel="'+id+'"','g'))||[]).length,1,id);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('aria-label="Einstellungen öffnen"'));
 assert.doesNotMatch(html,/Zurück zur Startseite/);
});
test('Verleih business features, dates, contacts, QR, PDF and storage remain',()=>{
 for(const id of ['settingsModal','header-user-badge','header-user-email','cloud-status-text','helpModal','statActive','statOverdue','statReturned','statLost','statDeposit','contactName','contactPhone','invTitle','invCategory','itemInventorySelect','itemPersonSelect','itemDate','itemReturnDate','itemDeposit','itemPhotoInput','inventoryList'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['toggleSettingsModal','toggleHelpModal','supabaseLogin','supabaseRegister','supabaseLogout','saveContact','saveInventoryItem','saveItem','setStatus','extendReturnDate','deleteItem','renderApp','renderInventory','showQrCode','downloadICS','exportPDF'])
  assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 assert.ok(html.includes('verleih_tracker_pro_v3'));
 assert.doesNotMatch(core,/verleih_tracker_pro_v3|supabaseClient|saveItem\(|saveContact\(/);
});
test('B3 global theme, locked return list, support and discovery are configured',()=>{
 assert.ok(html.includes("key:'verleih'"));
 assert.ok(html.includes("helpId:'helpModal'"));
 assert.ok(html.includes("locked:true"));
 assert.ok(core.includes('helferlein_ui_theme_v1')&&core.includes('helferlein_ui_layout_'));
 assert.ok(core.includes('Entdecke mehr Helferlein')&&core.includes('https://ko-fi.com/duhrrom'));
 assert.ok(css.includes('body.b3-verleih.b3-dark'));
});
