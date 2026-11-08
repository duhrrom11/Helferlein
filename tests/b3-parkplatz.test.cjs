'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'tools/parkplatz-merker-parkschein-timer/index.html'),'utf8');
const core=fs.readFileSync(path.join(root,'assets/helferlein-b3-core.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-parkplatz.css'),'utf8');
test('B3 Parkplatz has compact amber design and four stable panels',()=>{
 for(const file of ['helferlein-b3.css','helferlein-b3-parkplatz.css','helferlein-b3-core.js'])assert.ok(html.includes(file),file);
 for(const id of ['stats','timer','history','recommendations'])assert.equal((html.match(new RegExp('data-b3-panel="'+id+'"','g'))||[]).length,1,id);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.ok(html.includes('aria-label="Einstellungen öffnen"'));
 assert.doesNotMatch(html,/Zurück zur Startseite/);
});
test('Legacy GPS, timer, notifications and accounts untouched',()=>{
 for(const id of ['settingsModal','header-user-badge','header-user-email','cloud-status-text','auth-email','auth-password','timerDisplay','timerStatus','parkDesc','parkSector','parkCost','parkPhotoInput','timeFilter','parkingList','statCount','statCost','statGps','helpModal'])
 assert.ok(html.includes('id="'+id+'"'),id);
 for(const fn of ['startTimer','startParkscheibe','stopTimer','runTimerLoop','saveParkingSession','storeSessionData','renderParkingList','requestNotificationPermission','exportPDF','toggleSettingsModal','toggleHelpModal','supabaseLogin','supabaseLogout'])
 assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 for(const key of ['park_end_time','park_history_pro_v3'])assert.ok(html.includes(key),key);
 assert.doesNotMatch(core,/park_end_time|park_history_pro_v3|supabaseClient|saveParkingSession\(/);
});
test('Unified global theme and settings links preserved',()=>{
 assert.ok(html.includes("key:'parkplatz'"));
 assert.ok(html.includes("helpId:'helpModal'"));
 assert.ok(html.includes("locked:true"));
 assert.ok(core.includes('helferlein_ui_theme_v1')&&core.includes('helferlein_ui_layout_'));
 assert.ok(core.includes('Entdecke mehr Helferlein')&&core.includes('https://ko-fi.com/duhrrom'));
 assert.ok(css.includes('body.b3-parkplatz.b3-dark'));
});
