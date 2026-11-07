import { createBoundStagingRedemptionStore, isIsolatedStagingUrl } from "./staging-redemption-client.ts";

const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const hash = "a".repeat(64);
const staging = "https://ojfoijljykjhveejvkfx.supabase.co";
function assert(value: boolean, message: string) { if (!value) throw Error(message); }

Deno.test("only exact isolated staging origin passes URL validation", () => {
  assert(isIsolatedStagingUrl(staging), "staging rejected");
  for (const url of [null, "", "https://avapuibsidubuzxjtyld.supabase.co",
    "https://ojfoijljykjhveejvkfx.supabase.co.evil.test",
    "http://ojfoijljykjhveejvkfx.supabase.co",
    staging + "/rest/v1", staging + "/", staging + ":443",
    staging.toUpperCase(),
    staging + "?x=1", staging + "#fragment",
    "https://user:pass@ojfoijljykjhveejvkfx.supabase.co"]) {
    assert(!isIsolatedStagingUrl(url), "unsafe URL accepted: " + url);
  }
});

Deno.test("disabled or wrong URL never constructs a privileged client", async () => {
  let constructed = 0;
  let called = 0;
  const factory = () => { constructed++; return { async rpc() { called++; return { data: true, error: null }; } }; };
  for (const url of [staging, null, "https://avapuibsidubuzxjtyld.supabase.co"]) {
    const store = createBoundStagingRedemptionStore(url, factory, url !== staging);
    assert(!await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "unsafe request accepted");
  }
  assert(constructed === 0 && called === 0, "privileged client constructed");
});

Deno.test("enabled staging binds the exact URL to constructor", async () => {
  let received = "";
  let calls = 0;
  const store = createBoundStagingRedemptionStore(staging, (url) => {
    received = url;
    return { async rpc() { calls++; return { data: true, error: null }; } };
  }, true);
  assert(await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "valid staging denied");
  assert(received === staging && calls === 1, "wrong destination or call count");
});

Deno.test("client construction failure denies without throwing", async () => {
  const store = createBoundStagingRedemptionStore(staging, () => { throw Error("no credentials"); }, true);
  assert(!await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "constructor error accepted");
});
