import { redeemVerifiedInvitation } from "./verified-redemption-request.ts";
import type { AuthUserLookup } from "./verified-user.ts";
import type { AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";
const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const token = "a".repeat(64);
function assert(v: boolean, msg: string) { if (!v) throw Error(msg); }
const auth: AuthUserLookup = { auth: { async getUser() { return { data: { user: { id: uid } }, error: null }; } } };
Deno.test("verified user and valid token delegate only digest to store", async () => {
  let calls = 0;
  const store: AtomicRedemptionStore = { async redeemAtomically(args) {
    calls++;
    assert(args.verifiedUserId === uid, "incorrect user");
    assert(args.tokenHashHex !== token && /^[a-f0-9]{64}$/.test(args.tokenHashHex), "raw token forwarded");
    return "accepted" as const;
  } };
  assert(await redeemVerifiedInvitation(auth, store, "Bearer test.token", token, async () => "allowed") === "accepted", "valid denied");
  assert(calls === 1, "wrong call count");
});
Deno.test("missing auth and invalid token never reach database", async () => {
  let calls = 0;
  const store: AtomicRedemptionStore = { async redeemAtomically() { calls++; return "accepted" as const; } };
  assert(await redeemVerifiedInvitation(auth, store, null, token, async () => "allowed") === "denied", "anonymous accepted");
  assert(await redeemVerifiedInvitation(auth, store, "Bearer test.token", "invalid", async () => "allowed") === "denied", "invalid token accepted");
  assert(calls === 0, "store called");
});
Deno.test("auth lookup errors and store failures fail closed", async () => {
  const broken: AuthUserLookup = { auth: { async getUser() { throw Error("auth unavailable"); } } };
  const store: AtomicRedemptionStore = { async redeemAtomically() { throw Error("private database error"); } };
  assert(await redeemVerifiedInvitation(broken, store, "Bearer test.token", token, async () => "allowed") === "denied", "auth error accepted");
  assert(await redeemVerifiedInvitation(auth, store, "Bearer test.token", token, async () => "allowed") === "unavailable", "db error accepted");
});
