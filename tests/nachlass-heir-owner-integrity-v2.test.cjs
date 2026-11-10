'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHeirRepository}=require('../tools/digitaler-nachlass/heir-repository-v2.cjs');
const vaultId='v_12345678',userId='22222222-2222-4222-8222-222222222222';
const row={vault_id:vaultId,owner_user_id:'11111111-1111-4111-8111-111111111111',state:'RELEASED',membership_vault_id:vaultId,heir_user_id:userId,status:'ACTIVE',identity_verified:true,encrypted_envelope:{ciphertext:'dummy'}};
for(const owner of [null,undefined,'not-a-uuid',42])test('reject invalid owner identity '+String(owner),async()=>{
 const repository=createHeirRepository({query:async()=>({rows:[{...row,owner_user_id:owner}]})});
 assert.equal(await repository.readAuthorizedEnvelopeSnapshot({vaultId,userId}),null);
});
test('valid distinct owner remains permitted',async()=>{
 const repository=createHeirRepository({query:async()=>({rows:[row]})});
 assert.deepEqual((await repository.readAuthorizedEnvelopeSnapshot({vaultId,userId})).envelope,{ciphertext:'dummy'});
});
