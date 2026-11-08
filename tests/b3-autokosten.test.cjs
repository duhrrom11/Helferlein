'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/autokosten-reifenwechsel/index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'assets/helferlein-b3-core.js'),'utf8');
const theme=fs.readFileSync(path.join(root,'assets/helferlein-b3-autokosten.css'),'utf8');
test('Autokosten uses B3 shared resources and four stable panels',()=>{
 for(const filename of ['helferlein-b3.css','helferlein-b3-autokosten.css','helferlein-b3-core.js']) assert.ok(html.includes(filename),filename);
 for(const id of ['stats','deadlines','create','records'])assert.equal((html.match(new RegExp('data-b3-panel="'+id+'"','g'))||[]).length,1,id);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
});
test('Autokosten legacy functions, auth IDs and data contract remain intact',()=>{
 for(const id of ['settingsModal','userInfo','cloudStatus','statCars','statEvents','statCosts','carName','carPlate','eventType','tireCarSelect','carsList','tiresList','eventsList','helpBox','helpToggleBtn']) assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['registerUser','loginUser','logoutUser','saveCar','saveEvent','saveTireSet','exportPDF','exportBackup','importBackup','renderApp','openSettings','closeSettings','toggleHelp'])assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 assert.ok(html.includes('kfz_tracker_pro_v3'),'existing storage key');
 assert.ok(html.includes('Autokosten-Rechner & Reifenwechsel'));
});
test('UI settings do not modify Supabase or business records',()=>{
 assert.doesNotMatch(ui,/supabaseClient|saveCar\(|saveEvent\(|saveTireSet\(|kfz_tracker_pro_v3/);
 assert.ok(ui.includes('helferlein_ui_theme_v1'));
 assert.ok(ui.includes('helferlein_ui_layout_'));
 assert.ok(ui.includes('Entdecke mehr Helferlein'));
 assert.ok(ui.includes('https://ko-fi.com/duhrrom'));
 assert.ok(theme.includes('body.b3-autokosten'));
});
