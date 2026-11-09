import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfileSearch,validateWishFields,validateHandle,validatePriority,profilePageUrl,isUniqueViolation,requestedProfileHandle,validateProfileFields,feedPage,validateCredentials,validatedProfileSearch,shouldRestoreSharedProductUrl,isFeedRequestStale,isWishLocallyHidden} from './wishlist-utils.mjs';
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
 for(const value of ['0','4','1.5','NaN','foo',' 1 ','01','1e0',null,undefined,true,false,{},[]])assert.throws(()=>validatePriority(value));
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

test('feed pagination handles empty, partial, exact and overflowing pages',()=>{
 for(const count of [0,1,19,20,21,40]){
  const rows=Array.from({length:count},(_,i)=>i);
  const result=feedPage(rows);
  assert.deepEqual(result.items,rows.slice(0,20));
  assert.equal(result.hasMore,count>20);
 }
 const rows=Array.from({length:5},(_,i)=>i);
 assert.deepEqual(feedPage(rows,3),{items:[0,1,2],hasMore:true});
 assert.deepEqual(rows,[0,1,2,3,4]);
 assert.throws(()=>feedPage(null));
 assert.throws(()=>feedPage([],0));
});

test('auth credentials are validated and email whitespace removed',()=>{
 assert.deepEqual(validateCredentials('  person@example.org  ','abcdefgh'),{email:'person@example.org',password:'abcdefgh'});
 for(const email of ['', 'no-at-sign', 'x@', 'a @example.org', 'x@domain', 'a'.repeat(250)+'@example.org'])assert.throws(()=>validateCredentials(email,'abcdefgh'));
 for(const password of ['', 'short', null, undefined])assert.throws(()=>validateCredentials('person@example.org',password));
});

test('profile search rejects punctuation-only and one-character queries',()=>{
 assert.equal(validatedProfileSearch('  Änne (42) '),'Änne 42');
 for(const value of ['','!@#','a',' a! ','  ','--','a - ',null,undefined])assert.throws(()=>validatedProfileSearch(value));
 assert.equal(validatedProfileSearch(' a b '),'a b');
});

test('shared product URL survives sign-in only while still present in the editor',()=>{
 const shared='https://www.amazon.de/dp/B0ABC12345';
 assert.equal(shouldRestoreSharedProductUrl(shared,shared),true);
 assert.equal(shouldRestoreSharedProductUrl('https://www.amazon.de/dp/B0OTHER123',shared),false);
 assert.equal(shouldRestoreSharedProductUrl('',shared),false);
 assert.equal(shouldRestoreSharedProductUrl(shared,null),false);
});

test('feed freshness guard detects filter, sorting, pagination and account changes',()=>{
 const request={offset:20,revision:4,filter:'all',sort:'newest',userId:'account-a',profileId:null};
 assert.equal(isFeedRequestStale(request,{...request}),false);
 for(const [field,value] of Object.entries({offset:0,revision:5,filter:'mine',sort:'priority',userId:'account-b',profileId:'profile-a'})){
  assert.equal(isFeedRequestStale(request,{...request,[field]:value}),true,field);
 }
 assert.equal(isFeedRequestStale(request,{...request,userId:null}),true);
});


test('local wish and profile hiding are independent and reversible',()=>{
 const wish={id:'wish-a',user_id:'person-a'};
 const wishes=new Set(),profiles=new Set();
 assert.equal(isWishLocallyHidden(wish,wishes,profiles),false);
 wishes.add('wish-a');assert.equal(isWishLocallyHidden(wish,wishes,profiles),true);
 wishes.clear();profiles.add('person-a');assert.equal(isWishLocallyHidden(wish,wishes,profiles),true);
 assert.equal(isWishLocallyHidden({id:'wish-b',user_id:'person-a'},wishes,profiles),true);
 assert.equal(isWishLocallyHidden({id:'wish-c',user_id:'person-b'},wishes,profiles),false);
 profiles.clear();assert.equal(isWishLocallyHidden(wish,wishes,profiles),false);
});
