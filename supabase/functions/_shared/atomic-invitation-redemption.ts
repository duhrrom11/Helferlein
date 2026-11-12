/**
 * Staging-only orchestration contract. Not an endpoint; no DB client or
 * credentials. Atomicity MUST be provided by the adapter's single database
 * transaction (including row locking and all authorization rechecks).
 *
 * Do not implement the adapter with separate Supabase REST requests.
 */
export type RedemptionOutcome = "accepted" | "denied" | "unavailable";
export type AtomicRedemptionResult = "accepted" | "denied" | "unavailable";

export interface AtomicRedemptionStore {
  /**
   * Must execute as ONE DB transaction with locked invitation/ownership rows,
   * database-clock expiry, matching verified user, non-revocation, no existing
   * trusted-person assignment, INSERT + acceptance UPDATE, and rollback on
   * any failure. Return 'denied' for a business rejection and 'unavailable'
   * for infrastructure failures; never return secret data.
   */
  redeemAtomically(args: {
    tokenHashHex: string;
    verifiedUserId: string;
  }): Promise<AtomicRedemptionResult>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;

/** Accepts only a server-verified UID and digest, never a browser identity. */
export async function redeemWithAtomicStore(
  store: AtomicRedemptionStore,
  verifiedUserId: string | null,
  tokenHashHex: string,
): Promise<RedemptionOutcome> {
  if (!verifiedUserId || !UUID.test(verifiedUserId) || !HASH.test(tokenHashHex)) {
    return "denied";
  }
  try {
    return await store.redeemAtomically({ verifiedUserId, tokenHashHex });
  } catch {
    // Do not leak database details or distinguish unknown/foreign invitations.
    return "unavailable";
  }
}
