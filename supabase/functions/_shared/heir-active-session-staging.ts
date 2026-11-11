/** NOT DEPLOYED: verify Supabase identity and cryptographically checked JWT claims.
 * Sensitive operations must ALSO lock the session inside their domain transaction.
 */
import type { SqlBackend, VerifyUser } from './heir-staging-backend.ts';
import type { SupabaseAuthProvider } from './heir-supabase-auth.ts';
import type { VerifiedHeirSession } from './heir-session-bound-db-staging.ts';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEARER=/^Bearer ([A-Za-z0-9._~-]{8,4096})$/;
export interface SessionAwareAuthProvider extends SupabaseAuthProvider {
  auth: SupabaseAuthProvider['auth'] & {
    /** Trusted Supabase getClaims must verify signature, issuer and expiry. */
    getClaims(token: string): Promise<{
      data: { claims: { sub?: unknown; session_id?: unknown; exp?: unknown } } | null;
      error: unknown | null;
    }>;
  };
}

/** Never read unsigned JWT fields, headers, request body or local user metadata. */
export async function resolveHeirVerifiedSession(
  client: SessionAwareAuthProvider, header: string | null
): Promise<VerifiedHeirSession | null> {
  const match=typeof header==='string' ? BEARER.exec(header) : null;
  if(!match || typeof client?.auth?.getUser!=='function' ||
      typeof client.auth.getClaims!=='function')return null;
  try {
    const [userResult,claimResult]=await Promise.all([
      client.auth.getUser(match[1]), client.auth.getClaims(match[1])
    ]);
    const id=userResult.data?.user?.id;
    const claims=claimResult.data?.claims;
    if(userResult.error || claimResult.error || typeof id!=='string' ||
       !UUID.test(id) || !claims || typeof claims.sub!=='string' ||
       claims.sub.toLowerCase()!==id.toLowerCase() ||
       typeof claims.session_id!=='string' || !UUID.test(claims.session_id) ||
       typeof claims.exp!=='number' || !Number.isSafeInteger(claims.exp) ||
       claims.exp<=Math.floor(Date.now()/1000)+5)return null;
    return {userId:id.toLowerCase(),sessionId:claims.session_id.toLowerCase()};
  } catch { return null; }
}

/** Early request admission, before any sensitive operation. */
export function createHeirActiveSessionVerifier(db: SqlBackend, client: SessionAwareAuthProvider): VerifyUser {
  if(typeof db?.transaction!=='function'||typeof client?.auth?.getUser!=='function'||
      typeof client.auth.getClaims!=='function')throw Error('session_verifier_unconfigured');
  return async header=>{
    const session=await resolveHeirVerifiedSession(client,header);
    if(!session)return null;
    try {
      const found=await db.transaction(tx=>tx.one<{exists:boolean}>(
        `SELECT EXISTS (SELECT 1 FROM auth.sessions
           WHERE id=$1::uuid AND user_id=$2::uuid) AS exists`,
        [session.sessionId,session.userId]));
      return found?.exists===true ? session.userId : null;
    }catch{return null;}
  };
}
