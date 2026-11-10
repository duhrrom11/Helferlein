'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHeirReadHandler}=require('../tools/digitaler-nachlass/heir-handler-v2.cjs');
const id='v_12345678',uid='22222222-2222-4222-8222-222222222222';
const auth={getUser:async()=>({data:{user:{id:uid,email_confirmed_at:'2026-01-01'}},error:null})};
const req=()=>new Request('https://localhost/v2/vaults/'+id+'/heir-envelope',{headers:{authorization:'Bearer abcdefghijklmnop'}});
test('composed handler reads released heir envelope with locked query',async()=>{
 const calls=[];
 const pool={connect:async()=>({query:async(sql,args)=>{
  calls.push(sql);
  if(sql.startsWith('select'))return {rows:[{vault_id:id,owner_user_id:'11111111-1111-4111-8111-111111111111',state:'RELEASED',membership_vault_id:id,heir_user_id:uid,status:'ACTIVE',identity_verified:true,encrypted_envelope:{ciphertext:'secret'}}]};
  return {rows:[]};
 },release:()=>{calls.push('RELEASE');}})};
 const res=await createHeirReadHandler({auth,pool})(req());
 assert.equal(res.status,200);assert.deepEqual(await res.json(),{encryptedEnvelope:{ciphertext:'secret'}});
 assert.equal(calls[0],'BEGIN ISOLATION LEVEL READ COMMITTED');
 assert.match(calls[1],/for share of v, m, e/i);
 assert.deepEqual(calls.slice(-2),['COMMIT','RELEASE']);
});
test('composed handler fails closed for revoked membership',async()=>{
 const pool={connect:async()=>({query:async sql=>sql.startsWith('select')?{rows:[]}:{rows:[]},release:()=>{}})};
 assert.equal((await createHeirReadHandler({auth,pool})(req())).status,404);
});
test('missing trusted dependencies rejected',()=>{
 assert.throws(()=>createHeirReadHandler({pool:{connect:async()=>{}}}),/invalid_auth_client/);
 assert.throws(()=>createHeirReadHandler({auth,pool:{}}),/invalid_pool/);
});
