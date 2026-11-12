import { createStagingRedemptionStore } from "./staging-redemption-store.ts";
const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const hash = "a".repeat(64);
function assert(v: boolean, msg: string) { if (!v) throw Error(msg); }
Deno.test("legacy RPC adapter always denies and never invokes RPC", async () => {
  let calls = 0;
  const client = { async rpc() { calls++; return { data: true, error: null }; } };
  for (const enabled of [false, true]) {
    for (const ref of [null, "ojfoijljykjhveejvkfx", "avapuibsidubuzxjtyld"]) {
      const store = createStagingRedemptionStore(client, enabled, ref);
      for (const user of [uid, "bad"]) {
        assert(await store.redeemAtomically({ verifiedUserId: user, tokenHashHex: hash }) === "denied", "legacy adapter accepted");
      }
    }
  }
  assert(calls === 0, "legacy adapter invoked RPC");
});
