'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/wg-organisator/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/helferlein-b3-core.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-wg.css'),'utf8');
const panels=['stats','notes','info','analysis','goals','expenses','debts','inventory','calendar','cleaning','cooking','contracts','recommendations'];
test('WG B3 has accessible compact header and exactly thirteen dashboard regions',()=>{
 assert.ok(html.includes('helferlein-b3-core.js'));assert.ok(html.includes('helferlein-b3-wg.css'));
 for(const panel of panels)assert.equal((html.match(new RegExp('data-b3-panel="'+panel+'"','g'))||[]).length,1,panel);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('aria-label="Einstellungen öffnen"'));
 assert.ok(!html.includes('← Zurück zur Startseite'));
});
test('WG backend/storage/auth, shared expenses and cleaning plan preserved',()=>{
 for(const id of ['header-user-badge','header-user-email','sync-status-dot','settingsModal','helpModal','cloud-status-text','statIncome','statDebtVolume','stickyNotesGrid','formCard','receiptsList','settlementList','cleaningPlanList','shoppingList','eventList','contractList','dietMatrixList','cookingPlanList','kofiText'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['supabaseLogin','supabaseLogout','checkUserSession','renderApp','saveReceipt','runOCR','saveNote','saveEvent','renderCleaningPlan','renderShoppingList','manuelleSynchronisation','exportAbrechnungPDF','kopiereWGLink','openMitbewohnerModal','toggleHelpModal'])
  assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 assert.doesNotMatch(js,/supabaseClient|saveReceipt\(|saveData\(|saveFlatmates\(|saveCleaningPlan\(/);
});
test('B3 WG retains individual design and Ko-fi footer in settings',()=>{
 assert.ok(html.includes("key:'wg'"));
 assert.ok(html.includes("helpId:'helpModal'"));
 assert.ok(js.includes('helferlein_ui_theme_v1'));
 assert.ok(js.includes('helferlein_ui_layout_'));
 assert.ok(js.includes('Entdecke mehr Helferlein'));
 assert.ok(js.includes('https://ko-fi.com/duhrrom'));
 assert.ok(css.includes('body.b3-wg'));
});
