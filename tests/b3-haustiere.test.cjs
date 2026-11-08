'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/haustier-gesundheitspass/index.html'),'utf8');
const core=fs.readFileSync(path.join(root,'assets/helferlein-b3-core.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-haustiere.css'),'utf8');
test('Haustier B3 has compact header, navigation and five sections',()=>{
 for(const file of ['helferlein-b3.css','helferlein-b3-haustiere.css','helferlein-b3-core.js'])assert.ok(html.includes(file),file);
 for(const id of ['stats','deadlines','create','medication','records'])assert.equal((html.match(new RegExp('data-b3-panel="'+id+'"','g'))||[]).length,1,id);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('aria-label="Einstellungen öffnen"'));
 assert.doesNotMatch(html,/← Zurück zur Startseite/);
});
test('Preserves medical records, storage IDs and health workflows',()=>{
 for(const id of ['settingsModal','userInfo','cloudStatus','statPets','statEvents','statCosts','deadlinesCard','deadlinesList','petName','petSpecies','petChip','petVetName','petPhotoInput','petPassportInput','eventPetSelect','eventType','eventDate','eventTitle','medName','petsList','eventsList','helpBox','helpToggleBtn'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['registerUser','loginUser','logoutUser','savePet','deletePet','saveMedication','deleteMedication','saveEvent','deleteEvent','loadPetDropdowns','renderApp','downloadICS','exportPDF','exportBackup','importBackup','toggleHelp'])
  assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 assert.ok(html.includes('haustier_pass_pro_v5'));
 assert.doesNotMatch(core,/haustier_pass_pro_v5|supabaseClient|savePet\(|saveMedication\(|saveEvent\(/);
});
test('Unified local design preferences and end-of-settings links',()=>{
 assert.ok(html.includes("key:'haustiere'"));
 assert.ok(html.includes("helpId:'helpBox'"));
 assert.ok(core.includes('helferlein_ui_theme_v1'));
 assert.ok(core.includes('helferlein_ui_layout_'));
 assert.ok(core.includes('Entdecke mehr Helferlein'));
 assert.ok(core.includes('https://ko-fi.com/duhrrom'));
 assert.ok(css.includes('body.b3-haustiere.b3-dark'));
});
