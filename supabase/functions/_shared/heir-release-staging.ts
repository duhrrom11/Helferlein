/** NON-DEPLOYED. Server-only alarm and grace-period decisions.
 * This module intentionally has NO key-envelope fetch or released state:
 * elapsed time is never sufficient to expose estate data. A separately audited
 * and legally justified release approval flow is mandatory.
 */
import type { SqlBackend, SqlTx, VerifyUser } from './heir-staging-backend.ts';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VAULT = /^v_[A-Za-z0-9_-]{8,80}$/;
const denied = Object.freeze({ ok: false as const });
function fail(): never { throw new Error('denied'); }
export function createHeirReleaseStaging(db: SqlBackend, verifyUser: VerifyUser) {
  async function actor(header: string | null) {
    try { const uid = await verifyUser(header); return uid && UUID.test(uid) ? uid : null; }
    catch { return null; }
  }
  const ownerLock = (tx: SqlTx, owner: string) => tx.one<{ vault_id: string }>(
    `SELECT vault_id FROM public.vault_cloud_snapshots WHERE owner_user_id=$1 FOR UPDATE`, [owner]);
  const assignmentLock = (tx: SqlTx, owner: string, heir: string) => tx.one<{ status: string }>(
    `SELECT status FROM heir_private.heir_assignments WHERE owner_user_id=$1 AND heir_user_id=$2 FOR UPDATE`,
    [owner, heir]);
  return {
    async raiseAlarm(auth: string | null, input: { ownerUserId: string; vaultId: string }) {
      const heir = await actor(auth);
      if (!heir || !UUID.test(input?.ownerUserId ?? '') || !VAULT.test(input?.vaultId ?? '') || heir === input.ownerUserId) return denied;
      try {
        return await db.transaction(async tx => {
          const owner = await ownerLock(tx, input.ownerUserId);
          if (!owner || owner.vault_id !== input.vaultId) fail();
          const assignment = await assignmentLock(tx, input.ownerUserId, heir);
          if (!assignment || assignment.status !== 'active') fail();
          const existing = await tx.one<{ state: string }>(
            `SELECT state FROM heir_private.heir_release_cases WHERE owner_user_id=$1 FOR UPDATE`,
            [input.ownerUserId]);
          if (existing && existing.state === 'grace') return { ok: true as const, state: 'grace' as const };
          // The same heir may not reset an expired/cancelled review case via browser.
          if (existing) fail();
          const n = await tx.exec(`INSERT INTO heir_private.heir_release_cases
             (owner_user_id,triggered_by_user_id,state,triggered_at,grace_until)
             VALUES ($1,$2,'grace',clock_timestamp(),clock_timestamp()+interval '24 hours')`,
            [input.ownerUserId, heir]);
          if (n !== 1) fail();
          return { ok: true as const, state: 'grace' as const };
        });
      } catch { return denied; }
    },
    async cancelAlarm(auth: string | null, vaultId: string) {
      const ownerId = await actor(auth);
      if (!ownerId || !VAULT.test(vaultId)) return denied;
      try {
        return await db.transaction(async tx => {
          const owner = await ownerLock(tx, ownerId);
          if (!owner || owner.vault_id !== vaultId) fail();
          const existing = await tx.one<{ state: string }>(
            `SELECT state FROM heir_private.heir_release_cases WHERE owner_user_id=$1 FOR UPDATE`, [ownerId]);
          if (!existing) fail();
          if (existing.state === 'cancelled') return { ok: true as const };
          if (existing.state !== 'grace') fail();
          const n = await tx.exec(`UPDATE heir_private.heir_release_cases
             SET state='cancelled',cancelled_at=clock_timestamp(),version=version+1
             WHERE owner_user_id=$1 AND state='grace'`, [ownerId]);
          if (n !== 1) fail();
          return { ok: true as const };
        });
      } catch { return denied; }
    },
    async reviewStatus(auth: string | null, input: { ownerUserId: string; vaultId: string }) {
      const heir = await actor(auth);
      if (!heir || !UUID.test(input?.ownerUserId ?? '') || !VAULT.test(input?.vaultId ?? '')) return denied;
      try {
        return await db.transaction(async tx => {
          const owner = await ownerLock(tx, input.ownerUserId);
          if (!owner || owner.vault_id !== input.vaultId) fail();
          const assignment = await assignmentLock(tx, input.ownerUserId, heir);
          if (!assignment || assignment.status !== 'active') fail();
          const row = await tx.one<{ state: string; grace_complete: boolean }>(
            `SELECT state,(grace_until<=clock_timestamp()) AS grace_complete
             FROM heir_private.heir_release_cases WHERE owner_user_id=$1 FOR UPDATE`,
            [input.ownerUserId]);
          if (!row) return { ok: true as const, state: 'locked' as const };
          if (row.state === 'cancelled') return { ok: true as const, state: 'locked' as const };
          if (row.state !== 'grace') fail();
          // Even after expiry, never expose envelope, snapshot, or release authorization.
          return { ok: true as const, state: row.grace_complete === true
            ? 'pending_independent_review' as const : 'grace' as const };
        });
      } catch { return denied; }
    },
  };
}
