/**
 * Staging-only adapter for a future reviewed, internal atomic redemption RPC.
 * NOT deployed, NOT wired to any HTTP handler, and disabled by default.
 * A database RPC MUST perform every check and write in one transaction.
 * Never pass a client-provided user ID to this adapter.
 */
import type { AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";

export type InternalRpcClient = {
  rpc(
    name: string,
    args: { p_verified_user_id: string; p_token_hash: string },
  ): Promise<{ data: unknown; error: unknown | null }>;
};

/**
 * Disabled unless explicitly enabled after the SQL RPC, privilege model,
 * auth.getUser integration and concurrent-write tests are reviewed.
 * This adapter does not provide atomicity; the PostgreSQL function must.
 */
export function createStagingRedemptionStore(
  client: InternalRpcClient,
  enabled = false,
): AtomicRedemptionStore {
  return {
    async redeemAtomically({ verifiedUserId, tokenHashHex }): Promise<boolean> {
      if (!enabled) return false;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(verifiedUserId)) return false;
      if (!/^[a-f0-9]{64}$/.test(tokenHashHex)) return false;
      try {
        // Supabase RPC encodes bytea as PostgreSQL hex bytea input (\\x...).
        // Verify compatibility against isolated staging before enabling.
        const { data, error } = await client.rpc(
          "redeem_trusted_person_invitation_internal",
          { p_verified_user_id: verifiedUserId, p_token_hash: "\\x" + tokenHashHex },
        );
        return error === null && data === true;
      } catch {
        return false;
      }
    },
  };
}
