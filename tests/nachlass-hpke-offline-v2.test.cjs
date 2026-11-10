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
