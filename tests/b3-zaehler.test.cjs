'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/zaehlerstaende-erfassen/index.html'),'utf8');
const core=fs.readFileSync(path.join(root,'assets/helferlein-b3-core.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-zaehler.css'),'utf8');
test('Zähler B3 retains all original eight distinct dashboard sections',()=>{
 for(const file of ['helferlein-b3.css','helferlein-b3-zaehler.css','helferlein-b3-core.js'])assert.ok(html.includes(file),file);
 for(const id of ['alarm','faq','stats','tariffs','create','chart','forecast','history'])assert.equal((html.match(new RegExp('data-b3-panel="'+id+'"','g'))||[]).length,1,id);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('aria-label="Einstellungen öffnen"'));
 assert.doesNotMatch(html,/← Zurück zur Startseite/);
});
test('Zählerstand storage, tariffs, alarms, forecasts, exports and auth preserved',()=>{
 for(const id of ['settingsModal','userInfo','cloudStatus','readingAlarmBanner','accordionContent','accordionIcon','statTotalReadings','statStrom','statWasser','statGas','tariffStromPriceHT','tariffStromPriceNT','tariffStromAbschlag','tariffWasserPrice','tariffGasPrice','tariffGasCalib','chartCard','chartContainer','prognosisCard','prognosisContent','filterType'])
 assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['registerUser','loginUser','logoutUser','openSettings','closeSettings','toggleAccordion','checkReadingAlarm','dismissReadingAlarm','downloadIcsCalendar','getData','saveData','loadTarifs','saveTarifs','saveReading','renderApp','renderChart','renderPrognosis','copyShareText','openEnergyTipsModal','exportHandoverPDF','exportBackup','importBackup','exportPDF'])
 assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 assert.ok(html.includes('energie_tracker_pro_v8'));
 assert.doesNotMatch(core,/energie_tracker_pro_v8|supabaseClient|saveReading\(|saveTarifs\(/);
});
test('B3 theme, locked reading capture and support footer are configured',()=>{
 assert.ok(html.includes("key:'zaehler'"));assert.ok(html.includes("helpId:'accordionContent'"));
 assert.ok(html.includes("name:'Ablese-Erinnerung',size:'l',locked:true"));
 assert.ok(html.includes("name:'Zählerstand erfassen',size:'l',locked:true"));
 assert.ok(core.includes('helferlein_ui_theme_v1')&&core.includes('helferlein_ui_layout_'));
 assert.ok(core.includes('Entdecke mehr Helferlein')&&core.includes('https://ko-fi.com/duhrrom'));
 assert.ok(css.includes('body.b3-zaehler.b3-dark'));
});
