/**
 * Staging-only runtime wiring for invitation redemption. NOT DEPLOYED.
 * Never import this from the production app. This module does not run SQL.
 * Deployment/activation requires a separate explicit security approval.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleRedemptionRequest } from "../_shared/redemption-http-handler.ts";
import { createBoundStagingRedemptionStore } from "../_shared/staging-redemption-client.ts";

const STAGING_URL = "https://ojfoijljykjhveejvkfx.supabase.co";

/**
 * Factory is intentionally disabled unless an authorized server caller passes
 * true. A caller must not obtain the service key from request data.
 * This is NOT invoked by index.ts, which stays permanently disabled.
 */
export function createStagingRedemptionHandler(
  config: { supabaseUrl: string | undefined; anonKey: string | undefined; serviceRoleKey: string | undefined },
  enabled = false,
): (request: Request) => Promise<Response> {
  const deny = () => new Response(JSON.stringify({ error: "not_configured" }), {
    status: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (!enabled || config.supabaseUrl !== STAGING_URL ||
      !config.anonKey || !config.serviceRoleKey) return async () => deny();

  // Both clients are created using the exact validated staging URL.
  // The privileged client never receives the caller's bearer token.
  const auth = createClient(STAGING_URL, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const store = createBoundStagingRedemptionStore(STAGING_URL, (verifiedUrl) =>
    createClient(verifiedUrl, config.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }), true);

  return (request: Request) => handleRedemptionRequest(request, { auth, store, enabled: true });
}
