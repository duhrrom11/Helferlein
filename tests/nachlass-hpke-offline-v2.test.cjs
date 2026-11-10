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

test('official RFC 9180 published JSON vector: X25519 HKDF-SHA256 AES-256-GCM base mode',()=>{
 // Source: CFRG RFC 9180 TestVectors, pinned commit 5f503c564da00b0687b3de75f1dfbdfc4079ad31
 // https://github.com/cfrg/draft-irtf-cfrg-hpke/blob/5f503c564da00b0687b3de75f1dfbdfc4079ad31/test-vectors.json
 const {createPrivateKey,createPublicKey}=require('node:crypto');
 const skRm='497b4502664cfea5d5af0b39934dac72242a74f8480451e1aee7d6a53320333d';
 const pkRm='430f4b9859665145a6b1ba274024487bd66f03a2dd577d7753c68d7d7d00c00c';
 const enc='6c93e09869df3402d7bf231bf540fadd35cd56be14f97178f0954db94b7fc256';
 const pt='4265617574792069732074727574682c20747275746820626561757479';
 const ct='e5d84cd531cfb583096e7cfa9641bd3079cf3a91cda813c52deb5f512be9931980a41de125a925cdad859d5b7a';
 const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b656e04220420','hex'),Buffer.from(skRm,'hex')]),format:'der',type:'pkcs8'});
 const derived=createPublicKey(privateKey).export({format:'der',type:'spki'}).subarray(12);
 assert.equal(derived.toString('hex'),pkRm);
 assert.equal(open(privateKey,Buffer.from(enc,'hex'),Buffer.from(ct,'hex'),{
   info:Buffer.from('4f6465206f6e2061204772656369616e2055726e','hex'),
   aad:Buffer.from('436f756e742d30','hex')
 }).toString('hex'),pt);
});

test('official CFRG vector rejects modified authenticated data',()=>{
 const {createPrivateKey}=require('node:crypto');
 const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b656e04220420','hex'),Buffer.from('497b4502664cfea5d5af0b39934dac72242a74f8480451e1aee7d6a53320333d','hex')]),format:'der',type:'pkcs8'});
 const enc=Buffer.from('6c93e09869df3402d7bf231bf540fadd35cd56be14f97178f0954db94b7fc256','hex');
 const ciphertext=Buffer.from('e5d84cd531cfb583096e7cfa9641bd3079cf3a91cda813c52deb5f512be9931980a41de125a925cdad859d5b7a','hex');
 assert.throws(()=>open(privateKey,enc,ciphertext,{info:Buffer.from('4f6465206f6e2061204772656369616e2055726e','hex'),aad:Buffer.from('436f756e742d31','hex')}),/hpke_open_failed/);
});
test('offline HPKE rejects malformed ciphertext and oversized context',()=>{
 const receiver=keyPair(),env=seal(receiver.publicKey,randomBytes(32),{info,aad});
 for(const length of [0,16,4113]) assert.throws(()=>open(receiver.privateKey,env.enc,Buffer.alloc(length),{info,aad}),/invalid_hpke_input/);
 assert.throws(()=>open(receiver.privateKey,env.enc,env.ciphertext,{info:Buffer.alloc(1025),aad}),/invalid_hpke_input/);
 assert.throws(()=>seal(receiver.publicKey,randomBytes(32),{info,aad:Buffer.alloc(1025)}),/invalid_hpke_input/);
});

test('CFRG base vector: independently derived KEM and key-schedule checkpoints',()=>{
 // Inputs from pinned CFRG test-vectors.json; checkpoint values independently
 // calculated with Python cryptography (X25519 + HMAC-SHA256), not a second vector.
 const {createPrivateKey,createPublicKey,diffieHellman,createHmac}=require('node:crypto');
 const hex=s=>Buffer.from(s,'hex'), H=(salt,data)=>createHmac('sha256',salt.length?salt:Buffer.alloc(32)).update(data).digest();
 const expand=(prk,info,n)=>{let t=Buffer.alloc(0),out=Buffer.alloc(0);for(let i=1;out.length<n;i++){t=H(prk,Buffer.concat([t,info,Buffer.from([i])]));out=Buffer.concat([out,t]);}return out.subarray(0,n);};
 const labeledExtract=(suite,salt,label,ikm)=>H(salt,Buffer.concat([Buffer.from('HPKE-v1'),suite,Buffer.from(label),ikm]));
 const labeledExpand=(suite,prk,label,info,n)=>expand(prk,Buffer.concat([Buffer.from([n>>8,n&255]),Buffer.from('HPKE-v1'),suite,Buffer.from(label),info]),n);
 const sk=hex('497b4502664cfea5d5af0b39934dac72242a74f8480451e1aee7d6a53320333d');
 const enc=hex('6c93e09869df3402d7bf231bf540fadd35cd56be14f97178f0954db94b7fc256');
 const pk=hex('430f4b9859665145a6b1ba274024487bd66f03a2dd577d7753c68d7d7d00c00c');
 const info=hex('4f6465206f6e2061204772656369616e2055726e');
 const priv=createPrivateKey({key:Buffer.concat([hex('302e020100300506032b656e04220420'),sk]),format:'der',type:'pkcs8'});
 const pub=createPublicKey({key:Buffer.concat([hex('302a300506032b656e032100'),enc]),format:'der',type:'spki'});
 const dh=diffieHellman({privateKey:priv,publicKey:pub});
 assert.equal(dh.toString('hex'),'98fdfbcb860bc6c218a3fd783062ae1f37af6e3581619eea9591818d746aa50b');
 const kem=Buffer.from('4b454d0020','hex'),suite=Buffer.from('48504b45002000010002','hex');
 const eae=labeledExtract(kem,Buffer.alloc(0),'eae_prk',dh);
 assert.equal(eae.toString('hex'),'16dddf8760ee2a311348f351b675edddfb857a1c47858ecef9ca9cbe87cbfa52');
 const shared=labeledExpand(kem,eae,'shared_secret',Buffer.concat([enc,pk]),32);
 assert.equal(shared.toString('hex'),'3101c54c3a4f87439eaac080699ed9bbcc726ffe44e860c0424ccb7e3e2ead7b');
 const psk=labeledExtract(suite,Buffer.alloc(0),'psk_id_hash',Buffer.alloc(0));
 const ih=labeledExtract(suite,Buffer.alloc(0),'info_hash',info);
 const ks=Buffer.concat([Buffer.from([0]),psk,ih]);
 const secret=labeledExtract(suite,shared,'secret',Buffer.alloc(0));
 assert.equal(secret.toString('hex'),'2058ac9b02c1f52c1aaf08bedbec9198219751a94ef67b7d5f0c8b6e2b54ebfb');
 assert.equal(labeledExpand(suite,secret,'key',ks,32).toString('hex'),'f50b0609186798729ed0564b36ef2ef8044f1f9d05636874d1f46c819c7a669f');
 assert.equal(labeledExpand(suite,secret,'base_nonce',ks,12).toString('hex'),'151d9929e2449747889bc923');
});

test('CFRG JSON encryption[1] verifies sequence-one nonce and ciphertext independently',()=>{
 // Pinned CFRG test-vectors.json, entry mode=0/kem_id=32/kdf_id=1/aead_id=2,
 // encryptions[1]. This is a second encryption in the SAME suite vector,
 // not an independent KEM setup or supported offline open() operation.
 const {createDecipheriv}=require('node:crypto');
 const hex=s=>Buffer.from(s,'hex');
 const key=hex('f50b0609186798729ed0564b36ef2ef8044f1f9d05636874d1f46c819c7a669f');
 const baseNonce=hex('151d9929e2449747889bc923');
 const nonce=Buffer.from(baseNonce);nonce[11]^=1;
 assert.equal(nonce.toString('hex'),'151d9929e2449747889bc922');
 const ct=hex('2c43aff25343fdbff864506f0818b9d87df84ea01b1a2144d23b4d40c26bf655fdf197fe40297a8aebeed5cc2d');
 const aad=hex('436f756e742d31');
 const decipher=createDecipheriv('aes-256-gcm',key,nonce);
 decipher.setAAD(aad);decipher.setAuthTag(ct.subarray(-16));
 const pt=Buffer.concat([decipher.update(ct.subarray(0,-16)),decipher.final()]);
 assert.equal(pt.toString('hex'),'4265617574792069732074727574682c20747275746820626561757479');
});

test('tampered AES-GCM authentication tag fails closed',()=>{
 const receiver=keyPair(),env=seal(receiver.publicKey,randomBytes(32),{info,aad});
 const tampered=Buffer.from(env.ciphertext);tampered[tampered.length-1]^=0x01;
 assert.throws(()=>open(receiver.privateKey,env.enc,tampered,{info,aad}),/hpke_open_failed/);
});
test('low-order X25519 public keys cannot be used for seal or open',()=>{
 const receiver=keyPair(),dek=randomBytes(32);
 const zero=Buffer.alloc(32);
 assert.throws(()=>seal(zero,dek,{info,aad}));
 const env=seal(receiver.publicKey,dek,{info,aad});
 assert.throws(()=>open(receiver.privateKey,zero,env.ciphertext,{info,aad}));
 assert.throws(()=>seal(Buffer.alloc(31),dek,{info,aad}),/invalid_public_key/);
});
test('HPKE accepts maximum 1024-byte info and AAD and rejects 1025',()=>{
 const receiver=keyPair(),dek=randomBytes(32);
 const maxInfo=Buffer.alloc(1024,0x49),maxAad=Buffer.alloc(1024,0x41);
 const env=seal(receiver.publicKey,dek,{info:maxInfo,aad:maxAad});
 assert.deepEqual(open(receiver.privateKey,env.enc,env.ciphertext,{info:maxInfo,aad:maxAad}),dek);
 assert.throws(()=>seal(receiver.publicKey,dek,{info:Buffer.alloc(1025),aad:maxAad}),/invalid_hpke_input/);
 assert.throws(()=>open(receiver.privateKey,env.enc,env.ciphertext,{info:maxInfo,aad:Buffer.alloc(1025)}),/invalid_hpke_input/);
});
test('HPKE ciphertext lower and upper length boundaries fail safely',()=>{
 const receiver=keyPair(),env=seal(receiver.publicKey,randomBytes(32),{info,aad});
 for(const n of [16,4113]) assert.throws(()=>open(receiver.privateKey,env.enc,Buffer.alloc(n),{info,aad}),/invalid_hpke_input/);
 for(const n of [17,4112]) assert.throws(()=>open(receiver.privateKey,env.enc,Buffer.alloc(n),{info,aad}),/hpke_open_failed/);
});
