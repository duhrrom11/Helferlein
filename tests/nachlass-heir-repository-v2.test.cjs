'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHeirRepository,QUERY}=require('../tools/digitaler-nachlass/heir-repository-v2.cjs');
const owner='11111111-1111-4111-8111-111111111111';
const heir='22222222-2222-4222-8222-222222222222';
const id='v_12345678';
const row={vault_id:id,owner_user_id:owner,state:'RELEASED',membership_vault_id:id,heir_user_id:heir,status:'ACTIVE',identity_verified:true,encrypted_envelope:{ciphertext:'encrypted'}};
test('one parameterized locked query returns only authorized envelope',async()=>{
 let count=0;const repo=createHeirRepository({query:async(sql,args)=>{
  count++;assert.equal(sql,QUERY);assert.deepEqual(args,[id,heir]);return {rows:[row]};
 }});
 assert.deepEqual((await repo.readAuthorizedEnvelopeSnapshot({vaultId:id,userId:heir})).envelope,row.encrypted_envelope);
 assert.equal(count,1);
 assert.match(QUERY,/for share of v, m, e/i);
 assert.match(QUERY,/m\.heir_user_id = \$2/);
});
test('malformed identifiers do not query database',async()=>{
 let count=0;const repo=createHeirRepository({query:async()=>{count++;return {rows:[row]};}});
 for(const vaultId of [null,'../etc','v_short']) assert.equal(await repo.readAuthorizedEnvelopeSnapshot({vaultId,userId:heir}),null);
 assert.equal(await repo.readAuthorizedEnvelopeSnapshot({vaultId:id,userId:'attacker'}),null);
 assert.equal(count,0);
});
test('deny mismatched, revoked, unreleased, and duplicate snapshots',async()=>{
 for(const changed of [{state:'LOCKED'},{status:'REVOKED'},{identity_verified:false},{heir_user_id:owner},{membership_vault_id:'v_other123'},{encrypted_envelope:null}]){
  const repo=createHeirRepository({query:async()=>({rows:[{...row,...changed}]})});
  assert.equal(await repo.readAuthorizedEnvelopeSnapshot({vaultId:id,userId:heir}),null);
 }
 const repo=createHeirRepository({query:async()=>({rows:[row,row]})});
 assert.equal(await repo.readAuthorizedEnvelopeSnapshot({vaultId:id,userId:heir}),null);
});
test('database failures are propagated for API to mask',async()=>{
 const repo=createHeirRepository({query:async()=>{throw Error('secret');}});
 await assert.rejects(repo.readAuthorizedEnvelopeSnapshot({vaultId:id,userId:heir}),/secret/);
 assert.throws(()=>createHeirRepository(null),/invalid_database/);
});
