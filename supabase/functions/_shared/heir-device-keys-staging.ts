/**
 * NON-DEPLOYED browser staging: per-account X25519 device key enrollment.
 * This module has NO network access and never serializes a private key.
 * The injected server MUST verify the current Supabase JWT independently;
 * the userId here is only a local storage namespace, not authorization.
 * Origin compromise/XSS can still use nonextractable CryptoKeys. A secure
 * multi-device recovery/rotation protocol is NOT yet implemented.
 */
import { respondToHeirKeyChallenge } from './heir-key-proof-staging.ts';
import { HEIR_HPKE_SUITE, openHeirDek, type EnvelopeContext } from './heir-hpke-envelope.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX32 = /^[a-f0-9]{64}$/;
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
const toHex = (bytes: Uint8Array) => Array.from(bytes, v => v.toString(16).padStart(2, '0')).join('');

export interface DeviceHeirKey {
  userId: string;
  keyId: string;
  publicKeyHex: string;
  privateKey: CryptoKey;
  status: 'pending' | 'verified';
}
export interface HeirKeyStore {
  load(userId: string, keyId: string): Promise<DeviceHeirKey | null>;
  save(value: DeviceHeirKey): Promise<void>;
}
export interface HeirEnrollmentServer {
  // Must be an authenticated and authorized HTTPS endpoint, not a browser mock
  // in production. No body-supplied userId may authorize registration.
  begin(publicKeyHex: string): Promise<unknown>;
  confirm(input: { keyId: string; challengeId: string; proofHex: string }): Promise<{ ok: boolean }>;
}
type Challenge = {
  ok: true;
  keyId: string;
  challengeId: string;
  ephemeralPublicKeyHex: string;
  saltHex: string;
  suite: string;
};
function validChallenge(v: unknown): v is Challenge {
  if (!v || typeof v !== 'object') return false;
  const x = v as Record<string, unknown>;
  return x.ok === true && isUuid(x.keyId) && isUuid(x.challengeId) &&
    typeof x.ephemeralPublicKeyHex === 'string' && HEX32.test(x.ephemeralPublicKeyHex) &&
    typeof x.saltHex === 'string' && HEX32.test(x.saltHex) && x.suite === HEIR_HPKE_SUITE;
}
function validLocalKey(value: DeviceHeirKey | null, uid: string, keyId: string): value is DeviceHeirKey {
  return !!value && value.userId === uid && value.keyId === keyId &&
    HEX32.test(value.publicKeyHex) && value.privateKey?.algorithm?.name === 'X25519' &&
    value.privateKey.type === 'private' && value.privateKey.extractable === false &&
    value.privateKey.usages.includes('deriveBits');
}

/** The key is created nonextractable and stored before the remote confirmation.
 * If confirmation is ambiguous, status remains pending and release stays denied.
 * Do not automatically re-submit a consumed challenge or lose its private key.
 */
export async function enrollHeirDeviceKey(userId: string, store: HeirKeyStore,
  server: HeirEnrollmentServer): Promise<{ ok: true; keyId: string; publicKeyHex: string } | { ok: false }> {
  if (!isUuid(userId)) return { ok: false };
  try {
    const pair = await crypto.subtle.generateKey({ name: 'X25519' }, false, ['deriveBits']) as CryptoKeyPair;
    if (pair.privateKey.extractable || pair.privateKey.type !== 'private') return { ok: false };
    const publicKeyHex = toHex(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
    const challenge = await server.begin(publicKeyHex);
    if (!validChallenge(challenge)) return { ok: false };
    const record: DeviceHeirKey = { userId, keyId: challenge.keyId, publicKeyHex,
      privateKey: pair.privateKey, status: 'pending' };
    // An IndexedDB failure is fatal: we must not confirm a key with no durable private key.
    await store.save(record);
    const proofHex = await respondToHeirKeyChallenge(pair.privateKey, challenge, userId, publicKeyHex);
    const confirmed = await server.confirm({ keyId: challenge.keyId, challengeId: challenge.challengeId, proofHex });
    if (confirmed?.ok !== true) return { ok: false };
    await store.save({ ...record, status: 'verified' });
    return { ok: true, keyId: challenge.keyId, publicKeyHex };
  } catch {
    return { ok: false }; // No plaintext key, network trace, or error details exposed.
  }
}

/** Access to an already-released envelope requires verified server authorization
 * AND a matching device key. This function checks only the latter; it does NOT
 * decide whether the heir may access a vault or whether the grace period ended.
 */
export async function openHeirEnvelopeOnDevice(
  userId: string, keyId: string, store: HeirKeyStore,
  envelope: { encapsulatedKeyHex: string; wrappedDekHex: string }, context: EnvelopeContext,
): Promise<Uint8Array> {
  if (!isUuid(userId) || !isUuid(keyId) || context.heirUserId !== userId || context.keyId !== keyId) {
    throw new Error('unavailable');
  }
  const record = await store.load(userId, keyId);
  if (!validLocalKey(record, userId, keyId) || record.status !== 'verified') throw new Error('unavailable');
  return openHeirDek(envelope, record.privateKey, record.publicKeyHex, context);
}

/** IndexedDB stores CryptoKey using structured clone, never raw private bytes.
 * A previously stored key cannot be replaced or downgraded: the only accepted
 * mutation is pending -> verified for the same (userId, keyId, publicKey).
 * Same-origin script compromise remains out of scope. Missing IndexedDB fails closed.
 */
export function createIndexedDbHeirKeyStore(factory: IDBFactory,
  databaseName = 'helferlein-heir-keys-staging-v1'): HeirKeyStore {
  if (!factory || !/^helferlein-heir-keys-[a-z0-9-]{1,64}$/.test(databaseName)) {
    throw new Error('unavailable');
  }
  function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = factory.open(databaseName, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('keys')) req.result.createObjectStore('keys', { keyPath: ['userId', 'keyId'] });
      };
      req.onerror = () => reject(new Error('unavailable'));
      req.onblocked = () => reject(new Error('unavailable'));
      req.onsuccess = () => resolve(req.result);
    });
  }
  async function write(value: DeviceHeirKey): Promise<void> {
    const db = await open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('keys', 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(new Error('unavailable'));
        const store = tx.objectStore('keys');
        // Read and conditional write share ONE readwrite transaction, so another
        // tab cannot interleave a replacement between checking and writing.
        const previous = store.get([value.userId, value.keyId]);
        previous.onerror = () => tx.abort();
        previous.onsuccess = () => {
          const existing = previous.result as DeviceHeirKey | undefined;
          const firstWrite = !existing && value.status === 'pending';
          const confirmation = !!existing && existing.status === 'pending' &&
            value.status === 'verified' && existing.publicKeyHex === value.publicKeyHex;
          if (!firstWrite && !confirmation) { tx.abort(); return; }
          try { store.put(value); } catch { tx.abort(); }
        };
      });
    } finally { db.close(); }
  }
  async function read(userId: string, keyId: string): Promise<DeviceHeirKey | null> {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('keys', 'readonly');
        let record: DeviceHeirKey | null = null;
        tx.onabort = tx.onerror = () => reject(new Error('unavailable'));
        tx.oncomplete = () => resolve(record);
        const request = tx.objectStore('keys').get([userId, keyId]);
        request.onsuccess = () => { record = (request.result as DeviceHeirKey | undefined) ?? null; };
      });
    } finally { db.close(); }
  }
  // X25519 multiplication by the standard basepoint re-derives the public
  // key without ever exporting the private key. This rejects corrupted or
  // substituted local records before they reach IndexedDB.
  async function hasMatchingPrivateKey(value: DeviceHeirKey): Promise<boolean> {
    try {
      const basepoint = new Uint8Array(32);
      basepoint[0] = 9;
      const base = await crypto.subtle.importKey('raw', basepoint, 'X25519', false, []);
      const derived = new Uint8Array(await crypto.subtle.deriveBits(
        { name: 'X25519', public: base }, value.privateKey, 256));
      return toHex(derived) === value.publicKeyHex;
    } catch { return false; }
  }
  return {
    async save(value) {
      if (!isUuid(value.userId) || !isUuid(value.keyId) ||
          !validLocalKey(value, value.userId, value.keyId) ||
          !['pending', 'verified'].includes(value.status) ||
          !(await hasMatchingPrivateKey(value))) throw new Error('unavailable');
      await write(value);
    },
    async load(userId, keyId) {
      if (!isUuid(userId) || !isUuid(keyId)) return null;
      const value = await read(userId, keyId);
      return validLocalKey(value, userId, keyId) && await hasMatchingPrivateKey(value)
        ? value : null;
    },
  };
}
