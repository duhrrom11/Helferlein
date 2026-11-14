'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/helferlein-b3-startseite.css'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/helferlein-b3-startseite.js'),'utf8');
test('Helferlein B3 homepage provides themed landing page with eleven everyday tools and Wishlist',()=>{
 for(const name of ['helferlein-b3-startseite.css','helferlein-b3-startseite.js'])assert.ok(html.includes(name),name);
 const cards=[...html.matchAll(/<div class="tool-card[^>]*data-id="([^"]+)"[^>]*data-category="([^"]+)"/g)];
 assert.equal(cards.length,12);
 assert.equal(new Set(cards.map(m=>m[1])).size,12);
 const hrefs=[...new Set([...html.matchAll(/href="(tools\/[^"]+\/index\.html)"/g)].map(m=>m[1]))];
 assert.equal(hrefs.length,12);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 for(const id of ['main-content','toolsGrid','b3-quickstart-list','settingsBtn','userInfo','settingsModal','cloudStatus','b3-hub-theme'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const cat of ['alle','finanzen','zuhause','organisation','unterwegs','tiere'])assert.ok(html.includes('data-b3-category-filter="'+cat+'"'),cat);
 assert.ok(html.includes('class="b3-hub-hero"'));
 assert.ok(css.includes('body.b3-home.b3-dark'));
});
test('Existing favourites, account actions and global backups preserved',()=>{
 for(const fn of ['registerUser','loginUser','logoutUser','toggleFavorite','initFavorites','filterTools','exportGlobalBackup','importGlobalBackup','isAuthSessionStorageKey','isHelferleinBackupKey','closeSettings','openSettings'])
  assert.ok(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),fn);
 for(const key of ['hub_favorites','digital_estate_vault','energie_tracker_pro_v8','helperly_recipes_pro','mini_homebox_pro','kfz_tracker_pro_v3'])
 assert.ok(html.includes(key),key);
 assert.match(html,/Dieses Backup ist NICHT verschlüsselt/);
 assert.match(html,/Backup enthält Nachlass-Tresordaten/);
 assert.doesNotMatch(js,/supabaseClient|exportGlobalBackup\(|importGlobalBackup\(|hub_favorites|digital_estate_vault/);
 assert.ok(js.includes('helferlein_ui_theme_v1'));
});
test('Category filters, support and legal links remain reachable without removed search',()=>{
 assert.ok(html.includes('const visible = categoryMatches;'));
 assert.ok(!html.includes('id="searchBox"'));
 assert.ok(html.includes('data-category'));
 assert.ok(html.includes('href="https://ko-fi.com/duhrrom"'));
 assert.ok(html.includes('href="datenschutz.html"'));
 assert.ok(html.includes('href="impressum.html"'));
 assert.ok(html.includes('Entdecke mehr Helferlein'));
});
