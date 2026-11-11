/** NOT DEPLOYED: extra Supabase session revocation guard for sensitive heir actions.
 * getUser verifies the account; getClaims verifies JWT signature/exp and exposes
 * session_id; existence is checked against auth.sessions using a restricted SQL
 * principal. No JWT is decoded without cryptographic verification.
 */
import type { SqlBackend, VerifyUser } from './heir-staging-backend.ts';
import type { SupabaseAuthProvider } from './heir-supabase-auth.ts';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEARER=/^Bearer ([A-Za-z0-9._~-]{8,4096})$/;
export interface SessionAwareAuthProvider extends SupabaseAuthProvider {
  auth: SupabaseAuthProvider['auth'] & {
    /** Must verify signature, issuer and expiry via configured Supabase client. */
    getClaims(token: string): Promise<{
      data: { claims: { sub?: unknown; session_id?: unknown; exp?: unknown } } | null;
      error: unknown | null;
    }>;
  };
}
export function createHeirActiveSessionVerifier(db: SqlBackend, client: SessionAwareAuthProvider): VerifyUser {
  if(!db || typeof db.transaction!=='function' ||
      typeof client?.auth?.getUser!=='function' ||
      typeof client?.auth?.getClaims!=='function') throw Error('session_verifier_unconfigured');
  return async header=>{
    if(typeof header!=='string')return null;
    const match=BEARER.exec(header);
    if(!match)return null;
    try {
      const token=match[1];
      const [userResult,claimResult]=await Promise.all([
        client.auth.getUser(token),
        client.auth.getClaims(token),
      ]);
      const id=userResult.data?.user?.id;
      const claims=claimResult.data?.claims;
      if(userResult.error || claimResult.error || typeof id!=='string' ||
         !UUID.test(id) || !claims || typeof claims.sub!=='string' ||
         claims.sub.toLowerCase()!==id.toLowerCase() ||
         typeof claims.session_id!=='string' || !UUID.test(claims.session_id) ||
         typeof claims.exp!=='number' || !Number.isSafeInteger(claims.exp) ||
         claims.exp <= Math.floor(Date.now()/1000)+5) return null;
      // Parameterized, read-only, constrained to UUID+owner. No JWT stored.
      const found=await db.transaction(tx=>tx.one<{ exists: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM auth.sessions
             WHERE id=$1::uuid AND user_id=$2::uuid
          ) AS exists`,
        [claims.session_id, id]));
      return found?.exists===true ? id.toLowerCase() : null;
    } catch { return null; } // permission failure, timeout or missing table denies
  };
}
