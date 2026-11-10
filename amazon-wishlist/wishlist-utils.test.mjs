import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfileSearch,validateWishFields,validateHandle,validatePriority,profilePageUrl,isUniqueViolation,requestedProfileHandle,validateProfileFields,feedPage,validateCredentials,validatedProfileSearch,shouldRestoreSharedProductUrl,isFeedRequestStale,isWishLocallyHidden,profileDisplayLabel,wishlistErrorMessage,copyShareLink,exportWishlistCsv,priorityLabel,validateWishlistExportPage,exportWishlistJson,exportProgressText,previewWishlistBackup} from './wishlist-utils.mjs';
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

test('profile labels do not construct permalinks from invalid handles',()=>{
 assert.equal(profileDisplayLabel('  Anna ','ANNA_2'),'Anna (@anna_2)');
 assert.equal(profileDisplayLabel('','abc'),'Profil (@abc)');
 assert.equal(profileDisplayLabel('Alice','bad handle'),'Alice');
 assert.equal(profileDisplayLabel(null,null),'Profil');
});

test('database errors become actionable messages without leaking internals',()=>{
 assert.match(wishlistErrorMessage({code:'23505'}),/bereits/);
 assert.match(wishlistErrorMessage({code:'42501'}),/Berechtigung/);
 assert.match(wishlistErrorMessage({code:'23503'}),/nicht mehr/);
 assert.match(wishlistErrorMessage({status:429}),/Zu viele/);
 assert.match(wishlistErrorMessage({message:'Failed to fetch'}),/Netzwerkfehler/);
 assert.match(wishlistErrorMessage(null),/Unbekannter Fehler/);
});

test('share helper prefers Clipboard API and uses DOM fallback safely',async()=>{
 let copied='';
 const clipboard={writeText:async value=>{copied=value}};
 assert.equal(await copyShareLink('https://example.org/profile',clipboard),'clipboard');
 assert.equal(copied,'https://example.org/profile');
 let removed=false,selected=false;
 const fakeDoc={
  createElement:()=>({style:{},setAttribute(){},select(){selected=true},remove(){removed=true}}),
  body:{append(){}},
  execCommand:command=>command==='copy'
 };
 assert.equal(await copyShareLink('https://example.org/wish',null,fakeDoc),'fallback');
 assert.equal(selected,true);
 assert.equal(removed,true);
 await assert.rejects(()=>copyShareLink('javascript:alert(1)',clipboard));
});

test('backend error details are never shown to visitors',()=>{
 const secret='internal-table-user@example.com';
 assert.doesNotMatch(wishlistErrorMessage({code:'PGRST999',message:secret}),/internal-table/);
 assert.doesNotMatch(wishlistErrorMessage({status:500,message:secret}),/internal-table/);
 assert.match(wishlistErrorMessage({code:'23514'}),/Ungültige Eingabe/);
 assert.match(wishlistErrorMessage({code:'PGRST116'}),/nicht gefunden/);
 assert.match(wishlistErrorMessage(new Error('Bitte zuerst anmelden')),/Bitte zuerst anmelden/);
});

test('share links reject credentials and malformed HTTPS URLs',async()=>{
 const clipboard={writeText:async()=>{throw Error('must not copy')}};
 for(const link of ['https://user:pass@example.org/','https://','https://example.org@evil.test/','http://example.org/']){
  await assert.rejects(()=>copyShareLink(link,clipboard),/Ungültiger Link/);
 }
});

test('own-wishes CSV export escapes delimiters and spreadsheet formulas',()=>{
 const csv=exportWishlistCsv([{wishlist_products:{asin:'B012345678',marketplace:'amazon.de',title:'=SUM(1;2)'},note:'Text; mit "Zitat"\nzweite Zeile',priority:2,created_at:'2026-11-10T00:00:00Z'}]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.match(csv,/"'=SUM\(1;2\)"/);
 assert.match(csv,/"Text; mit ""Zitat""\nzweite Zeile"/);
 assert.match(csv,/https:\/\/www\.amazon\.de\/dp\/B012345678/);
 assert.equal(csv.split('\r\n').length,3);
 assert.match(exportWishlistCsv([]),/Amazon-ASIN/);
});
test('CSV export rejects malformed product references',()=>{
 assert.throws(()=>exportWishlistCsv(null));
 assert.throws(()=>exportWishlistCsv([{wishlist_products:{asin:'bad',marketplace:'amazon.de'},priority:1}]));
 assert.throws(()=>exportWishlistCsv([{wishlist_products:{asin:'B012345678',marketplace:'other'},priority:1}]));
});

test('priority labels match German UI and reject unsupported values',()=>{
 assert.equal(priorityLabel(1),'Sehr wichtig');
 assert.equal(priorityLabel('2'),'Normal');
 assert.equal(priorityLabel(3),'Irgendwann');
 assert.throws(()=>priorityLabel(0));
 assert.throws(()=>priorityLabel('hoch'));
});

test('export pagination fails closed on malformed backend results',()=>{
 assert.deepEqual(validateWishlistExportPage([{id:1}],2),[{id:1}]);
 assert.deepEqual(validateWishlistExportPage([],200),[]);
 assert.throws(()=>validateWishlistExportPage(null));
 assert.throws(()=>validateWishlistExportPage([1,2],1));
 assert.throws(()=>validateWishlistExportPage([],0));
});

test('portable JSON backup exports only public profile and wish fields',()=>{
 const input=[{id:444,user_id:'private-account-id',priority:1,note:'Notiz',created_at:'2026-11-10T00:00:00Z',wishlist_products:{id:888,asin:'B012345678',marketplace:'amazon.de',title:'Geschenk'}}];
 const profile={user_id:'private-account-id',handle:'tester_1',display_name:'Tester',bio:'Hallo',email:'private@example.com'};
 const parsed=JSON.parse(exportWishlistJson(input,profile));
 assert.equal(parsed.format,'helferlein-wishlist-backup');
 assert.equal(parsed.version,1);
 assert.deepEqual(parsed.profile,{handle:'tester_1',display_name:'Tester',bio:'Hallo'});
 assert.deepEqual(parsed.wishes[0],{asin:'B012345678',amazon_url:'https://www.amazon.de/dp/B012345678',title:'Geschenk',note:'Notiz',priority:1,created_at:'2026-11-10T00:00:00Z'});
 assert.doesNotMatch(JSON.stringify(parsed),/private-account-id|private@example.com/);
 assert.ok(parsed.exported_at);
});
test('JSON backup handles empty list and rejects invalid products',()=>{
 assert.deepEqual(JSON.parse(exportWishlistJson([])).wishes,[]);
 assert.equal(JSON.parse(exportWishlistJson([])).profile,null);
 assert.throws(()=>exportWishlistJson(null));
 assert.throws(()=>exportWishlistJson([{wishlist_products:{asin:'oops',marketplace:'amazon.de'},priority:2}]));
});
test('export progress only accepts nonnegative integers',()=>{
 assert.equal(exportProgressText(0),'0 Wünsche geladen …');
 assert.equal(exportProgressText(12,100),'12 von 100 Wünschen geladen …');
 for(const value of [-1,1.5,NaN,'12'])assert.throws(()=>exportProgressText(value));
 assert.equal(exportProgressText(0,0),'0 von 0 Wünschen geladen …');
 for(const total of [-1,1.5,NaN,'12',undefined,Infinity])assert.throws(()=>exportProgressText(1,total));
 assert.throws(()=>exportProgressText(2,1));
});

test('read-only JSON backup preview validates exported backups',()=>{
 const rows=[{wishlist_products:{asin:'B012345678',marketplace:'amazon.de',title:'Buch'},note:'Geschenk',priority:2,created_at:'2026-11-10T00:00:00Z'}];
 const json=exportWishlistJson(rows,{handle:'anna_123',display_name:'Anna',bio:'Hallo'});
 assert.deepEqual(previewWishlistBackup(json),{profile:{handle:'anna_123',display_name:'Anna',bio:'Hallo'},count:1,wishes:[{asin:'B012345678',title:'Buch',note:'Geschenk',priority:2}]});
 assert.deepEqual(previewWishlistBackup(exportWishlistJson([])),{profile:null,count:0,wishes:[]});
});
test('backup preview rejects unsupported, malformed and duplicated content',()=>{
 const good={format:'helferlein-wishlist-backup',version:1,profile:null,wishes:[{asin:'B012345678',title:'Buch',note:'',priority:1}]};
 for(const value of ['', '{', 'x'.repeat(2_000_001)])assert.throws(()=>previewWishlistBackup(value));
 for(const patch of [{version:2},{format:'other'},{wishes:null},{wishes:[good.wishes[0],good.wishes[0]]},{wishes:[{...good.wishes[0],asin:'INVALID'}]},{wishes:[{...good.wishes[0],title:''}]},{wishes:[{...good.wishes[0],priority:9}]},{profile:{handle:'bad name',display_name:'Name',bio:''}}]){
  assert.throws(()=>previewWishlistBackup(JSON.stringify({...good,...patch})));
 }
});
test('backup preview drops unexpected IDs and private fields',()=>{
 const parsed=previewWishlistBackup(JSON.stringify({format:'helferlein-wishlist-backup',version:1,profile:null,wishes:[{asin:'B012345678',title:'Buch',note:'',priority:1,user_id:'secret',email:'secret@example.org'}]}));
 assert.doesNotMatch(JSON.stringify(parsed),/secret|email|user_id/);
});
