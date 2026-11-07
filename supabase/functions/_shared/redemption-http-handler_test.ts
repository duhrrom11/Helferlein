import { handleRedemptionRequest } from "./redemption-http-handler.ts";
import type { AuthUserLookup } from "./verified-user.ts";
import type { AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";
const uid = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const auth: AuthUserLookup = { auth: { async getUser() { return { data: { user: { id: uid } }, error: null }; } } };
let calls = 0;
const store: AtomicRedemptionStore = { async redeemAtomically() { calls++; return true; } };
const url = "https://example.test/redeem";
const req = (body: string, headers: Record<string,string> = {}) =>
  new Request(url, { method: "POST", headers: { Authorization: "Bearer test.token", "Content-Type": "application/json", ...headers }, body });
function assert(v: boolean, msg: string) { if (!v) throw Error(msg); }
Deno.test("disabled by default even with valid token and auth", async () => {
  calls = 0;
  const r = await handleRedemptionRequest(req(JSON.stringify({ token: "a".repeat(64) })), { auth, store });
  assert(r.status === 503 && calls === 0, "disabled handler invoked store");
});
Deno.test("enabled handler rejects malformed and oversized bodies", async () => {
  calls = 0;
  const deps = { auth, store, enabled: true };
  assert((await handleRedemptionRequest(req("{"), deps)).status === 400, "malformed JSON");
  assert((await handleRedemptionRequest(req(JSON.stringify({ token: "bad" })), deps)).status === 400, "bad token");
  assert((await handleRedemptionRequest(req("x".repeat(513)), deps)).status === 413, "oversized body");
  assert(calls === 0, "bad input reached store");
});
Deno.test("enabled handler rejects unauthenticated and foreign origins", async () => {
  calls = 0;
  const deps = { auth, store, enabled: true };
  assert((await handleRedemptionRequest(req(JSON.stringify({ token: "a".repeat(64) }), { Origin: "https://evil.example" }), deps)).status === 403, "foreign origin");
  assert((await handleRedemptionRequest(req(JSON.stringify({ token: "a".repeat(64) }), { Authorization: "" }), deps)).status === 401, "missing auth");
  assert(calls === 0, "invalid auth/origin reached store");
});
Deno.test("enabled handler accepts verified token without returning it", async () => {
  calls = 0;
  const token = "a".repeat(64);
  const r = await handleRedemptionRequest(req(JSON.stringify({ token })), { auth, store, enabled: true });
  assert(r.status === 200 && calls === 1, "valid redemption failed");
  assert(!(await r.text()).includes(token), "plaintext token returned");
});

Deno.test("rejects non-JSON and extra fields without database access", async () => {
  calls = 0;
  const deps = { auth, store, enabled: true };
  const token = "a".repeat(64);
  assert((await handleRedemptionRequest(req(JSON.stringify({ token }), { "Content-Type": "text/plain" }), deps)).status === 415, "non-JSON accepted");
  assert((await handleRedemptionRequest(req(JSON.stringify({ token, userId: uid })), deps)).status === 400, "client identity field accepted");
  assert(calls === 0, "invalid payload reached store");
});
