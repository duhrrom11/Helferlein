/** Server-only, fail-closed limiter backed by a single atomic PostgreSQL RPC.
 * Never send an IP, bearer token, invitation token or digest as a limiter key.
 */
export type HeirOperation = "issue" | "redeem";
export type RateDecision = "allowed" | "limited" | "unavailable";
interface RateRpcClient {
  rpc(name: string, args: Record<string, string>): PromiseLike<{ data: unknown; error: unknown }>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function consumeHeirRateLimit(
  client: RateRpcClient, actorId: string, operation: HeirOperation,
): Promise<RateDecision> {
  if (!UUID.test(actorId) || !["issue", "redeem"].includes(operation)) return "unavailable";
  try {
    const { data, error } = await client.rpc("consume_heir_rate_limit_atomic", {
      p_actor_id: actorId, p_operation: operation,
    });
    if (error != null) return "unavailable";
    if (data === true) return "allowed";
    if (data === false) return "limited";
    return "unavailable";
  } catch { return "unavailable"; }
}
