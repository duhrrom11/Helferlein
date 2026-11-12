import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportWishlistJson} from './wishlist-utils.mjs';

const wish=(title='Buch',note='Für mich')=>({
 wishlist_products:{asin:'B0ABC12345',marketplace:'amazon.de',title},
 note,priority:2,created_at:'2026-11-10T00:00:00Z'
});

test('JSON backup keeps validated public fields without internal IDs',()=>{
 const json=JSON.parse(exportWishlistJson([wish('  Buch  ','  Danke  ')],{handle:'Alice_123',display_name:'Alice',bio:'Hallo',email:'private@example.org'}));
 assert.equal(json.format,'helferlein-wishlist-backup');
 assert.equal(json.version,1);
 assert.equal(json.wishes[0].title,'Buch');
 assert.equal(json.wishes[0].note,'Danke');
 assert.equal(json.wishes[0].amazon_url,'https://www.amazon.de/dp/B0ABC12345');
 assert.deepEqual(json.profile,{handle:'alice_123',display_name:'Alice',bio:'Hallo'});
 assert.equal(JSON.stringify(json).includes('private@example.org'),false);
});

test('JSON backup rejects empty, oversized or malformed public wish fields',()=>{
 for(const title of ['', '   ', 'x'.repeat(251),null]){
  assert.throws(()=>exportWishlistJson([wish(title)]),/Produkttitel/);
 }
 assert.throws(()=>exportWishlistJson([wish('Buch','x'.repeat(501))]),/Notiz/);
 for(const product of [{asin:'INVALID',marketplace:'amazon.de',title:'Buch'},{asin:'B0ABC12345',marketplace:'amazon.com',title:'Buch'}]){
  assert.throws(()=>exportWishlistJson([{...wish(),wishlist_products:product}]),/Exportdatensatz/);
 }
 assert.throws(()=>exportWishlistJson(null),/Exportdaten/);
});

test('JSON backup rejects invalid priorities instead of exporting inconsistent values',()=>{
 assert.throws(()=>exportWishlistJson([{...wish(),priority:0}]),/Priorität/);
});
