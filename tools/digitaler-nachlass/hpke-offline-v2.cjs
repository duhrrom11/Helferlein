'use strict';
// Offline RFC 9180 HPKE Base mode, DHKEM(X25519, HKDF-SHA256), HKDF-SHA256,
// AES-256-GCM. Single-message seal/open; not wired into production.
const { generateKeyPairSync, createPublicKey, diffieHellman, createCipheriv, createDecipheriv } = require('node:crypto');
const KEM_ID = Buffer.from('0020','hex'), KDF_ID = Buffer.from('0001','hex'), AEAD_ID = Buffer.from('0002','hex');
const SUITE = Buffer.concat([Buffer.from('HPKE'), KEM_ID, KDF_ID, AEAD_ID]);
const KEM_SUITE = Buffer.concat([Buffer.from('KEM'), KEM_ID]);
const ZERO = Buffer.alloc(0);
const i2osp = (n, size) => { const b = Buffer.alloc(size); b.writeUIntBE(n,0,size); return b; };
const { createHmac } = require('node:crypto');
function hkdfExtract(salt, ikm) { return createHmac('sha256', salt.length ? salt : Buffer.alloc(32)).update(ikm).digest(); }
function hkdfExpand(prk, info, length) {
  if (length > 255*32) throw new Error('invalid_length');
  let t = ZERO; const blocks = [];
  for (let i=1; i<=Math.ceil(length/32); i++) {
    t = createHmac('sha256',prk).update(Buffer.concat([t,info,Buffer.from([i])])).digest();
    blocks.push(t);
  }
  return Buffer.concat(blocks).subarray(0,length);
}
function labeledExtract(suite,salt,label,ikm) {
  return hkdfExtract(salt,Buffer.concat([Buffer.from('HPKE-v1'),suite,Buffer.from(label),ikm]));
}
function labeledExpand(suite,prk,label,info,len) {
  return hkdfExpand(prk,Buffer.concat([i2osp(len,2),Buffer.from('HPKE-v1'),suite,Buffer.from(label),info]),len);
}
const PKCS8_PREFIX = Buffer.from('302e020100300506032b656e04220420','hex');
const SPKI_PREFIX = Buffer.from('302a300506032b656e032100','hex');
function rawPublic(key) {
  const der=key.export({format:'der',type:'spki'});
  if (!der.subarray(0,12).equals(SPKI_PREFIX) || der.length!==44) throw new Error('invalid_public_key');
  return der.subarray(12);
}
function importPublic(raw) {
  if (!Buffer.isBuffer(raw) || raw.length!==32) throw new Error('invalid_public_key');
  return createPublicKey({key:Buffer.concat([SPKI_PREFIX,raw]),format:'der',type:'spki'});
}
function keyPair() { const {publicKey,privateKey}=generateKeyPairSync('x25519'); return {publicKey:rawPublic(publicKey),privateKey}; }
function extractAndExpand(dh,kemContext) {
  const eae=labeledExtract(KEM_SUITE,ZERO,'eae_prk',dh);
  return labeledExpand(KEM_SUITE,eae,'shared_secret',kemContext,32);
}
function context(sharedSecret,info) {
  if (!Buffer.isBuffer(info) || info.length>1024) throw new Error('invalid_info');
  const pskIdHash=labeledExtract(SUITE,ZERO,'psk_id_hash',ZERO);
  const infoHash=labeledExtract(SUITE,ZERO,'info_hash',info);
  const ks=Buffer.concat([Buffer.from([0]),pskIdHash,infoHash]);
  const secret=labeledExtract(SUITE,sharedSecret,'secret',ZERO);
  return {key:labeledExpand(SUITE,secret,'key',ks,32),nonce:labeledExpand(SUITE,secret,'base_nonce',ks,12)};
}
function checkData(plaintext,aad,info) {
  if (!Buffer.isBuffer(plaintext) || plaintext.length!==32 ||
      !Buffer.isBuffer(aad) || aad.length>1024 ||
      !Buffer.isBuffer(info) || info.length>1024) throw new Error('invalid_hpke_input');
}
function seal(publicKey,plaintext,{info,aad}) {
  checkData(plaintext,aad,info);
  const recipient=importPublic(publicKey);
  const eph=keyPair();
  const dh=diffieHellman({privateKey:eph.privateKey,publicKey:recipient});
  if (dh.equals(Buffer.alloc(32))) throw new Error('invalid_dh');
  const shared=extractAndExpand(dh,Buffer.concat([eph.publicKey,publicKey]));
  const {key,nonce}=context(shared,info);
  const cipher=createCipheriv('aes-256-gcm',key,nonce);
  cipher.setAAD(aad);
  const ct=Buffer.concat([cipher.update(plaintext),cipher.final(),cipher.getAuthTag()]);
  key.fill(0);
  return {enc:eph.publicKey,ciphertext:ct};
}
function open(privateKey,enc,ciphertext,{info,aad}) {
  if (!privateKey || !Buffer.isBuffer(enc) || enc.length!==32 ||
      !Buffer.isBuffer(ciphertext) || ciphertext.length<17 || ciphertext.length>4112) throw new Error('invalid_hpke_input');
  checkData(Buffer.alloc(32),aad,info);
  const recipientPublic=rawPublic(createPublicKey(privateKey));
  const dh=diffieHellman({privateKey,publicKey:importPublic(enc)});
  if (dh.equals(Buffer.alloc(32))) throw new Error('invalid_dh');
  const shared=extractAndExpand(dh,Buffer.concat([enc,recipientPublic]));
  const {key,nonce}=context(shared,info);
  try {
    const decipher=createDecipheriv('aes-256-gcm',key,nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(ciphertext.subarray(-16));
    return Buffer.concat([decipher.update(ciphertext.subarray(0,-16)),decipher.final()]);
  } catch { throw new Error('hpke_open_failed'); }
  finally { key.fill(0); }
}
module.exports={keyPair,seal,open};
