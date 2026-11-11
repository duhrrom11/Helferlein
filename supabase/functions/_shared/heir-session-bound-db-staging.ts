/** NOT DEPLOYED. Request-scoped DB wrapper: the session row is KEY SHARE
 * locked in the SAME transaction as every heir-domain SQL mutation/read.
 * Never share the wrapper across requests or accounts.
 */
import type { SqlBackend } from './heir-staging-backend.ts';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export interface VerifiedHeirSession { userId: string; sessionId: string }
export function createHeirSessionBoundDatabase(db: SqlBackend, session: VerifiedHeirSession): SqlBackend {
  if(typeof db?.transaction!=='function'||!UUID.test(session?.userId)||!UUID.test(session?.sessionId))
    throw Error('session_scope_unconfigured');
  return {
    transaction: work=>db.transaction(async tx=>{
      // Definer helper (REVIEW_ONLY) owns the needed row lock. The limited
      // backend role has EXECUTE only, never UPDATE on auth.sessions.
      const locked=await tx.one<{active:boolean}>(
        'SELECT heir_private.heir_lock_active_session($1::uuid,$2::uuid) AS active',
        [session.userId,session.sessionId]);
      if(locked?.active!==true)throw Error('session_inactive');
      return work(tx); // lock held through COMMIT/ROLLBACK
    }),
  };
}
