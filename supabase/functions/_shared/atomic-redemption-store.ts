/** LOCAL ONLY: place as supabase/functions/_shared/atomic-redemption-store.ts.
 * No RPC invocation outside trusted server-side Edge Function.
 */
import type { AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";
interface RpcClient { rpc(name: string, args: Record<string, string>): Promise<{data: unknown; error: unknown}> }
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAtomicRedemptionStore(client: RpcClient): AtomicRedemptionStore {
  return { async redeemAtomically({tokenHashHex, verifiedUserId}) {
    if (!HASH.test(tokenHashHex) || !UUID.test(verifiedUserId)) return "denied";
    try {
      const {data, error} = await client.rpc("redeem_heir_invitation_atomic", {
        p_token_hash_hex: tokenHashHex, p_verified_user_id: verifiedUserId,
      });
      if (error != null) return "unavailable";
      if (data === true) return "accepted";
      if (data === false) return "denied";
      return "unavailable";
    } catch { return "unavailable"; }
  }};
}