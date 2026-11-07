// Isolated composition tests: no Supabase connection, database, or email.
import { checkTrustedPersonForAlarm } from "./authorized-trusted-person.ts";
import type { AuthUserLookup } from "./verified-user.ts";
const uid = "744a36f2-a41c-4635-8dd1-0ef3e6f324d7";
const other = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const vaultId = "v_test12345678";
const auth: AuthUserLookup = {
  auth: { async getUser(token) {
    return { data: { user: token === "valid" ? { id: uid } : null }, error: null };
  } },
};
const records = {
  ownership: { vault_id: vaultId, owner_user_id: other },
  invitation: {
    invitation_id: "inv-1", vault_id: vaultId,
    invited_by_user_id: other, intended_user_id: uid,
    accepted_by_user_id: uid, accepted_at: "2030-01-01T00:00:00Z",
    revoked_at: null, expires_at: "2030-01-02T00:00:00Z",
  },
  trusted: {
    vault_id: vaultId, trusted_user_id: uid, invitation_id: "inv-1",
    status: "active" as const, revoked_at: null,
  },
};
const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};
Deno.test("allows verified active trusted person with matching records", async () => {
  const allowed = await checkTrustedPersonForAlarm(auth, "Bearer valid", vaultId, async () => records);
  assert(allowed, "expected authorized");
});
Deno.test("rejects missing or invalid token before reading records", async () => {
  let calls = 0;
  const loader = async () => { calls++; return records; };
  assert(!await checkTrustedPersonForAlarm(auth, null, vaultId, loader), "missing token allowed");
  assert(!await checkTrustedPersonForAlarm(auth, "Bearer invalid", vaultId, loader), "invalid token allowed");
  assert(calls === 0, "queried database without authentication");
});
Deno.test("rejects foreign vault, revoked person and lookup errors", async () => {
  assert(!await checkTrustedPersonForAlarm(auth, "Bearer valid", "v_foreign1234", async () => records), "foreign vault allowed");
  assert(!await checkTrustedPersonForAlarm(auth, "Bearer valid", vaultId, async () => ({
    ...records, trusted: { ...records.trusted, status: "revoked" as const, revoked_at: "2030-01-02T00:00:00Z" },
  })), "revoked allowed");
  assert(!await checkTrustedPersonForAlarm(auth, "Bearer valid", vaultId, async () => { throw new Error("database unavailable"); }), "lookup error allowed");
});
