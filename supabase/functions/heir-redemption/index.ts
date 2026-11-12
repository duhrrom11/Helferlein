/** LOCAL ONLY: proposed replacement for supabase/functions/trusted-person-invite-test/index.ts.
 * Requires deployed, reviewed SQL and service-role secret. Never browser-facing credentials.
 * No release of encrypted vault content; invitation acceptance only.
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { handleRedemptionRequest } from "../_shared/redemption-http-handler.ts";
import { createAtomicRedemptionStore } from "../_shared/atomic-redemption-store.ts";

const url = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Explicit server-side opt-in; never controlled by request data.
const enabled = Deno.env.get("HEIR_REDEMPTION_ENABLED") === "true";
const configured = !!(url && anonKey && serviceKey && enabled);
const authClient = configured
  ? createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const serviceClient = configured
  ? createClient(url!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const deniedAuth = { auth: { async getUser(_token: string) {
  return { data: { user: null }, error: new Error("disabled") };
} } };
const deniedStore = { async redeemAtomically() { return false; } };
Deno.serve((request: Request) => handleRedemptionRequest(request, {
  auth: authClient ?? deniedAuth,
  store: serviceClient ? createAtomicRedemptionStore(serviceClient) : deniedStore,
  enabled: configured,
}));