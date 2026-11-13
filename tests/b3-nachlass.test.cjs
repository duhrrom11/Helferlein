'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/digitaler-nachlass/index.html'),'utf8');
const owner=fs.readFileSync(path.join(root,'assets/heir-owner-legacy.js'),'utf8');
const heir=fs.readFileSync(path.join(root,'tools/digitaler-nachlass/erben.html'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/helferlein-b3-nachlass.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-nachlass.css'),'utf8');
test('B3 Nachlass keeps the prominent existing security warning',()=>{
 assert.match(html,/Wichtiger Sicherheitshinweis/);
 assert.match(html,/Der Schlüssel für die lokal verschlüsselten Nachlassdaten/);
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
 assert.ok(owner.includes('function '+fn+'(')||owner.includes('async function '+fn+'('),fn);
 assert.ok(owner.includes('digital_estate_vault'));
 assert.match(html,/src="..\/..\/assets\/heir-owner-legacy\.js"/);
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

test('legacy heir portal is fail closed and removes secret URLs before rendering',()=>{
 assert.match(heir,/Erben-Portal derzeit gesperrt/);
 assert.match(heir,/Dieses Portal gibt derzeit keine Nachlassdaten frei/);
 assert.match(heir,/connect-src 'none'/);
 assert.match(heir,/history\.replaceState\(null, '', location\.pathname\)/);
 assert.doesNotMatch(heir,/URLSearchParams|fetch\(|firebase\.|crypto\.subtle|<script[^>]+src=/);
});
test('notfall preview and PDF no longer emit raw-key recovery links',()=>{
 const start=owner.indexOf('function renderPrintableKit()');
 const end=owner.indexOf('async function generatePrintableKitPDF()',start);
 assert.ok(start>=0 && end>start);
 const preview=owner.slice(start,end);
 assert.match(preview,/aus Sicherheitsgründen deaktiviert/);
 assert.doesNotMatch(preview,/new QRCode|text: personLink|masterKeyHex/);
 assert.match(owner.slice(end),/Notfall-PDFs mit Entschlüsselungsschlüsseln.*deaktiviert/);
 assert.doesNotMatch(owner,/#key=\$\{|navigator\.clipboard\.writeText\(link\)/);
});
test('owner validates exactly 256-bit hexadecimal AES keys; blocked portal never parses them',()=>{
 assert.match(owner,/Ungültiges Schlüsselformat/);
 assert.match(owner,/\^\[a-fA-F0-9\]\{64\}\$/);
 assert.doesNotMatch(heir,/getCryptoKeyFromHex|decryptVaultPayload/);
});
test('Nachlass release remains gated without reviving legacy raw-key URLs',()=>{
 const design=fs.readFileSync(path.join(root,'docs/nachlass-cloud-freigabe-v2.md'),'utf8');
 assert.match(design,/nicht produktiv implementiert/);
 assert.match(design,/LOCKED -> ALARM_PENDING -> RELEASED/);
 assert.match(heir,/noch nicht abgeschlossen/);
 assert.doesNotMatch(owner,/#key=\$\{encodeURIComponent\(cfg\.masterKeyHex\)\}/);
});

test('new vault and heir IDs use CSPRNG without exposing names or timestamps',()=>{
 assert.match(owner,/const vaultId = "v_" \+ Array\.from\(crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
 assert.match(owner,/const personId = "p_" \+ Array\.from\(crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
 assert.doesNotMatch(owner,/Math\.random\(\)/);
 assert.match(owner,/if \(storedVault === null\)/,'existing vault records must be loaded rather than regenerated');
});

test('heir link secrets are not embedded in rendered person list DOM attributes',()=>{
 const start=owner.indexOf('function renderAlarmPersons()');
 const end=owner.indexOf('async function saveSettings()',start);
 assert.ok(start>=0 && end>start);
 const list=owner.slice(start,end);
 assert.doesNotMatch(list,/data-link=/);
 assert.doesNotMatch(list,/#key=/);
 assert.match(list,/data-idx="\$\{idx\}"/);
 assert.doesNotMatch(list,/masterKeyHex|personLink/);
});
