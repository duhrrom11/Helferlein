import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfileSearch,validateWishFields,validateHandle} from './wishlist-utils.mjs';
test('normalizes search and strips PostgREST punctuation',()=>{
 assert.equal(normalizeProfileSearch('  Alice_(test)  '),'Alicetest');
 assert.equal(normalizeProfileSearch('  Änne  '),'Änne');
 assert.equal(normalizeProfileSearch('!@#$'),'');
});
test('validates public wish title and note length',()=>{
 assert.deepEqual(validateWishFields(' Buch ',' Danke '),{title:'Buch',note:'Danke'});
 assert.throws(()=>validateWishFields('   ',''));
 assert.throws(()=>validateWishFields('x'.repeat(251),''));
 assert.throws(()=>validateWishFields('Buch','x'.repeat(501)));
});
test('normalizes and checks handles',()=>{
 assert.equal(validateHandle('  TEST_123 '),'test_123');
 for(const bad of ['ab','A B','üser','x'.repeat(31)])assert.throws(()=>validateHandle(bad));
});
