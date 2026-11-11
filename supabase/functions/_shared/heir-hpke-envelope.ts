/** NON-DEPLOYED, CLIENT-SIDE ONLY: RFC 9180 HPKE base mode, DHKEM(X25519,HKDF-SHA256),
 * HKDF-SHA256 and AES-256-GCM. Independent test-vector review is REQUIRED before use.
 * This module MUST never be imported by a privileged server API holding a raw DEK.
 * No implicit password, URL or account recovery mechanism.
 */
export const HEIR_HPKE_SUITE = 'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM';
const KEM = new Uint8Array([0, 0x20]);
const KDF = new Uint8Array([0, 1]);
const AEAD = new Uint8Array([0, 2]);
const encoder = new TextEncoder();
const ascii = (x: string) => encoder.encode(x);
const concat = (...v: Uint8Array[]) => {
  const out = new Uint8Array(v.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  for (const a of v) { out.set(a, offset); offset += a.length; }
  return out;
};
const kemSuite = concat(ascii('KEM'), KEM);
const hpkeSuite = concat(ascii('HPKE'), KEM, KDF, AEAD);
const u16 = (x: number) => new Uint8Array([x >> 8, x & 255]);
const hex = (v: Uint8Array) => Array.from(v, b => b.toString(16).padStart(2, '0')).join('');
const unhex = (v: string) => Uint8Array.from(v.match(/../g) ?? [], x => parseInt(x, 16));
const HEX = /^[0-9a-f]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VAULT = /^v_[A-Za-z0-9_-]{8,80}$/;
async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
async function extract(salt: Uint8Array, input: Uint8Array) {
  return hmac(salt.length ? salt : new Uint8Array(32), input);
}
async function expand(prk: Uint8Array, info: Uint8Array, length: number) {
  if (length < 1 || length > 255 * 32) throw new Error('invalid_length');
  const result = new Uint8Array(length);
  let prev = new Uint8Array(0);
  let pos = 0;
  for (let counter = 1; pos < length; counter++) {
    prev = await hmac(prk, concat(prev, info, new Uint8Array([counter])));
    const chunk = prev.slice(0, Math.min(32, length - pos));
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}
const labeledExtract = (salt: Uint8Array, suite: Uint8Array, label: string, ikm: Uint8Array) =>
  extract(salt, concat(ascii('HPKE-v1'), suite, ascii(label), ikm));
const labeledExpand = (prk: Uint8Array, suite: Uint8Array, label: string, info: Uint8Array, length: number) =>
  expand(prk, concat(u16(length), ascii('HPKE-v1'), suite, ascii(label), info), length);

export type EnvelopeContext = {
  ownerUserId: string; heirUserId: string; vaultId: string;
  keyId: string; assignmentVersion: number;
};
function aad(context: EnvelopeContext) {
  if (!UUID.test(context.ownerUserId) || !UUID.test(context.heirUserId) ||
      !UUID.test(context.keyId) || !VAULT.test(context.vaultId) ||
      !Number.isSafeInteger(context.assignmentVersion) || context.assignmentVersion < 1) {
    throw new Error('invalid_envelope_context');
  }
  return ascii(JSON.stringify(['Helferlein/heir-envelope/v1', context.ownerUserId.toLowerCase(),
    context.heirUserId.toLowerCase(), context.vaultId, context.keyId.toLowerCase(), context.assignmentVersion]));
}
async function deriveKeyAndNonce(sharedSecret: Uint8Array) {
  const pskIdHash = await labeledExtract(new Uint8Array(), hpkeSuite, 'psk_id_hash', new Uint8Array());
  const infoHash = await labeledExtract(new Uint8Array(), hpkeSuite, 'info_hash', ascii('Helferlein/heir-envelope/v1'));
  const scheduleContext = concat(new Uint8Array([0]), pskIdHash, infoHash); // base mode
  const secret = await labeledExtract(sharedSecret, hpkeSuite, 'secret', new Uint8Array());
  const key = await labeledExpand(secret, hpkeSuite, 'key', scheduleContext, 32);
  const nonce = await labeledExpand(secret, hpkeSuite, 'base_nonce', scheduleContext, 12); // seq 0
  return { key, nonce };
}
async function kemShared(dh: ArrayBuffer, enc: Uint8Array, receiverPublic: Uint8Array) {
  const eaePrk = await labeledExtract(new Uint8Array(), kemSuite, 'eae_prk', new Uint8Array(dh));
  return labeledExpand(eaePrk, kemSuite, 'shared_secret', concat(enc, receiverPublic), 32);
}
export async function sealHeirDek(dek: Uint8Array, recipientPublicHex: string, context: EnvelopeContext) {
  if (!(dek instanceof Uint8Array) || dek.byteLength !== 32 ||
      !/^[0-9a-f]{64}$/.test(recipientPublicHex)) throw new Error('invalid_key');
  const associated = aad(context);
  const pk = unhex(recipientPublicHex);
  const recipientKey = await crypto.subtle.importKey('raw', pk, 'X25519', false, []);
  const ephemeral = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']) as CryptoKeyPair;
  const enc = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));
  const dh = await crypto.subtle.deriveBits({ name: 'X25519', public: recipientKey }, ephemeral.privateKey, 256);
  const secret = await kemShared(dh, enc, pk);
  const { key, nonce } = await deriveKeyAndNonce(secret);
  const aeadKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: associated, tagLength: 128 }, aeadKey, dek));
  return { suite: HEIR_HPKE_SUITE, encapsulatedKeyHex: hex(enc), wrappedDekHex: hex(ciphertext) };
}
/** Only run on heir-owned device with nonextractable private key, after server authorization. */
export async function openHeirDek(envelope: { encapsulatedKeyHex: string; wrappedDekHex: string },
  privateKey: CryptoKey, ownPublicHex: string, context: EnvelopeContext) {
  if (!/^[0-9a-f]{64}$/.test(envelope.encapsulatedKeyHex) ||
      !/^[0-9a-f]{96}$/.test(envelope.wrappedDekHex) ||
      !/^[0-9a-f]{64}$/.test(ownPublicHex) || privateKey.algorithm.name !== 'X25519') {
    throw new Error('invalid_envelope');
  }
  const associated = aad(context);
  const enc = unhex(envelope.encapsulatedKeyHex);
  const senderPublic = await crypto.subtle.importKey('raw', enc, 'X25519', false, []);
  const dh = await crypto.subtle.deriveBits({ name: 'X25519', public: senderPublic }, privateKey, 256);
  const secret = await kemShared(dh, enc, unhex(ownPublicHex));
  const { key, nonce } = await deriveKeyAndNonce(secret);
  const aeadKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: associated, tagLength: 128 }, aeadKey, unhex(envelope.wrappedDekHex)));
}