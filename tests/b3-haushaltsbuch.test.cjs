'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/haushaltsbuch-kassenbon/index.html'),'utf8');
const core=fs.readFileSync(path.join(root,'assets/helferlein-b3-core.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-haushaltsbuch.css'),'utf8');
test('B3 Haushaltsbuch uses common UI, turquoise theme and distinct panels',()=>{
 for(const file of ['helferlein-b3.css','helferlein-b3-haushaltsbuch.css','helferlein-b3-core.js'])assert.ok(html.includes(file),file);
 const ids=['stats','charts','goals','form','history'];
 for(const id of ids)assert.equal((html.match(new RegExp('data-b3-panel="'+id+'"','g'))||[]).length,1,id);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('b3-settings-trigger'));
 assert.ok(html.includes("['🧾','Beleg erfassen','#formCard']"));
});
test('Buchungs-, Budget-, Scan- und Cloudfunktionen bleiben vorhanden',()=>{
 for(const id of ['settingsModal','userInfo','cloudStatus','statIncome','statExpense','statBalance','categoryChart','formCard','receiptsList','guideSection','saveBtn'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['registerUser','loginUser','logoutUser','saveReceipt','runOCR','initCharts','renderApp','editReceipt','deleteReceipt','exportSteuerCSV','exportBackup','importBackup','exportPDF','toggleGuide'])assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 for(const key of ['kassenbon_data','budgetbuch_budgets','budgetbuch_goals'])assert.ok(html.includes(key),key);
 assert.doesNotMatch(core,/kassenbon_data|budgetbuch_budgets|budgetbuch_goals|supabaseClient|saveReceipt\(/);
});
test('B3 global theme, independent dashboard and existing help survive',()=>{
 assert.ok(html.includes("key:'haushaltsbuch'"));
 assert.ok(html.includes("helpId:'guideSection'"));
 assert.ok(core.includes('helferlein_ui_theme_v1'));
 assert.ok(core.includes('helferlein_ui_layout_'));
 assert.ok(core.includes('Entdecke mehr Helferlein'));
 assert.ok(core.includes('https://ko-fi.com/duhrrom'));
 assert.ok(css.includes('body.b3-haushaltsbuch'));
});
