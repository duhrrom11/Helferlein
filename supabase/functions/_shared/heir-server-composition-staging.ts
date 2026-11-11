/**
 * NOT DEPLOYED. Server-only assembly of all existing heir services.
 * Importing this module creates no network listener, database, Supabase client
 * or release endpoint. Runtime transport, credentials and allowed origins MUST
 * be configured only after an independent security review.
 */
import { createHeirStagingBackend, type SqlBackend } from './heir-staging-backend.ts';
import { createHeirKeyProofStaging } from './heir-key-proof-staging.ts';
import { createHeirReleaseStaging } from './heir-release-staging.ts';
import { createHeirSupabaseVerifier, type SupabaseAuthProvider } from './heir-supabase-auth.ts';
import { createHeirPgAdmission, type TrustedIngressIdentity } from './heir-http-rate-limit-staging.ts';
import { createHeirHttpStaging } from './heir-http-staging.ts';

export interface HeirServerStagingDependencies {
  /** Restricted, server-side PostgreSQL transaction adapter. No browser access. */
  database: SqlBackend;
  /** Server-side Supabase Auth client. Must verify token using auth.getUser. */
  supabaseAuth: SupabaseAuthProvider;
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
      !deps.trustedIngress || typeof deps.trustedIngress.remoteIdentity !== 'function' ||
      !Array.isArray(deps.allowedOrigins) || deps.allowedOrigins.length === 0) {
    throw new Error('heir_server_unconfigured');
  }
  const verifyUser = createHeirSupabaseVerifier(deps.supabaseAuth);
  const invitations = createHeirStagingBackend(deps.database, verifyUser);
  const keys = createHeirKeyProofStaging(deps.database, verifyUser);
  const release = createHeirReleaseStaging(deps.database, verifyUser);
  const admission = createHeirPgAdmission(deps.database, deps.trustedIngress);

  return createHeirHttpStaging({
    verifyUser,
    admission,
    allowedOrigins: deps.allowedOrigins,
    services: {
      createInvitation: (auth, body) => invitations.createInvitation(auth, body),
      redeemInvitation: (auth, body) => invitations.redeemInvitation(auth, body),
      listInvitations: (auth, body) => invitations.listInvitations(auth, body),
      revokeInvitation: (auth, body) => invitations.revokeInvitation(auth, body),
      putEnvelope: (auth, body) => invitations.putEnvelope(auth, body),
      beginEnrollment: (auth, body) => keys.beginEnrollment(auth, body),
      confirmEnrollment: (auth, body) => keys.confirmEnrollment(auth, body),
      raiseAlarm: (auth, body) => release.raiseAlarm(auth, body),
      cancelAlarm: (auth, body) => release.cancelAlarm(auth, body),
      reviewStatus: (auth, body) => release.reviewStatus(auth, body),
    },
  });
}
