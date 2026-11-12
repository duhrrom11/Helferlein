import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportWishlistCsv} from './wishlist-utils.mjs';

const wish=(overrides={})=>({
 wishlist_products:{asin:'B012345678',marketplace:'amazon.de',title:'Buch'},
 note:'',priority:2,created_at:'2026-11-10T00:00:00Z',...overrides
});

test('CSV formula protection also covers whitespace-prefixed spreadsheet expressions',()=>{
 for(const dangerous of ['=1+1','+1+1','-1+1','@SUM(1)','\t=1+1','\n=1+1','  =1+1']){
  const csv=exportWishlistCsv([wish({wishlist_products:{asin:'B012345678',marketplace:'amazon.de',title:dangerous}})]);
  assert.ok(csv.includes('"\''+dangerous.replace(/\r\n?/g,'\n')+'"'),JSON.stringify(dangerous));
 }
});

test('CSV escapes delimiters and quotes, normalizes carriage returns and ends with CRLF',()=>{
 const csv=exportWishlistCsv([wish({note:'Erste; "Zeile"\r\nZweite\rDritte'})]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes('"Erste; ""Zeile""\nZweite\nDritte"'));
 assert.ok(csv.endsWith('\r\n'));
 assert.ok(!csv.includes('\rDritte'));
});

test('CSV refuses invalid priorities and product references rather than silently exporting them',()=>{
 for(const priority of [0,4,'2 ',null,undefined]){
  assert.throws(()=>exportWishlistCsv([wish({priority})]),/Priorität/);
 }
 for(const product of [null,{}, {asin:'B012345678',marketplace:'amazon.com',title:'Buch'}, {asin:'B01234567!',marketplace:'amazon.de',title:'Buch'}]){
  assert.throws(()=>exportWishlistCsv([wish({wishlist_products:product})]),/Exportdatensatz/);
 }
});

test('CSV exports empty wishlists as a header-only file',()=>{
 const csv=exportWishlistCsv([]);
 assert.equal(csv.split('\r\n').length,2);
 assert.ok(csv.includes('Amazon-ASIN'));
});
