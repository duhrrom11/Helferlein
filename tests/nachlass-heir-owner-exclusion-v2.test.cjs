'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHeirRepository,QUERY}=require('../tools/digitaler-nachlass/heir-repository-v2.cjs');
const vaultId='v_12345678';
const userId='22222222-2222-4222-8222-222222222222';
const base={vault_id:vaultId,owner_user_id:'11111111-1111-4111-8111-111111111111',state:'RELEASED',membership_vault_id:vaultId,heir_user_id:userId,status:'ACTIVE',identity_verified:true,encrypted_envelope:{ciphertext:'dummy'}};
test('SQL excludes owner identity before ciphertext is fetched',()=>assert.match(QUERY,/v\.owner_user_id\s*<>\s*\$2/i));
test('repository refuses owner-as-heir even if database returns a row',async()=>{
 const repository=createHeirRepository({query:async()=>({rows:[{...base,owner_user_id:userId}]})});
 assert.equal(await repository.readAuthorizedEnvelopeSnapshot({vaultId,userId}),null);
});
test('repository still accepts a distinct verified heir',async()=>{
 const repository=createHeirRepository({query:async()=>({rows:[base]})});
 assert.deepEqual((await repository.readAuthorizedEnvelopeSnapshot({vaultId,userId})).envelope,{ciphertext:'dummy'});
});
