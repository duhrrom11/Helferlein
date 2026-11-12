/** NON-DEPLOYED. No exposed endpoint. Actual SQL connection requires a reviewed private role.
 * Proof binds a verified Supabase user to possession of an X25519 private key via
 * one-use ECDH/HKDF challenge. The server never receives the heir's private key.
 */
import type { SqlBackend, VerifyUser } from './heir-staging-backend.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX32 = /^[0-9a-f]{64}$/;
const SUITE = 'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM';
const encoder = new TextEncoder();
const hex = (value: Uint8Array) => Array.from(value, b => b.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) => Uint8Array.from(value.match(/../g) ?? [], x => parseInt(x, 16));
const denied = Object.freeze({ ok: false as const });
function fail(): never { throw new Error('denied'); }
async function hash(data: Uint8Array) { return new Uint8Array(await crypto.subtle.digest('SHA-256', data)); }
async function proofFor(shared: ArrayBuffer, salt: Uint8Array, userId: string, keyId: string, publicHex: string) {
  const hkdfKey = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits']);
  const info = encoder.encode(`Helferlein/heir-key-proof/v1/${userId}/${keyId}/${publicHex}`);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, hkdfKey, 256));
}
export function createHeirKeyProofStaging(db: SqlBackend, verifyUser: VerifyUser) {
  async function actor(header: string | null) {
    try { const user = await verifyUser(header); return user && UUID.test(user) ? user : null; }
    catch { return null; }
  }
  return {
    async beginEnrollment(auth: string | null, publicKeyHex: string) {
      const uid = await actor(auth);
      if (!uid || typeof publicKeyHex !== 'string' || !HEX32.test(publicKeyHex)) return denied;
      try {
        const publicKey = await crypto.subtle.importKey('raw', unhex(publicKeyHex), 'X25519', false, []);
        const ephemeral = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']) as CryptoKeyPair;
        const ephemeralPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));
        const shared = await crypto.subtle.deriveBits({ name: 'X25519', public: publicKey }, ephemeral.privateKey, 256);
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const keyId = crypto.randomUUID();
        const challengeId = crypto.randomUUID();
        const proof = await proofFor(shared, salt, uid, keyId, publicKeyHex);
        const expectedHash = hex(await hash(proof));
        const fingerprint = hex(await hash(unhex(publicKeyHex)));
        const result = await db.transaction(async tx => {
          // Serialize enrollment per verified user, including across server instances.
          // Fixed namespace prevents accidental overlap with unrelated advisory locks.
          await tx.one(`SELECT pg_advisory_xact_lock(hashtextextended($1::text, 41027)) AS locked`, [uid]);
          const pending = await tx.one<{ n: number }>(
            `SELECT count(*)::int AS n FROM heir_private.heir_key_proofs
             WHERE heir_user_id=$1 AND consumed_at IS NULL AND expires_at>clock_timestamp()`, [uid]);
          if (!pending || !Number.isInteger(pending.n) || pending.n >= 3) fail();
          // Unique (heir_user_id,fingerprint) disallows silent key reuse/re-enrollment.
          const inserted = await tx.exec(`INSERT INTO heir_private.heir_public_keys
              (key_id,heir_user_id,suite,public_key,fingerprint)
              VALUES ($1,$2,$3,decode($4,'hex'),decode($5,'hex'))`,
            [keyId, uid, SUITE, publicKeyHex, fingerprint]);
          if (inserted !== 1) fail();
          const challenge = await tx.exec(`INSERT INTO heir_private.heir_key_proofs
              (challenge_id,key_id,heir_user_id,expected_hash,expires_at)
              VALUES ($1,$2,$3,decode($4,'hex'),clock_timestamp()+interval '5 minutes')`,
            [challengeId, keyId, uid, expectedHash]);
          if (challenge !== 1) fail();
          return { ok: true as const, keyId, challengeId,
            ephemeralPublicKeyHex: hex(ephemeralPublic), saltHex: hex(salt), suite: SUITE };
        });
        return result;
      } catch { return denied; }
    },
    async confirmEnrollment(auth: string | null, input: { keyId: string; challengeId: string; proofHex: string }) {
      const uid = await actor(auth);
      if (!uid || !UUID.test(input?.keyId ?? '') || !UUID.test(input?.challengeId ?? '') ||
          !HEX32.test(input?.proofHex ?? '')) return denied;
      const proofHash = hex(await hash(unhex(input.proofHex)));
      try {
        return await db.transaction(async tx => {
          // Lock the heir's key, then the challenge. No caller-provided user identity.
          const key = await tx.one<{ verified_at: string | null; revoked_at: string | null }>(
            `SELECT verified_at,revoked_at FROM heir_private.heir_public_keys
             WHERE key_id=$1 AND heir_user_id=$2 FOR UPDATE`, [input.keyId, uid]);
          if (!key || key.verified_at !== null || key.revoked_at !== null) fail();
          const challenge = await tx.one<{ valid: boolean; expected_match: boolean }>(
            `SELECT (consumed_at IS NULL AND expires_at>clock_timestamp()) AS valid,
                    (expected_hash=decode($4,'hex')) AS expected_match
             FROM heir_private.heir_key_proofs
             WHERE challenge_id=$1 AND key_id=$2 AND heir_user_id=$3 FOR UPDATE`,
            [input.challengeId, input.keyId, uid, proofHash]);
          if (!challenge || challenge.valid !== true) fail();
          if (challenge.expected_match !== true) {
            // Consume even a failed attempt; fail closed without a reusable oracle.
            const consumed = await tx.exec(`UPDATE heir_private.heir_key_proofs SET consumed_at=clock_timestamp()
                WHERE challenge_id=$1 AND key_id=$2 AND heir_user_id=$3 AND consumed_at IS NULL`,
              [input.challengeId, input.keyId, uid]);
            if (consumed !== 1) fail();
            return denied;
          }
          const consumed = await tx.exec(`UPDATE heir_private.heir_key_proofs SET consumed_at=clock_timestamp()
              WHERE challenge_id=$1 AND key_id=$2 AND heir_user_id=$3 AND consumed_at IS NULL AND expires_at>clock_timestamp()`,
            [input.challengeId, input.keyId, uid]);
          if (consumed !== 1) fail();
          const changed = await tx.exec(`UPDATE heir_private.heir_public_keys SET verified_at=clock_timestamp()
              WHERE key_id=$1 AND heir_user_id=$2 AND verified_at IS NULL AND revoked_at IS NULL`,
            [input.keyId, uid]);
          if (changed !== 1) fail();
          return { ok: true as const };
        });
      } catch { return denied; }
    },
  };
}
/** Client-side response: uses the locally held private X25519 key, not JWT identity from JSON. */
export async function respondToHeirKeyChallenge(privateKey: CryptoKey, challenge: {
  keyId: string; ephemeralPublicKeyHex: string; saltHex: string;
}, verifiedUserId: string, ownPublicKeyHex: string): Promise<string> {
  if (!UUID.test(challenge.keyId) || !UUID.test(verifiedUserId) ||
      !HEX32.test(challenge.ephemeralPublicKeyHex) || !HEX32.test(challenge.saltHex) ||
      !HEX32.test(ownPublicKeyHex) || privateKey.algorithm.name !== 'X25519') fail();
  const serverPublicKey = await crypto.subtle.importKey('raw', unhex(challenge.ephemeralPublicKeyHex), 'X25519', false, []);
  const shared = await crypto.subtle.deriveBits({ name: 'X25519', public: serverPublicKey }, privateKey, 256);
  return hex(await proofFor(shared, unhex(challenge.saltHex), verifiedUserId, challenge.keyId, ownPublicKeyHex));
}
