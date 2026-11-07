/**
 * Isolated end-to-end contract test. No network, secrets, SQL or deployment.
 * Verifies HTTP -> authenticated identity -> SHA-256 -> atomic adapter.
 */
import { handleRedemptionRequest } from "./redemption-http-handler.ts";
import { createStagingRedemptionStore } from "./staging-redemption-store.ts";
import { hashInvitationToken } from "./invitation-token.ts";
import type { AuthUserLookup } from "./verified-user.ts";

const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const rawToken = "a".repeat(64);
const auth: AuthUserLookup = { auth: { async getUser(jwt) {
  if (jwt !== "test.jwt") return { data: { user: null }, error: "invalid" };
  return { data: { user: { id: uid } }, error: null };
} } };
function request(token = rawToken, bearer = "Bearer test.jwt") {
  return new Request("https://example.test/redeem", {
    method: "POST",
    headers: { Authorization: bearer, "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}
function assert(condition: boolean, message: string) {
  if (!condition) throw Error(message);
}
Deno.test("complete isolated redemption chain hashes secret and uses verified identity", async () => {
  let rpcCalls = 0;
  const digest = await hashInvitationToken(rawToken);
  const store = createStagingRedemptionStore({ async rpc(name, args) {
    rpcCalls++;
    assert(name === "redeem_trusted_person_invitation_internal", "unexpected RPC");
    assert(args.p_verified_user_id === uid, "unverified identity");
    assert(args.p_token_hash === "\\x" + digest, "raw or incorrect digest forwarded");
    return { data: true, error: null };
  } }, true, "ojfoijljykjhveejvkfx");
  const response = await handleRedemptionRequest(request(), { auth, store, enabled: true });
  assert(response.status === 200 && rpcCalls === 1, "valid redemption not processed once");
  assert(!(await response.text()).includes(rawToken), "token leaked");
});
Deno.test("invalid bearer and disabled store never call privileged RPC", async () => {
  let rpcCalls = 0;
  const rpc = { async rpc() { rpcCalls++; return { data: true, error: null }; } };
  const enabledStore = createStagingRedemptionStore(rpc, true, "ojfoijljykjhveejvkfx");
  const denied = await handleRedemptionRequest(request(rawToken, "Bearer wrong.jwt"), {
    auth, store: enabledStore, enabled: true,
  });
  assert(denied.status === 404, "invalid JWT accepted");
  const disabled = await handleRedemptionRequest(request(), {
    auth, store: createStagingRedemptionStore(rpc), enabled: true,
  });
  assert(disabled.status === 404 && rpcCalls === 0, "disabled store accessed RPC");
});
