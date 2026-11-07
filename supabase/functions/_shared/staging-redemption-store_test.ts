import { createStagingRedemptionStore } from "./staging-redemption-store.ts";
const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const hash = "a".repeat(64);
function assert(v: boolean, msg: string) { if (!v) throw Error(msg); }
Deno.test("store is disabled by default and never invokes RPC", async () => {
  let calls = 0;
  const store = createStagingRedemptionStore({ async rpc() { calls++; return { data: true, error: null }; } });
  assert(!await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "disabled store accepted");
  assert(calls === 0, "disabled store invoked RPC");
});
Deno.test("enabled adapter passes only verified ID and hash to internal RPC", async () => {
  let calls = 0;
  const store = createStagingRedemptionStore({ async rpc(name, args) {
    calls++;
    assert(name === "redeem_trusted_person_invitation_internal", "wrong RPC");
    assert(args.p_verified_user_id === uid, "wrong user");
    assert(args.p_token_hash === "\\x" + hash, "wrong digest encoding");
    return { data: true, error: null };
  } }, true, "ojfoijljykjhveejvkfx");
  assert(await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "valid result denied");
  assert(calls === 1, "unexpected call count");
});
Deno.test("rejects invalid input, RPC errors and non-boolean success", async () => {
  let calls = 0;
  const client = { async rpc() { calls++; return { data: "true", error: null }; } };
  const store = createStagingRedemptionStore(client, true, "ojfoijljykjhveejvkfx");
  assert(!await store.redeemAtomically({ verifiedUserId: "bad", tokenHashHex: hash }), "bad ID accepted");
  assert(!await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: "bad" }), "bad hash accepted");
  assert(calls === 0, "invalid input invoked RPC");
  assert(!await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "string true accepted");
  const failed = createStagingRedemptionStore({ async rpc() { throw Error("database"); } }, true, "ojfoijljykjhveejvkfx");
  assert(!await failed.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "exception accepted");
});

Deno.test("enabled adapter refuses production and unknown project references", async () => {
  let calls = 0;
  const client = { async rpc() { calls++; return { data: true, error: null }; } };
  for (const ref of [null, "", "avapuibsidubuzxjtyld", "wrong"]) {
    const store = createStagingRedemptionStore(client, true, ref);
    assert(!await store.redeemAtomically({ verifiedUserId: uid, tokenHashHex: hash }), "non-staging project accepted");
  }
  assert(calls === 0, "non-staging project invoked RPC");
});
