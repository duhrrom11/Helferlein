import { redeemWithAtomicStore, type AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";
const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const hash = "a".repeat(64);
function assert(v: boolean, m: string) { if (!v) throw new Error(m); }
Deno.test("valid verified input delegates once to atomic adapter", async () => {
  let calls = 0;
  const store: AtomicRedemptionStore = { async redeemAtomically(args) {
    calls++;
    assert(args.verifiedUserId === uid && args.tokenHashHex === hash, "incorrect args");
    return true;
  } };
  assert(await redeemWithAtomicStore(store, uid, hash) === "accepted", "valid request rejected");
  assert(calls === 1, "unexpected adapter calls");
});
Deno.test("invalid identity or digest never reaches database adapter", async () => {
  let calls = 0;
  const store: AtomicRedemptionStore = { async redeemAtomically() { calls++; return true; } };
  for (const [id, digest] of [[null, hash], ["bad", hash], [uid, ""], [uid, "G".repeat(64)] ] as const) {
    assert(await redeemWithAtomicStore(store, id, digest) === "denied", "invalid input accepted");
  }
  assert(calls === 0, "invalid input reached adapter");
});
Deno.test("adapter denial and failures are fail-closed", async () => {
  assert(await redeemWithAtomicStore({ async redeemAtomically() { return false; } }, uid, hash) === "denied", "denial leaked");
  assert(await redeemWithAtomicStore({ async redeemAtomically() { throw Error("private db details"); } }, uid, hash) === "denied", "error leaked");
});
