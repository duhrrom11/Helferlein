'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/backform-umrechner/index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'assets/helferlein-b3-backform.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-backform.css'),'utf8');
test('B3 Backform has new header, all five original tabs and settings',()=>{
 for(const file of ['helferlein-b3.css','helferlein-b3-backform.css','helferlein-b3-backform.js'])assert.ok(html.includes(file),file);
 for(const id of ['rechner','finder','substanz','tools','rezepte']){
  assert.equal((html.match(new RegExp('id="btn-tab-'+id+'"','g'))||[]).length,1,'button '+id);
  assert.equal((html.match(new RegExp('id="tab-'+id+'"','g'))||[]).length,1,'tab '+id);
 }
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('aria-label="Einstellungen öffnen"'));
 assert.doesNotMatch(html,/Zurück zur Startseite/);
});
test('Recipe calculator, scaling, oven mode, saved recipes and timers remain',()=>{
 for(const id of ['settings-modal','cloud-status-box','auth-email','auth-password','help-box','recipe-name','recipe-input','unit-system','orig-shape','target-shape','orig-d','target-d','base-time','base-temp','oven-mode','recipe-material','res-factor','res-time','combinator-mode','saved-recipes-list','cook-modal','timer-display','timer-phase-title'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['supabaseLogin','supabaseRegister','supabaseLogout','checkUserSession','toggleHelp','openSettings','closeSettings','openTab','updateShapeInputs','getArea','calculateAll','calculateRecipe','runFormFinder','calculateSugar','saveRecipeToStorage','renderSavedRecipes','openCookMode','startTimer','pauseTimer','nextTimerPhase'])
  assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 assert.ok(html.includes('helperly_recipes_pro'));
 assert.doesNotMatch(ui,/helperly_recipes_pro|supabaseClient|saveRecipeToStorage\(|calculateAll\(|calculateRecipe\(/);
});
test('B3 settings include independent global design preferences and Ko-fi',()=>{
 assert.ok(ui.includes('helferlein_ui_theme_v1'));
 assert.ok(ui.includes('helferlein_ui_layout_backform_v1'));
 assert.ok(html.includes('b3-backform-preferences'));
 assert.ok(html.includes('https://ko-fi.com/duhrrom'));
 assert.ok(html.includes('Entdecke mehr Helferlein'));
 assert.ok(css.includes('body.b3-backform.b3-dark'));
});
