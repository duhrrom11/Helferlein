'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHeirRepository,QUERY}=require('../tools/digitaler-nachlass/heir-repository-v2.cjs');
const {createTransactionalHeirRepository}=require('../tools/digitaler-nachlass/heir-transaction-v2.cjs');
const id={vaultId:'v_12345678',userId:'22222222-2222-4222-8222-222222222222'};
const row={vault_id:id.vaultId,owner_user_id:'11111111-1111-4111-8111-111111111111',state:'RELEASED',membership_vault_id:id.vaultId,heir_user_id:id.userId,status:'ACTIVE',identity_verified:true,encrypted_envelope:{ciphertext:'opaque'}};
test('repository query uses placeholders and locks vault, membership, envelope',()=>{
 assert.match(QUERY,/v\.id\s*=\s*\$1/);
 assert.match(QUERY,/m\.heir_user_id\s*=\s*\$2/);
 assert.match(QUERY,/for share of v, m, e/i);
});
test('invalid identifiers never reach SQL',async()=>{
 let count=0;const repo=createHeirRepository({query:async()=>{count++;throw Error('must not query');}});
 for(const identity of [{...id,vaultId:"v_12345678';DROP TABLE vaults;--"},{...id,userId:"' OR TRUE --"},{...id,userId:''}])assert.equal(await repo.readAuthorizedEnvelopeSnapshot(identity),null);
 assert.equal(count,0);
});
test('duplicate rows and cross-vault row fail closed',async()=>{
 for(const rows of [[row,row],[{...row,membership_vault_id:'v_other123'}],[{...row,heir_user_id:'33333333-3333-4333-8333-333333333333'}]]){
  const repo=createHeirRepository({query:async()=>({rows})});
  assert.equal(await repo.readAuthorizedEnvelopeSnapshot(id),null);
 }
});
test('valid query binds user and vault as separate arguments',async()=>{
 let args;const repo=createHeirRepository({query:async(sql,params)=>{args=params;return {rows:[row]};}});
 const result=await repo.readAuthorizedEnvelopeSnapshot(id);
 assert.deepEqual(args,[id.vaultId,id.userId]);assert.deepEqual(result.envelope,{ciphertext:'opaque'});
});
test('connection failure does not fabricate an envelope',async()=>{
 const repo=createTransactionalHeirRepository({connect:async()=>{throw Error('connection unavailable');}});
 await assert.rejects(repo.readAuthorizedEnvelopeSnapshot(id),/connection unavailable/);
});
