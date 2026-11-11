/**
 * NON-DEPLOYED owner-device staging. Owner approves independently confirmed
 * recipient fingerprint before a locally held DEK is wrapped. A server-fetched
 * public key alone is not identity assurance: verify fingerprint out of band.
 * No API or DB call sends DEK plaintext or owner recovery secrets.
 */
import { HEIR_HPKE_SUITE, sealHeirDek, type EnvelopeContext } from './heir-hpke-envelope.ts';

const HEX32 = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hex = (v: Uint8Array) => Array.from(v, x => x.toString(16).padStart(2, '0')).join('');

export interface AttestedHeirKey {
  heirUserId: string;
  keyId: string;
  publicKeyHex: string;
  fingerprintHex: string;
  suite: string;
  verified: boolean;
  revoked: boolean;
  assignmentVersion: number;
  assignmentActive: boolean;
}
export interface OwnerEnvelopeDirectory {
  // Server MUST verify owner's Supabase JWT and return latest verified key,
  // active assignment/version, current owner/vault scope at request time.
  readVerifiedHeirKey(context: { ownerUserId: string; vaultId: string; heirUserId: string }): Promise<AttestedHeirKey | null>;
  // Server-side putEnvelope MUST recheck those facts atomically before storing.
  putEnvelope(input: {
    context: EnvelopeContext;
    publicKeyFingerprintHex: string;
    suite: string;
    encapsulatedKeyHex: string;
    wrappedDekHex: string;
  }): Promise<{ ok: boolean }>;
}

/** Explicit owner fingerprint confirmation, not server-provided confirmation.
 * This is a STAGING workflow; UI must obtain the fingerprint independently
 * from the heir before making this call. Server responses remain untrusted for
 * *identity* until that out-of-band check passes.
 */
export async function stageOwnerHeirEnvelope(
  dek: Uint8Array, context: { ownerUserId: string; vaultId: string; heirUserId: string },
  ownerConfirmedFingerprintHex: string, directory: OwnerEnvelopeDirectory,
): Promise<{ ok: true; keyId: string; assignmentVersion: number } | { ok: false }> {
  if (!(dek instanceof Uint8Array) || dek.byteLength !== 32 ||
      !UUID.test(context?.ownerUserId ?? '') || !UUID.test(context?.heirUserId ?? '') ||
      context.ownerUserId === context.heirUserId ||
      !/^v_[A-Za-z0-9_-]{8,80}$/.test(context?.vaultId ?? '') ||
      !HEX32.test(ownerConfirmedFingerprintHex)) return { ok: false };
  try {
    const record = await directory.readVerifiedHeirKey(context);
    if (!record || record.heirUserId !== context.heirUserId || !UUID.test(record.keyId) ||
        !HEX32.test(record.publicKeyHex) || !HEX32.test(record.fingerprintHex) ||
        !record.verified || record.revoked || !record.assignmentActive ||
        !Number.isSafeInteger(record.assignmentVersion) || record.assignmentVersion < 1 ||
        record.suite !== HEIR_HPKE_SUITE) return { ok: false };
    const digest = hex(new Uint8Array(await crypto.subtle.digest('SHA-256',
      Uint8Array.from(record.publicKeyHex.match(/../g)!, byte => parseInt(byte, 16)))));
    if (digest !== record.fingerprintHex || digest !== ownerConfirmedFingerprintHex) return { ok: false };
    const envelopeContext: EnvelopeContext = { ...context, keyId: record.keyId,
      assignmentVersion: record.assignmentVersion };
    const envelope = await sealHeirDek(dek, record.publicKeyHex, envelopeContext);
    const outcome = await directory.putEnvelope({
      context: envelopeContext,
      publicKeyFingerprintHex: digest,
      ...envelope,
    });
    return outcome?.ok === true
      ? { ok: true, keyId: record.keyId, assignmentVersion: record.assignmentVersion }
      : { ok: false };
  } catch { return { ok: false }; }
}
