/** LOCAL ONLY: proposed replacement for supabase/functions/trusted-person-invite-test/index.ts.
 * Requires deployed, reviewed SQL and service-role secret. Never browser-facing credentials.
 * No release of encrypted vault content; invitation acceptance only.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { handleRedemptionRequest } from "../_shared/redemption-http-handler.ts";
import { createAtomicRedemptionStore } from "../_shared/atomic-redemption-store.ts";
import { consumeHeirRateLimit } from "../_shared/heir-rate-limit.ts";

const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Explicit server-side opt-in; never controlled by request data.
// Deployment of this reviewed function is the server-side activation.
const configured = Deno.env.get("HEIR_REDEMPTION_ENABLED") === "true" && !!(url && anonKey && serviceKey);
const authClient = configured
  ? createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const serviceClient = configured
  ? createClient(url!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const deniedAuth = { auth: { async getUser(_token: string) {
  return { data: { user: null }, error: new Error("disabled") };
} } };
const deniedStore = { async redeemAtomically(): Promise<"denied"> { return "denied"; } };
Deno.serve((request: Request) => handleRedemptionRequest(request, {
  auth: authClient ?? deniedAuth,
  store: serviceClient ? createAtomicRedemptionStore(serviceClient) : deniedStore,
  rateLimit: (verifiedUserId: string) => serviceClient
    ? consumeHeirRateLimit(serviceClient, verifiedUserId, "redeem")
    : Promise.resolve("unavailable" as const),
  enabled: configured,
}));