/**
 * Fail-closed legacy RPC adapter.
 *
 * The actual staging function lives in an unexposed private schema with
 * EXECUTE revoked from service_role. A generic Supabase REST rpc() client
 * must NEVER be used to bridge this boundary: it could make a caller-
 * supplied p_verified_user_id authoritative without database-side proof.
 *
 * A future integration requires a separately reviewed internal gateway
 * that binds the JWT subject to the DB operation, not this adapter.
 * NOT DEPLOYED.
 */
import type { AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";

/** Kept for compatibility with existing non-deployed imports. */
export type InternalRpcClient = {
  rpc(
    name: string,
    args: { p_verified_user_id: string; p_token_hash: string },
  ): Promise<{ data: unknown; error: unknown | null }>;
};

/** Deliberately refuses all redemptions even when enabled=true. */
export function createStagingRedemptionStore(
  _client: InternalRpcClient,
  _enabled = false,
  _projectRef: string | null = null,
): AtomicRedemptionStore {
  return { async redeemAtomically() { return "denied"; } };
}
