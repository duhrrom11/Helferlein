import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportProgressText} from './wishlist-utils.mjs';

test('export progress supports unknown and valid totals',()=>{
 assert.equal(exportProgressText(0),'0 Wünsche geladen …');
 assert.equal(exportProgressText(2,5),'2 von 5 Wünschen geladen …');
 assert.equal(exportProgressText(5,5),'5 von 5 Wünschen geladen …');
});
test('export progress rejects invalid totals and counts',()=>{
 for(const [count,total] of [[-1,null],[1,-1],[2,1],[0,1.5],[0,NaN],[0,Infinity],[0,'5'],[0,undefined],[Number.MAX_SAFE_INTEGER+1,null]]){
  assert.throws(()=>exportProgressText(count,total),/Ungültiger Exportfortschritt/);
 }
});
