'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/digitaler-nachlass/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/helferlein-b3-nachlass.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-nachlass.css'),'utf8');
test('B3 Nachlass keeps the prominent existing security warning',()=>{
 assert.match(html,/Wichtiger Sicherheitshinweis/);
 assert.match(html,/Sicherheitsprüfung ausstehend/);
 assert.match(html,/keine Passwörter, Zugangscodes oder anderen besonders vertraulichen Geheimnisse/);
 assert.match(css,/b3-security-notice/);
 assert.doesNotMatch(html,/Zurück zur Startseite/);
});
test('B3 navigation preserves original tab and security-critical IDs',()=>{
 for(const id of ['section-vault','section-deadman','section-trustees','section-kit','section-settings','entryTitle','entryContent','saveEntryBtn','vaultEntriesList','deadmanCountdown','checkInBtn','trusteesGrid','generatePdfBtn','cloud-status-text','auth-email','auth-password','manualSyncBtn'])
 assert.ok(html.includes('id="'+id+'"'),id);
 for(const tab of ['vault','deadman','trustees','kit','settings'])
 assert.ok(html.includes('data-tab="'+tab+'"'),tab);
 assert.equal((html.match(/id="manualSyncBtn"/g)||[]).length,1);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
});
test('Existing encryption, sync, alarm and account functions remain unchanged',()=>{
 for(const fn of ['getCryptoKeyFromHex','encryptVaultPayload','decryptVaultPayload','initVault','syncVaultToFirebase','checkIncomingAlarms','performCheckIn','saveVaultEntry','supabaseLogin','supabaseLogout','renderPrintableKit'])
 assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 assert.ok(html.includes('digital_estate_vault'));
 assert.doesNotMatch(js,/digital_estate_vault|supabaseClient|firebase|encryptVaultPayload|checkIncomingAlarms|saveVaultEntry\(/i);
});
test('Theme, editable navigation and Ko-fi are isolated UI preferences',()=>{
 assert.ok(js.includes('helferlein_ui_theme_v1'));
 assert.ok(js.includes('helferlein_ui_layout_nachlass_v1'));
 assert.ok(js.includes('Sicherheitsrelevante Bereiche bleiben immer erreichbar'));
 assert.ok(html.includes('Entdecke mehr Helferlein'));
 assert.ok(html.includes('https://ko-fi.com/duhrrom'));
 assert.ok(css.includes('body.b3-nachlass.b3-dark')&&css.includes('body.b3-nachlass.b3-light'));
});
