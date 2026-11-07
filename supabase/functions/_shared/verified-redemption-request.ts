/**
 * Staging-only authenticated redemption orchestration, NOT deployed.
 * No DB adapter, credentials, HTTP handler, email or data release.
 * The caller supplies a server-configured Supabase auth client and a
 * reviewed atomic database adapter. Never trust userId from request JSON.
 */
import { getVerifiedUserId, type AuthUserLookup } from "./verified-user.ts";
import { hashInvitationToken } from "./invitation-token.ts";
import {
  redeemWithAtomicStore,
  type AtomicRedemptionStore,
  type RedemptionOutcome,
} from "./atomic-invitation-redemption.ts";

export async function redeemVerifiedInvitation(
  authClient: AuthUserLookup,
  store: AtomicRedemptionStore,
  authorizationHeader: string | null,
  rawToken: string,
): Promise<RedemptionOutcome> {
  const userId = await getVerifiedUserId(authClient, authorizationHeader);
  if (!userId) return "denied";
  try {
    const digest = await hashInvitationToken(rawToken);
    return await redeemWithAtomicStore(store, userId, digest);
  } catch {
    // Malformed tokens and any backend failure have the same generic denial.
    return "denied";
  }
}
