/**
 * Staging-only redemption runtime. NOT DEPLOYED.
 *
 * Database integration discovered that the RPC lives in the unexposed
 * helferlein_invite_staging schema and deliberately grants no EXECUTE to
 * service_role. The old privileged .rpc() path could not invoke it safely.
 * Never turn on a service_role REST RPC to work around that restriction:
 * p_verified_user_id is a trusted-server assertion, not DB authentication.
 * A future internal gateway must authenticate the JWT and use a separately
 * reviewed server-only database identity and transport.
 */

/** Fail closed regardless of enabled/config until a reviewed gateway exists. */
export function createStagingRedemptionHandler(
  _config: { supabaseUrl: string | undefined; anonKey: string | undefined; serviceRoleKey: string | undefined },
  _enabled = false,
): (request: Request) => Promise<Response> {
  return async (_request: Request) => new Response(
    JSON.stringify({ error: "not_configured" }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
