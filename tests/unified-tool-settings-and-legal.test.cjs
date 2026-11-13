'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const paths=[
 'haushaltsbuch-kassenbon','umzugskisten-inventar','wg-organisator',
 'digitaler-nachlass','autokosten-reifenwechsel','haustier-gesundheitspass',
 'parkplatz-merker-parkschein-timer','verliehene-gegenstaende-verwalten',
 'pflanzenpflege-giessplan','zaehlerstaende-erfassen','backform-umrechner','wishlist'
];
test('every tool entry loads the same rotating settings control',()=>{
 const source=fs.readFileSync('assets/helferlein-unified-settings.js','utf8');
 const styles=fs.readFileSync('assets/helferlein-unified-settings.css','utf8');
 assert.doesNotThrow(()=>new Function(source));
 assert.match(styles,/helferlein-turn/);
 assert.match(styles,/prefers-reduced-motion/);
 assert.match(source,/isWishlist/);
 assert.match(source,/isEstate/);
 for(const name of paths){
   const html=fs.readFileSync('tools/'+name+'/index.html','utf8');
   assert.match(html,/helferlein-unified-settings\.css/,name);
   assert.match(html,/helferlein-unified-settings\.js/,name);
 }
});
test('homepage and legal texts match current features',()=>{
 const home=fs.readFileSync('index.html','utf8');
 const privacy=fs.readFileSync('datenschutz.html','utf8');
 const legal=fs.readFileSync('impressum.html','utf8');
 assert.doesNotMatch(home,/Kostenlos im Browser – die meisten Funktionen auch ohne Konto/);
 assert.match(home,/Was macht das drehende Zahnrad/);
 assert.match(privacy,/Wishlist, Freigaben und veröffentlichte Inhalte/);
 assert.match(legal,/§ 5 DDG/);
 assert.doesNotMatch(legal,/ec\.europa\.eu\/consumers\/odr/);
});
