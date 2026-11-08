'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'tools/pflanzenpflege-giessplan/index.html'),'utf8');
const css = fs.readFileSync(path.join(root,'assets/helferlein-b3.css'),'utf8');
const js = fs.readFileSync(path.join(root,'assets/helferlein-b3.js'),'utf8');
const panels = ['stats','calendar','create','plants','recommendations'];
test('B3 resources are wired and dashboard panels unique',()=>{
 assert.match(html,/href="\.\.\/\.\.\/assets\/helferlein-b3\.css"/);
 assert.match(html,/src="\.\.\/\.\.\/assets\/helferlein-b3\.js"/);
 for(const id of panels){
   assert.equal((html.match(new RegExp('data-b3-panel="'+id+'"','g'))||[]).length,1,id);
 }
});
test('Existing plant data IDs, authentication and alerts remain present',()=>{
 for(const id of ['plantsList','statPlants','statDueSoon','statOverdue','statWaterNeeded','statCistern','statTotalHarvest','frostBanner','header-user-badge','settingsModal','helpModal']){
   assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 for(const fn of ['renderApp','supabaseLogin','supabaseLogout','toggleSettingsModal','toggleHelpModal','dismissFrostAlert']){
   assert.ok(html.includes(fn+'('),fn);
 }
});
test('Global theme and per-tool layout use separate versioned keys',()=>{
 assert.match(js,/helferlein_ui_theme_v1/);
 assert.match(js,/helferlein_ui_layout_pflanzen_v1/);
 assert.match(js,/prefers-color-scheme: dark/);
 assert.match(js,/localStorage\.setItem/);
 assert.doesNotMatch(js,/supabaseClient|\.from\(|deletePlant\(|savePlant\(/);
});
test('Editor supports reversible changes and consolidated navigation',()=>{
 for(const label of ['Speichern','Abbrechen','Standardlayout','Sichtbar','b3-nav-links','Weitere Tools']){
   assert.ok(js.includes(label)||css.includes(label),label);
 }
 assert.match(css,/max-width:767px/);
 assert.match(css,/min-width:1024px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('B3 layout CSS preserves complete panels across tablet widths',()=>{
 assert.ok(!css.includes('}\\\\nbody'),'No literal escaped newline joining selectors');
 assert.ok(css.includes('main.b3-dashboard>[data-b3-panel]{grid-column:span 12'),'Panels must span the full dashboard grid');
 assert.ok(css.includes('@media(min-width:768px) and (max-width:1279px)'),'Tablet breakpoint');
 assert.ok(css.includes('data-b3-panel="stats"]{grid-template-columns:repeat(2,minmax(0,1fr))'),'Stats must use two columns on tablet');
 assert.ok(css.includes('body.b3-dark main.b3-dashboard [data-b3-panel="calendar"]'),'Readable dark calendar');
});

test('Header has exactly one settings control and no redundant home button',()=>{
 assert.match(html,/class="b3-settings-trigger"/);
 assert.match(html,/aria-label="Einstellungen öffnen"/);
 assert.doesNotMatch(html,/← Zurück zur Startseite/);
 assert.doesNotMatch(html,/data-b3-panel="actions"/);
 assert.match(js,/Darstellung & Dashboard/);
 assert.match(js,/Entdecke mehr Helferlein/);
 assert.match(js,/https:\/\/ko-fi\.com\/duhrrom/);
 assert.match(js,/Weitere Tools/);
 assert.match(js,/openRoiModal\(\)/);
 assert.match(js,/openCisternModal\(\)/);
});

test('Ko-fi and discovery links are the final settings controls in that order',()=>{
 const support=js.indexOf("'☕ Kaffee spendieren'");
 const discover=js.indexOf("'↗ Entdecke mehr Helferlein'");
 const footer=js.indexOf("const footer=create('div',{class:'b3-settings-footer'})");
 assert.ok(footer>=0 && support>footer && discover>support);
 assert.ok(js.includes("rel:'noopener noreferrer'"));
 assert.match(css,/\.b3-kofi-link/);
 assert.match(css,/\.b3-settings-footer/);
});
test('Dark mode defines all common surfaces, semantic colours and controls',()=>{
 for(const token of ['.bg-white','.bg-gray-50','.bg-lime-50','.bg-amber-50','.bg-sky-50','.bg-purple-50','.bg-red-50','.text-gray-500','.text-lime-700','.text-red-600','input,select,textarea','calendar']){
   assert.ok(css.includes(token),'missing dark override: '+token);
 }
 assert.ok(css.includes('body.b3-dark .b3-settings-footer .b3-kofi-link'));
});
