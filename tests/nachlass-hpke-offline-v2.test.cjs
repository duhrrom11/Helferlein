'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {keyPair,seal,open}=require('../tools/digitaler-nachlass/hpke-offline-v2.cjs');
const info=Buffer.from('helferlein-v2-key-envelope:version=2:vault=0123456789abcdef:heir=123e4567-e89b-42d3-a456-426614174000');
const aad=Buffer.from('vault=0123456789abcdef;key=key_0123456789abcdef');
test('RFC 9180 base-mode offline X25519/HKDF-SHA256/AES-256-GCM roundtrip',()=>{
 const receiver=keyPair(),dek=randomBytes(32);
 const env=seal(receiver.publicKey,dek,{info,aad});
 assert.equal(env.enc.length,32);
 assert.equal(env.ciphertext.length,48);
 assert.deepEqual(open(receiver.privateKey,env.enc,env.ciphertext,{info,aad}),dek);
});
test('wrong recipient cannot open HPKE envelope',()=>{
 const receiver=keyPair(),other=keyPair();
 const env=seal(receiver.publicKey,randomBytes(32),{info,aad});
 assert.throws(()=>open(other.privateKey,env.enc,env.ciphertext,{info,aad}),/hpke_open_failed/);
});
test('HPKE info and AAD are authenticated',()=>{
 const receiver=keyPair(),env=seal(receiver.publicKey,randomBytes(32),{info,aad});
 assert.throws(()=>open(receiver.privateKey,env.enc,env.ciphertext,{info:Buffer.from('wrong'),aad}),/hpke_open_failed/);
 assert.throws(()=>open(receiver.privateKey,env.enc,env.ciphertext,{info,aad:Buffer.from('wrong')}),/hpke_open_failed/);
});
test('ciphertext, encapsulated key and malformed inputs fail closed',()=>{
 const receiver=keyPair(),env=seal(receiver.publicKey,randomBytes(32),{info,aad});
 const corrupted=Buffer.from(env.ciphertext);corrupted[0]^=1;
 assert.throws(()=>open(receiver.privateKey,env.enc,corrupted,{info,aad}),/hpke_open_failed/);
 assert.throws(()=>open(receiver.privateKey,Buffer.alloc(5),env.ciphertext,{info,aad}),/invalid_hpke_input/);
 assert.throws(()=>seal(receiver.publicKey,Buffer.alloc(16),{info,aad}),/invalid_hpke_input/);
});
test('new encapsulated key per envelope',()=>{
 const receiver=keyPair(),dek=randomBytes(32);
 const a=seal(receiver.publicKey,dek,{info,aad});
 const b=seal(receiver.publicKey,dek,{info,aad});
 assert.notDeepEqual(a.enc,b.enc);
 assert.notDeepEqual(a.ciphertext,b.ciphertext);
});

test('published CFRG RFC 9180 vector: base X25519/HKDF-SHA256/AES-256-GCM',()=>{
 // https://github.com/cfrg/draft-irtf-cfrg-hpke/blob/5f503c564da00b0687b3de75f1dfbdfc4079ad31/test-vectors.json
 const {createPrivateKey,createPublicKey}=require('node:crypto');
 const skRm='497b4502664cfea5d5af0b39934dac72242a74f8480451e1aee7d6a53320333d';
 const pkRm='430f4b9859665145a6b1ba274024487bd66f03a2dd577d7753c68d7d7d00c00c';
 const enc='6c93e09869df3402d7bf231bf540fadd35cd56be14f97178f0954db94b7fc256';
 const pt='4265617574792069732074727574682c20747275746820626561757479';
 const ct='e5d84cd531cfb583096e7cfa9641bd3079cf3a91cda813c52deb5f512be9931980a41de125a925cdad859d5b7a';
 const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b656e04220420','hex'),Buffer.from(skRm,'hex')]),format:'der',type:'pkcs8'});
 assert.equal(createPublicKey(privateKey).export({format:'der',type:'spki'}).subarray(12).toString('hex'),pkRm);
 const options={info:Buffer.from('4f6465206f6e2061204772656369616e2055726e','hex'),aad:Buffer.from('436f756e742d30','hex')};
 assert.equal(open(privateKey,Buffer.from(enc,'hex'),Buffer.from(ct,'hex'),options).toString('hex'),pt);
 assert.throws(()=>open(privateKey,Buffer.from(enc,'hex'),Buffer.from(ct,'hex'),{...options,aad:Buffer.from('436f756e742d31','hex')}),/hpke_open_failed/);
});
test('HPKE rejects invalid ciphertext lengths and malformed context',()=>{
 const receiver=keyPair(),env=seal(receiver.publicKey,randomBytes(32),{info,aad});
 for(const length of [0,16,4113]) assert.throws(()=>open(receiver.privateKey,env.enc,Buffer.alloc(length),{info,aad}),/invalid_hpke_input/);
 assert.throws(()=>open(receiver.privateKey,env.enc,env.ciphertext,{info:Buffer.alloc(1025),aad}),/invalid_hpke_input/);
 assert.throws(()=>seal(receiver.publicKey,randomBytes(32),{info,aad:Buffer.alloc(1025)}),/invalid_hpke_input/);
});
