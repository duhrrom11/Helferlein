import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfileSearch,validateWishFields,validateHandle,validatePriority,profilePageUrl,isUniqueViolation,requestedProfileHandle,validateProfileFields} from './wishlist-utils.mjs';
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

test('validates only allowed priorities',()=>{
 for(const value of ['1','2','3'])assert.equal(validatePriority(value),Number(value));
 for(const value of ['0','4','1.5','NaN','foo'])assert.throws(()=>validatePriority(value));
});

test('public profile URLs preserve safe query state and clear imported product links',()=>{
 const base='https://example.org/amazon-wishlist/?url=https%3A%2F%2Fwww.amazon.de%2Fdp%2FB0ABC12345&lang=de';
 const selected=new URL(profilePageUrl(base,'Alice_123'));
 assert.equal(selected.searchParams.get('profile'),'alice_123');
 assert.equal(selected.searchParams.get('url'),null);
 assert.equal(selected.searchParams.get('lang'),'de');
 const cleared=new URL(profilePageUrl(selected.toString()));
 assert.equal(cleared.searchParams.get('profile'),null);
 assert.equal(cleared.searchParams.get('lang'),'de');
 assert.throws(()=>profilePageUrl(base,'invalid handle'));
});

test('retries product creation only for PostgreSQL unique violations',()=>{
 assert.equal(isUniqueViolation({code:'23505'}),true);
 for(const error of [{code:'42501'},{code:'23503'},{message:'permission denied'},null,undefined])assert.equal(isUniqueViolation(error),false);
});

test('deep-linked profile handles are normalized and invalid values ignored',()=>{
 assert.equal(requestedProfileHandle('Alice_123'),'alice_123');
 assert.equal(requestedProfileHandle('  BOB  '),'bob');
 for(const value of [null,'','ab','a b','üser','x'.repeat(31)])assert.equal(requestedProfileHandle(value),null);
});

test('public profile fields are trimmed and length-limited',()=>{
 assert.deepEqual(validateProfileFields('  Alice  ','  Hallo  '),{display_name:'Alice',bio:'Hallo'});
 assert.deepEqual(validateProfileFields('Alice',''),{display_name:'Alice',bio:''});
 for(const value of ['', '  ', 'x'.repeat(81), null])assert.throws(()=>validateProfileFields(value,''));
 assert.throws(()=>validateProfileFields('Alice','x'.repeat(501)));
});
