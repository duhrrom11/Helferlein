/**
 * Staging-only client construction boundary. Not deployed or wired to an endpoint.
 * Never accept the URL from a request, and never pass an existing client here.
 * The supplied constructor MUST construct its RPC client using exactly this URL.
 */
import { createStagingRedemptionStore, type InternalRpcClient } from "./staging-redemption-store.ts";
import type { AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";

const STAGING_URL = "https://ojfoijljykjhveejvkfx.supabase.co";

export function isIsolatedStagingUrl(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.href === STAGING_URL + "/" &&
      url.username === "" && url.password === "" &&
      url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}

/**
 * Fail closed before constructing any privileged client. The constructor
 * must not use another URL or a pre-existing production client.
 * Explicit enablement is still required; no runtime entrypoint calls this.
 */
export function createBoundStagingRedemptionStore(
  configuredUrl: string | null | undefined,
  constructClient: (verifiedUrl: string) => InternalRpcClient,
  enabled = false,
): AtomicRedemptionStore {
  const denied: AtomicRedemptionStore = { async redeemAtomically() { return false; } };
  if (!enabled || !isIsolatedStagingUrl(configuredUrl)) return denied;
  try {
    const client = constructClient(STAGING_URL);
    return createStagingRedemptionStore(client, true, "ojfoijljykjhveejvkfx");
  } catch {
    return denied;
  }
}
