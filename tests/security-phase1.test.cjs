'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const wg=read('tools/wg-organisator/index.html');
test('WG cash data never touches standalone household storage keys',()=>{
 for(const key of ['kassenbon_data','budgetbuch_budgets','budgetbuch_goals']){
  assert.doesNotMatch(wg,new RegExp("localStorage\\.(?:getItem|setItem)\\('"+key+"'"));
  assert.ok(wg.includes("wgStorage.getItem('"+key+"')"));
  assert.ok(wg.includes("wgStorage.setItem('"+key+"',"));
 }
 assert.ok(wg.includes('helferlein_wg_v2_'));
 assert.ok(wg.includes('function importLegacyWgData()'));
 assert.ok(wg.includes('Das Original wurde nicht verändert'));
});
test('No example private data or accidental cloud writes during WG setup',()=>{
 const setup=wg.slice(wg.indexOf('async function erstelleNeueWGKonfiguration()'),wg.indexOf('function zeigeErstellungsScreen()'));
 assert.doesNotMatch(setup,/Alex|Sam|Supernet|Hr\. Weber|fetch\(/);
 assert.match(setup,/crypto\.getRandomValues/);
 assert.match(setup,/wgBinId = 'local_'/);
 const boot=wg.slice(wg.indexOf("document.addEventListener('DOMContentLoaded', async"),wg.indexOf('\/\* Storage Helper \*\/'));
 assert.doesNotMatch(boot,/await speichereWGinCloud\(|await ladeWGausCloud\(/);
 assert.match(boot,/showLegacyWGCloudWarning\(\)/);
});
test('WG legacy cloud cannot run without explicit per-tab agreement',()=>{
 assert.match(wg,/let legacyWgCloudEnabled = false/);
 assert.match(wg,/window\.confirm\('ACHTUNG:/);
 assert.match(wg,/if \(!wgBinId \|\| !legacyWgCloudEnabled/);
 assert.doesNotMatch(wg,/setInterval\\(\\(\\) =>\\s*\\{\\s*if \\(wgBinId && legacyWgCloudEnabled\\)/);
 assert.match(wg,/Vor dem Cloud-Import konnte keine lokale Sicherung angelegt werden/);
});
test('Safe HTML helper escapes markup and rejects script protocols and SVG images',()=>{
 const js=read('assets/helferlein-safe-output.js');
 const w={location:{href:'https://example.org/'}};
 const context={window:w,URL};
 vm.runInNewContext(js,context);
 assert.equal(w.HelferleinSafe.html('<img onerror="alert(1)">&'), '&lt;img onerror=&quot;alert(1)&quot;&gt;&amp;');
 assert.equal(w.HelferleinSafe.photo('javascript:alert(1)'),'');
 assert.equal(w.HelferleinSafe.photo('data:image/svg+xml;base64,YQ=='),'');
 assert.equal(w.HelferleinSafe.photo('data:image/png;base64,aGVsbG8='),'data:image/png;base64,aGVsbG8=');
 const payload='");window.attacked=true;// & <script>';
 const arg=w.HelferleinSafe.jsArg(payload);
 assert.ok(arg.startsWith('&quot;'));
 assert.ok(!arg.includes('<script>'));
 assert.equal(w.HelferleinSafe.tel('+49 (170) 123-45'),' +4917012345'.trim());
 assert.equal(w.HelferleinSafe.tel('tel:"><svg onload=alert(1)>'),'1');

});
test('High-risk tool cards use shared escaping for user entries',()=>{
 for(const [tool,checks] of Object.entries({
 'autokosten-reifenwechsel':['HelferleinSafe.html(c.name)','HelferleinSafe.html(e.title)'],
 'haushaltsbuch-kassenbon':['HelferleinSafe.html(r.title)','HelferleinSafe.html(r.note'],
 'haustier-gesundheitspass':['HelferleinSafe.html(p.name)','HelferleinSafe.html(p.allergies)'],
 'umzugskisten-inventar':['HelferleinSafe.html(item.name)','HelferleinSafe.html(loc.name)'],
 'parkplatz-merker-parkschein-timer':['HelferleinSafe.html(s.desc)'],
 'zaehlerstaende-erfassen':['HelferleinSafe.html(r.name)']
 })){
  const html=read('tools/'+tool+'/index.html');
  assert.match(html,/helferlein-safe-output\.js/);
  for(const v of checks)assert.ok(html.includes(v),tool+': '+v);
 }
});

test('New Nachlass vault uses password KDF without persisted master key',()=>{
 const vault=read('tools/digitaler-nachlass/index.html');
 assert.ok(vault.includes("const VAULT_KDF_ITERATIONS = 350000"));
 assert.ok(vault.includes("crypto.subtle.deriveBits"));
 assert.ok(vault.includes("passwordKdf:kdf"));
 assert.ok(vault.includes("delete next.masterKeyHex"));
 assert.ok(vault.includes("Object.defineProperty(cfg,'masterKeyHex'"));
 assert.ok(vault.includes("showVaultPasswordGate('create')"));
 assert.ok(vault.includes("showVaultPasswordGate('unlock',cfg)"));
 assert.ok(vault.includes("function migrateLegacyVaultToPassphrase()"));
 assert.doesNotMatch(vault,/masterKeyHex: currentMasterKeyHex/);
});

test('QR and ICS HTML handlers serialize dynamic text as escaped JS arguments',()=>{
 const car=read('tools/autokosten-reifenwechsel/index.html');
 const boxes=read('tools/umzugskisten-inventar/index.html');
 const plants=read('tools/pflanzenpflege-giessplan/index.html');
 assert.ok(car.includes('HelferleinSafe.jsArg(e.title'));
 assert.ok(boxes.includes('HelferleinSafe.jsArg(b.name)'));
 assert.ok(boxes.includes('HelferleinSafe.jsArg(b.desc)'));
 assert.ok(plants.includes('HelferleinSafe.jsArg(p.name)'));
 assert.ok(plants.includes('HelferleinSafe.jsArg(p.location)'));
});
test('Recipe names, notes and free text cannot become rendered HTML',()=>{
 const recipe=read('tools/backform-umrechner/index.html');
 assert.ok(recipe.includes('HelferleinSafe.html(name)'));
 assert.ok(recipe.includes('HelferleinSafe.html(match[4])'));
 assert.ok(recipe.includes('HelferleinSafe.html(line)'));
 assert.ok(recipe.includes('HelferleinSafe.html(r.note ||'));
 assert.ok(recipe.includes('helferlein-safe-output.js'));
});
