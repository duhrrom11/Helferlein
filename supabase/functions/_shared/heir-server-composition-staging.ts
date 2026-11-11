/**
 * NOT DEPLOYED. Server-only assembly of all existing heir services.
 * Importing this module creates no network listener, database, Supabase client
 * or release endpoint. Runtime transport, credentials and allowed origins MUST
 * be configured only after an independent security review.
 */
import { createHeirStagingBackend, type SqlBackend } from './heir-staging-backend.ts';
import { createHeirKeyProofStaging } from './heir-key-proof-staging.ts';
import { createHeirReleaseStaging } from './heir-release-staging.ts';
import { createHeirActiveSessionVerifier, resolveHeirVerifiedSession, type SessionAwareAuthProvider } from './heir-active-session-staging.ts';
import { createHeirSessionBoundDatabase } from './heir-session-bound-db-staging.ts';
import { createHeirPgAdmission, type TrustedIngressIdentity } from './heir-http-rate-limit-staging.ts';
import { createHeirHttpStaging } from './heir-http-staging.ts';

export interface HeirServerStagingDependencies {
  /** Restricted, server-side PostgreSQL transaction adapter. No browser access. */
  database: SqlBackend;
  /** Server-side Supabase Auth client. Must verify token using auth.getUser. */
  supabaseAuth: SessionAwareAuthProvider;
  /** Authoritative ingress identity, never untrusted request headers. */
  trustedIngress: TrustedIngressIdentity;
  /** Explicit HTTPS origins. No wildcard and no default host. */
  allowedOrigins: readonly string[];
}

/** Returns an inert Request -> Response handler; does not deploy or listen. */
export function composeHeirServerStaging(deps: HeirServerStagingDependencies):
  (request: Request) => Promise<Response> {
  if (!deps?.database || typeof deps.database.transaction !== 'function' ||
      !deps.supabaseAuth || typeof deps.supabaseAuth.auth?.getUser !== 'function' ||
      typeof deps.supabaseAuth.auth?.getClaims !== 'function' ||
      !deps.trustedIngress || typeof deps.trustedIngress.remoteIdentity !== 'function' ||
      !Array.isArray(deps.allowedOrigins) || deps.allowedOrigins.length === 0) {
    throw new Error('heir_server_unconfigured');
  }
  const verifyUser = createHeirActiveSessionVerifier(deps.database, deps.supabaseAuth);
  const admission = createHeirPgAdmission(deps.database, deps.trustedIngress);

  return createHeirHttpStaging({
    verifyUser,
    admission,
    allowedOrigins: deps.allowedOrigins,
    async createServices(auth, userId) {
      // Per-request, never a process-global auth/session mutable variable.
      const session=await resolveHeirVerifiedSession(deps.supabaseAuth,auth);
      if(!session || session.userId!==userId)throw Error('session_scope_denied');
      // All domain SQL (including owner row locks and mutations) now happens
      // with a pinned auth.sessions row until that transaction commits.
      const guarded=createHeirSessionBoundDatabase(deps.database,session);
      const invitations=createHeirStagingBackend(guarded,verifyUser);
      const keys=createHeirKeyProofStaging(guarded,verifyUser);
      const release=createHeirReleaseStaging(guarded,verifyUser);
      return {
        createInvitation: (header, body) => invitations.createInvitation(header,body),
        redeemInvitation: (header, body) => invitations.redeemInvitation(header,body),
        listInvitations: (header, body) => invitations.listInvitations(header,body),
        revokeInvitation: (header, body) => invitations.revokeInvitation(header,body),
        putEnvelope: (header, body) => invitations.putEnvelope(header,body),
        beginEnrollment: (header, body) => keys.beginEnrollment(header,body),
        confirmEnrollment: (header, body) => keys.confirmEnrollment(header,body),
        raiseAlarm: (header, body) => release.raiseAlarm(header,body),
        cancelAlarm: (header, body) => release.cancelAlarm(header,body),
        reviewStatus: (header, body) => release.reviewStatus(header,body),
      };
    },
  });
}
