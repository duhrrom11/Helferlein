'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createTransactionalHeirRepository}=require('../tools/digitaler-nachlass/heir-transaction-v2.cjs');
const id='v_12345678',userId='22222222-2222-4222-8222-222222222222';
const row={vault_id:id,owner_user_id:'11111111-1111-4111-8111-111111111111',state:'RELEASED',membership_vault_id:id,heir_user_id:userId,status:'ACTIVE',identity_verified:true,encrypted_envelope:{ciphertext:'encrypted'}};
function fake(options={}){
 const calls=[];let released=0;
 const client={query:async(sql,args)=>{
  calls.push({sql,args});
  if(options.failAt===calls.length)throw Error('db-failure');
  if(/select v.id/i.test(sql))return {rows:options.rows||[row]};
  return {rows:[]};
 },release:()=>{released++;}};
 return {pool:{connect:async()=>client},calls,get released(){return released;}};
}
test('locked read occurs inside transaction and client is released',async()=>{
 const f=fake();
 const got=await createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot({vaultId:id,userId});
 assert.deepEqual(got.envelope,{ciphertext:'encrypted'});
 assert.match(f.calls[0].sql,/^BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY$/);
 assert.match(f.calls[1].sql,/for share of v, m, e/i);
 assert.deepEqual(f.calls[1].args,[id,userId]);
 assert.equal(f.calls[2].sql,'COMMIT');
 assert.equal(f.released,1);
});
test('query error rolls back and releases connection',async()=>{
 const f=fake({failAt:2});
 await assert.rejects(createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot({vaultId:id,userId}),/db-failure/);
 assert.deepEqual(f.calls.map(x=>x.sql==='ROLLBACK'?'ROLLBACK':x.sql.startsWith('BEGIN')?'BEGIN':'SELECT'),['BEGIN','SELECT','ROLLBACK']);
 assert.equal(f.released,1);
});
test('revoked and foreign snapshots fail closed',async()=>{
 for(const changes of [{status:'REVOKED'},{state:'LOCKED'},{heir_user_id:'33333333-3333-4333-8333-333333333333'}]){
  const f=fake({rows:[{...row,...changes}]});
  assert.equal(await createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot({vaultId:id,userId}),null);
  assert.equal(f.released,1);
 }
});
test('invalid pool is rejected and no write SQL is issued',async()=>{
 assert.throws(()=>createTransactionalHeirRepository({}),/invalid_pool/);
 const f=fake();
 await createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot({vaultId:id,userId});
 assert.equal(f.calls.some(x=>/\b(insert|update|delete)\b/i.test(x.sql)),false);
});
