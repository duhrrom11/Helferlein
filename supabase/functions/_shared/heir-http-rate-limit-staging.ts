/**
 * NOT DEPLOYED. Distributed PostgreSQL rate limiting for heir HTTP operations.
 * The caller MUST supply the verified ingress remote identity, NEVER read a
 * client-provided X-Forwarded-For or similar header. No bearer token is stored.
 * No database role or migration is created by this module.
 */
import type { SqlBackend } from './heir-staging-backend.ts';
import type { HeirHttpAdmission } from './heir-http-staging.ts';

const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const hexdigest = (bytes: Uint8Array) => Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
const MAX_IP_ID = 128;

export interface TrustedIngressIdentity {
  /** Provided by a trusted ingress or reverse proxy, not a request header. */
  remoteIdentity(request: Request): Promise<string | null>;
}

export function createHeirPgAdmission(db: SqlBackend, ingress: TrustedIngressIdentity): HeirHttpAdmission {
  if (!db || typeof db.transaction !== 'function' ||
      !ingress || typeof ingress.remoteIdentity !== 'function') throw new Error('rate_limiter_unconfigured');
  async function bucket(scope: 'pre' | 'user', identity: string, route: string, limit: number): Promise<boolean> {
    if (!identity || identity.length > MAX_IP_ID || /[^\x21-\x7e]/.test(identity)) return false;
    try {
      const raw = encoder.encode(`Helferlein/heir-rate-v1/${scope}/${identity}`);
      const hash = hexdigest(new Uint8Array(await crypto.subtle.digest('SHA-256', raw)));
      return await db.transaction(async tx => {
        // One atomic UPSERT. Two concurrent requests can never both observe
        // an increment-free window. DB time is authoritative.
        const row = await tx.one<{hits: number}>(`
          INSERT INTO heir_private.heir_http_limits (identity_hash,route,window_start,hits)
          VALUES (decode($1,'hex'),$2,clock_timestamp(),1)
          ON CONFLICT (identity_hash,route) DO UPDATE SET
            hits = CASE
              WHEN heir_private.heir_http_limits.window_start < clock_timestamp() - interval '1 minute' THEN 1
              ELSE heir_private.heir_http_limits.hits + 1 END,
            window_start = CASE
              WHEN heir_private.heir_http_limits.window_start < clock_timestamp() - interval '1 minute'
              THEN clock_timestamp() ELSE heir_private.heir_http_limits.window_start END
          RETURNING hits`, [hash, route]);
        return !!row && Number.isInteger(row.hits) && row.hits <= limit;
      });
    } catch { return false; }
  }
  return {
    async preAuth(request, route) {
      try {
        const identity = await ingress.remoteIdentity(request);
        return typeof identity === 'string' && bucket('pre', identity, route, 30);
      } catch { return false; }
    },
    async user(userId, route) {
      if (!UID.test(userId)) return false;
      const limit = route.endsWith('/create') || route.endsWith('/begin') ? 3 : 12;
      return bucket('user', userId, route, limit);
    },
  };
}
