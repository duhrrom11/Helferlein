/**
 * Isolated HTTP contract tests for the locked-down staging boundary.
 * No network, credentials, database changes or deployment.
 */
import { handleRedemptionRequest } from "./redemption-http-handler.ts";
import { createBoundStagingRedemptionStore } from "./staging-redemption-client.ts";
import type { AuthUserLookup } from "./verified-user.ts";
const staging = "https://ojfoijljykjhveejvkfx.supabase.co";
const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const token = "a".repeat(64);
const auth: AuthUserLookup = { auth: { async getUser(jwt) {
  return jwt === "test.jwt"
    ? { data: { user: { id: uid } }, error: null }
    : { data: { user: null }, error: "invalid" };
} } };
function request(bearer = "Bearer test.jwt") {
  return new Request("https://example.test/redeem", {
    method: "POST",
    headers: { Authorization: bearer, "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}
function assert(ok: boolean, msg: string) { if (!ok) throw Error(msg); }
Deno.test("valid verified user is denied until secure DB gateway exists", async () => {
  let constructed = 0;
  const store = createBoundStagingRedemptionStore(staging, () => {
    constructed++;
    return { async rpc() { throw Error("forbidden"); } };
  }, true);
  const response = await handleRedemptionRequest(request(), { auth, store, enabled: true });
  assert(response.status === 404, "locked store unexpectedly accepted redemption");
  assert(constructed === 0, "privileged client was constructed");
  assert(!(await response.text()).includes(token), "token leaked");
});
Deno.test("invalid JWT is denied without constructing privileged client", async () => {
  let constructed = 0;
  const store = createBoundStagingRedemptionStore(staging, () => {
    constructed++;
    return { async rpc() { throw Error("forbidden"); } };
  }, true);
  const response = await handleRedemptionRequest(request("Bearer wrong.jwt"), { auth, store, enabled: true });
  assert(response.status === 404 && constructed === 0, "invalid JWT reached privileged client");
});
Deno.test("production destination is denied without constructing a client", async () => {
  let constructed = 0;
  const store = createBoundStagingRedemptionStore(
    "https://avapuibsidubuzxjtyld.supabase.co",
    () => { constructed++; return { async rpc() { throw Error("forbidden"); } }; }, true,
  );
  const response = await handleRedemptionRequest(request(), { auth, store, enabled: true });
  assert(response.status === 404 && constructed === 0, "production destination was used");
});
