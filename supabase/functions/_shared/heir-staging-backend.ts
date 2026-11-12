/**
 * NOT DEPLOYED. Server-only heir invitation/revocation/envelope transaction service.
 * The SqlBackend MUST use a single restricted server-side PG transaction for each
 * callback, including rollback on thrown errors. Never expose the SQL connection,
 * transaction function or caller-provided actor identity to browsers.
 * This module deliberately provides no Edge Function endpoint or release/fetch API.
 */
export type QueryRow = Record<string, unknown>;
export interface SqlTx {
  one<T extends QueryRow = QueryRow>(sql: string, values: readonly unknown[]): Promise<T | null>;
  exec(sql: string, values: readonly unknown[]): Promise<number>; // rows affected
}
export interface SqlBackend {
  transaction<T>(work: (tx: SqlTx) => Promise<T>): Promise<T>;
}
export interface VerifyUser {
  (authorizationHeader: string | null): Promise<string | null>; // MUST call Supabase auth.getUser
}
export type Denied = { ok: false };
export type Success = { ok: true };
export type Created = { ok: true; token: string };
export type Result<T extends Success = Success> = T | Denied;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VAULT = /^v_[A-Za-z0-9_-]{8,80}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const SHA256HEX = /^[a-f0-9]{64}$/;
const HEX = /^[a-f0-9]+$/;
const CIPHER_SUITE = 'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM';
const no: Denied = Object.freeze({ ok: false });
/** PostgreSQL int8 values are decoded as strings by pg to avoid precision loss. */
function positiveSafeVersion(value: unknown): number | null {
  if (typeof value === 'string' && !/^[1-9][0-9]*$/.test(value)) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
function stop(): never { throw new Error('denied'); } // handled uniformly, not exposed
const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const isVault = (value: unknown): value is string => typeof value === 'string' && VAULT.test(value);
function isHex(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max && value.length % 2 === 0 && HEX.test(value);
}
function hex(input: Uint8Array): string {
  return Array.from(input, x => x.toString(16).padStart(2, '0')).join('');
}
async function sha256(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)));
}
function randomToken(): { token: string; bytes: Uint8Array } {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  // 32 random bytes -> canonical unpadded 43-character base64url token.
  const base64 = btoa(String.fromCharCode(...bytes));
  return { token: base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''), bytes };
}
function tokenBytes(token: string): Uint8Array | null {
  if (!TOKEN.test(token)) return null;
  try {
    const raw = atob(token.replace(/-/g, '+').replace(/_/g, '/') + '=');
    if (raw.length !== 32) return null;
    const bytes = Uint8Array.from(raw, ch => ch.charCodeAt(0));
    if (randomFreeBase64(bytes) !== token) return null; // reject noncanonical form
    return bytes;
  } catch { return null; }
}
function randomFreeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function createHeirStagingBackend(db: SqlBackend, verifyUser: VerifyUser) {
  async function actor(authorizationHeader: string | null): Promise<string | null> {
    try {
      const verified = await verifyUser(authorizationHeader);
      return isUuid(verified) ? verified : null;
    } catch { return null; }
  }
  // All operations fail closed. No token/hash/public key returned on failures.
  async function safe<T extends Success>(work: () => Promise<T>): Promise<Result<T>> {
    try { return await work(); } catch { return no; }
  }
  const lockOwner = (tx: SqlTx, ownerId: string) => tx.one<{ vault_id: string }>(
    'SELECT vault_id FROM public.vault_cloud_snapshots WHERE owner_user_id = $1 FOR UPDATE', [ownerId]);

  return {
    async createInvitation(auth: string | null, input: {
      vaultId: string; intendedUserId: string; ttlSeconds: number;
    }): Promise<Result<Created>> {
      const uid = await actor(auth);
      if (!uid || !isVault(input?.vaultId) || !isUuid(input?.intendedUserId) ||
          input.intendedUserId === uid || !Number.isInteger(input?.ttlSeconds) ||
          input.ttlSeconds < 900 || input.ttlSeconds > 604800) return no;
      const { token, bytes } = randomToken();
      const digest = await sha256(bytes);
      return safe(async () => db.transaction(async tx => {
        const owner = await lockOwner(tx, uid);
        if (!owner || owner.vault_id !== input.vaultId) stop();
        const pending = await tx.one<{ n: number }>(
          `SELECT count(*)::int AS n FROM heir_private.heir_invitations
           WHERE owner_user_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL
             AND expires_at>clock_timestamp()`, [uid]);
        if (!pending || !Number.isInteger(pending.n) || pending.n >= 20) stop();
        const count = await tx.exec(
          `INSERT INTO heir_private.heir_invitations
           (owner_user_id, vault_id, intended_user_id, token_hash, expires_at)
           VALUES ($1,$2,$3,decode($4,'hex'),clock_timestamp()+($5::int * interval '1 second'))`,
          [uid, input.vaultId, input.intendedUserId, digest, input.ttlSeconds]);
        if (count !== 1) stop();
        return { ok: true as const, token };
      }));
    },

    async redeemInvitation(auth: string | null, token: string): Promise<Result> {
      const uid = await actor(auth);
      const raw = typeof token === 'string' ? tokenBytes(token) : null;
      if (!uid || !raw) return no;
      const digest = await sha256(raw);
      return safe(async () => db.transaction(async tx => {
        // Initial read only discovers the lock key; it grants NO rights.
        const hint = await tx.one<{ owner_user_id: string }>(
          `SELECT owner_user_id FROM heir_private.heir_invitations WHERE token_hash=decode($1,'hex')`, [digest]);
        if (!hint || !isUuid(hint.owner_user_id)) stop();
        const owner = await lockOwner(tx, hint.owner_user_id);
        if (!owner) stop();
        const invite = await tx.one<{
          invitation_id: string; vault_id: string; intended_user_id: string; eligible: boolean;
        }>(
          `SELECT invitation_id,vault_id,intended_user_id,
                  (accepted_at IS NULL AND revoked_at IS NULL AND expires_at>clock_timestamp()) AS eligible
           FROM heir_private.heir_invitations
           WHERE owner_user_id=$1 AND token_hash=decode($2,'hex') FOR UPDATE`,
          [hint.owner_user_id, digest]);
        if (!invite || invite.eligible !== true || invite.vault_id !== owner.vault_id ||
            invite.intended_user_id !== uid) stop();
        const accepted = await tx.exec(
          `UPDATE heir_private.heir_invitations SET accepted_at=clock_timestamp()
           WHERE invitation_id=$1 AND owner_user_id=$2 AND intended_user_id=$3
             AND token_hash=decode($4,'hex') AND accepted_at IS NULL
             AND revoked_at IS NULL AND expires_at>clock_timestamp()`,
          [invite.invitation_id, hint.owner_user_id, uid, digest]);
        if (accepted !== 1) stop(); // transaction rollback required
        const assignment = await tx.exec(
          `INSERT INTO heir_private.heir_assignments
           (owner_user_id,heir_user_id,invitation_id) VALUES ($1,$2,$3)
           ON CONFLICT DO NOTHING`, [hint.owner_user_id, uid, invite.invitation_id]);
        if (assignment !== 1) stop(); // rolls back acceptance
        return { ok: true as const };
      }));
    },


    /** Owner-only metadata view. Never exposes bearer tokens, token hashes or DEKs.
     * The owner snapshot is locked first, matching all mutation lock ordering.
     * All status decisions are evaluated at PostgreSQL server time.
     */
    async listInvitations(auth: string | null, input: { vaultId: string }): Promise<Result<{
      ok: true;
      invitations: Array<{
        invitationId: string; intendedUserId: string;
        status: 'pending' | 'accepted' | 'expired' | 'revoked';
        createdAt: string; expiresAt: string;
      }>;
      hasMore: boolean;
    }>> {
      const uid = await actor(auth);
      if (!uid || !isVault(input?.vaultId)) return no;
      return safe(async () => db.transaction(async tx => {
        const owner = await lockOwner(tx, uid);
        if (!owner || owner.vault_id !== input.vaultId) stop();
        // 51 items are selected to detect pagination needs without unbounded reads.
        // Future pagination needs an audited, owner-scoped keyset cursor.
        const row = await tx.one<{ invitations: unknown }>(
          `SELECT COALESCE(jsonb_agg(
             jsonb_build_object(
               'invitationId',invitation_id, 'intendedUserId',intended_user_id,
               'status',status,'createdAt',created_at,'expiresAt',expires_at)
             ORDER BY created_at DESC, invitation_id DESC), '[]'::jsonb) AS invitations
           FROM (
             SELECT i.invitation_id, i.intended_user_id, i.created_at, i.expires_at,
               CASE
                 WHEN i.revoked_at IS NOT NULL OR a.status = 'revoked' THEN 'revoked'
                 WHEN i.accepted_at IS NOT NULL THEN 'accepted'
                 WHEN i.expires_at <= clock_timestamp() THEN 'expired'
                 ELSE 'pending'
               END AS status
             FROM heir_private.heir_invitations i
             LEFT JOIN heir_private.heir_assignments a
               ON a.invitation_id = i.invitation_id AND a.owner_user_id = i.owner_user_id
             WHERE i.owner_user_id = $1 AND i.vault_id = $2
             ORDER BY i.created_at DESC, i.invitation_id DESC
             LIMIT 51
           ) visible`, [uid, input.vaultId]);
        if (!row || !Array.isArray(row.invitations) || row.invitations.length > 51) stop();
        const invitations = row.invitations.slice(0, 50).map(item => {
          if (!item || typeof item !== 'object') stop();
          const it = item as Record<string, unknown>;
          if (!isUuid(it.invitationId) || !isUuid(it.intendedUserId) ||
              !['pending','accepted','expired','revoked'].includes(String(it.status)) ||
              typeof it.createdAt !== 'string' || typeof it.expiresAt !== 'string') stop();
          const created = new Date(it.createdAt);
          const expiry = new Date(it.expiresAt);
          if (!Number.isFinite(created.getTime()) || !Number.isFinite(expiry.getTime())) stop();
          return {
            invitationId: it.invitationId,
            intendedUserId: it.intendedUserId,
            status: it.status as 'pending' | 'accepted' | 'expired' | 'revoked',
            createdAt: created.toISOString(),
            expiresAt: expiry.toISOString(),
          };
        });
        return { ok: true as const, invitations, hasMore: row.invitations.length === 51 };
      }));
    },

    async revokeInvitation(auth: string | null, input: {
      vaultId: string; invitationId: string;
    }): Promise<Result> {
      const uid = await actor(auth);
      if (!uid || !isVault(input?.vaultId) || !isUuid(input?.invitationId)) return no;
      return safe(async () => db.transaction(async tx => {
        const owner = await lockOwner(tx, uid);
        if (!owner || owner.vault_id !== input.vaultId) stop();
        const invitation = await tx.one<{
          accepted_at: string | null; revoked_at: string | null; intended_user_id: string;
        }>(
          `SELECT accepted_at,revoked_at,intended_user_id
           FROM heir_private.heir_invitations WHERE invitation_id=$1 AND owner_user_id=$2 FOR UPDATE`,
          [input.invitationId, uid]);
        if (!invitation) stop();
        if (invitation.revoked_at !== null) return { ok: true as const }; // idempotent
        if (invitation.accepted_at === null) {
          const changed = await tx.exec(
            `UPDATE heir_private.heir_invitations SET revoked_at=clock_timestamp()
             WHERE invitation_id=$1 AND owner_user_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL`,
            [input.invitationId, uid]);
          if (changed !== 1) stop();
        } else {
          const assignment = await tx.one<{ status: string }>(
            `SELECT status FROM heir_private.heir_assignments
             WHERE owner_user_id=$1 AND heir_user_id=$2 AND invitation_id=$3 FOR UPDATE`,
            [uid, invitation.intended_user_id, input.invitationId]);
          if (!assignment) stop();
          if (assignment.status === 'revoked') return { ok: true as const };
          if (assignment.status !== 'active') stop();
          const changed = await tx.exec(
            `UPDATE heir_private.heir_assignments
             SET status='revoked',revoked_at=clock_timestamp(),version=version+1
             WHERE owner_user_id=$1 AND heir_user_id=$2 AND invitation_id=$3 AND status='active'`,
            [uid, invitation.intended_user_id, input.invitationId]);
          if (changed !== 1) stop();
          await tx.exec(
            `UPDATE heir_private.heir_envelopes SET revoked_at=clock_timestamp()
             WHERE owner_user_id=$1 AND heir_user_id=$2 AND revoked_at IS NULL`,
            [uid, invitation.intended_user_id]);
        }
        return { ok: true as const };
      }));
    },

    async putEnvelope(auth: string | null, input: {
      vaultId: string; heirUserId: string; keyId: string;
      publicKeyFingerprintHex: string; encapsulatedKeyHex: string;
      wrappedDekHex: string; suite: string;
    }): Promise<Result> {
      const uid = await actor(auth);
      if (!uid || !isVault(input?.vaultId) || !isUuid(input?.heirUserId) ||
          !isUuid(input?.keyId) || !SHA256HEX.test(input?.publicKeyFingerprintHex ?? '') ||
          !isHex(input?.encapsulatedKeyHex, 64, 64) ||
          !isHex(input?.wrappedDekHex, 96, 8192) || input?.suite !== CIPHER_SUITE) return no;
      return safe(async () => db.transaction(async tx => {
        const owner = await lockOwner(tx, uid);
        if (!owner || owner.vault_id !== input.vaultId) stop();
        const assignment = await tx.one<{ version: string | number; status: string }>(
          `SELECT version,status FROM heir_private.heir_assignments
           WHERE owner_user_id=$1 AND heir_user_id=$2 FOR UPDATE`,
          [uid, input.heirUserId]);
        const assignmentVersion = positiveSafeVersion(assignment?.version);
        if (!assignment || assignment.status !== 'active' || assignmentVersion === null) stop();
        const key = await tx.one<{ fingerprint_hex: string }>(
          `SELECT encode(fingerprint,'hex') AS fingerprint_hex
           FROM heir_private.heir_public_keys
           WHERE heir_user_id=$1 AND key_id=$2 AND verified_at IS NOT NULL AND revoked_at IS NULL
           FOR UPDATE`, [input.heirUserId, input.keyId]);
        if (!key || key.fingerprint_hex !== input.publicKeyFingerprintHex) stop();
        const changed = await tx.exec(
          `INSERT INTO heir_private.heir_envelopes
           (owner_user_id,heir_user_id,key_id,assignment_version,suite,encapsulated_key,wrapped_dek)
           VALUES ($1,$2,$3,$4,$5,decode($6,'hex'),decode($7,'hex'))
           ON CONFLICT (owner_user_id,heir_user_id) DO UPDATE
           SET key_id=EXCLUDED.key_id,assignment_version=EXCLUDED.assignment_version,
               suite=EXCLUDED.suite,encapsulated_key=EXCLUDED.encapsulated_key,
               wrapped_dek=EXCLUDED.wrapped_dek,revoked_at=NULL,updated_at=clock_timestamp()
           WHERE heir_private.heir_envelopes.revoked_at IS NULL`,
          [uid,input.heirUserId,input.keyId,assignmentVersion,input.suite,
            input.encapsulatedKeyHex,input.wrappedDekHex]);
        if (changed !== 1) stop();
        return { ok: true as const };
      }));
    },
  };
}
