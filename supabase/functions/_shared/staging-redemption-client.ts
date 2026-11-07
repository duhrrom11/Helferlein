/**
 * Staging URL validation remains available, but privileged RPC client
 * construction is forbidden until a separately reviewed internal gateway
 * authenticates the database-side user identity. NOT DEPLOYED.
 */
import type { InternalRpcClient } from "./staging-redemption-store.ts";
import type { AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";
const STAGING_URL = "https://ojfoijljykjhveejvkfx.supabase.co";
export function isIsolatedStagingUrl(value: string | null | undefined): boolean {
  if (typeof value !== "string" || value !== STAGING_URL) return false;
  try {
    const url = new URL(value);
    return url.href === STAGING_URL + "/" && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}
/** Always deny. Never construct a privileged client, even when enabled. */
export function createBoundStagingRedemptionStore(
  _configuredUrl: string | null | undefined,
  _constructClient: (verifiedUrl: string) => InternalRpcClient,
  _enabled = false,
): AtomicRedemptionStore {
  return { async redeemAtomically() { return false; } };
}
