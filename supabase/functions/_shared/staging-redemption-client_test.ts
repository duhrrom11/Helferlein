import { createBoundStagingRedemptionStore, isIsolatedStagingUrl } from "./staging-redemption-client.ts";
const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const hash = "a".repeat(64);
const staging = "https://ojfoijljykjhveejvkfx.supabase.co";
function assert(v: boolean, msg: string) { if (!v) throw Error(msg); }
Deno.test("exact staging URL validation", () => {
  assert(isIsolatedStagingUrl(staging), "staging rejected");
  for (const url of [null, "", "https://avapuibsidubuzxjtyld.supabase.co",
    staging + ".evil.test", staging + "/", staging + "/rest/v1",
    staging + ":443", staging + "?x=1", "http://ojfoijljykjhveejvkfx.supabase.co"]) {
    assert(!isIsolatedStagingUrl(url), "unsafe URL accepted");
  }
});
Deno.test("privileged RPC client is never constructed, even when enabled", async () => {
  let constructed = 0;
  const factory = () => { constructed++; return { async rpc() { throw Error("must never call"); } }; };
  for (const url of [staging, null, "https://avapuibsidubuzxjtyld.supabase.co"]) {
    for (const enabled of [false, true]) {
      const store = createBoundStagingRedemptionStore(url, factory, enabled);
      assert(!await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "unsafe redemption accepted");
    }
  }
  assert(constructed === 0, "privileged client constructed");
});
