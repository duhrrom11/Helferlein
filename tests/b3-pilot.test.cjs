'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'tools/pflanzenpflege-giessplan/index.html'),'utf8');
const css = fs.readFileSync(path.join(root,'assets/helferlein-b3.css'),'utf8');
const js = fs.readFileSync(path.join(root,'assets/helferlein-b3.js'),'utf8');
const panels = ['actions','stats','calendar','create','plants','recommendations'];
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
test('Editor supports reversible changes and mobile navigation',()=>{
 for(const label of ['Speichern','Abbrechen','Standardlayout','Sichtbar','b3-mobile-nav','b3-scrolled-away']){
   assert.ok(js.includes(label)||css.includes(label),label);
 }
 assert.match(css,/max-width:767px/);
 assert.match(css,/min-width:1024px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
