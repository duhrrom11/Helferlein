// Run locally with: deno test supabase/functions/_shared/trusted-person-authorization_test.ts
// No external services, no secrets, no emails, no database writes.
import { canAcceptInvitation, canTriggerAlarm } from "./trusted-person-authorization.ts";
const assert = (value: boolean, label: string) => { if (!value) throw new Error(label); };
const invitation = {
  invitation_id: "invite-1", vault_id: "v_test12345678",
  invited_by_user_id: "owner-a", intended_user_id: "person-a",
  accepted_by_user_id: null, accepted_at: null, revoked_at: null,
  expires_at: "2030-01-02T00:00:00.000Z",
};
const ownership = { vault_id: "v_test12345678", owner_user_id: "owner-a" };
const now = new Date("2030-01-01T00:00:00.000Z");

Deno.test("acceptance: valid matching invitation", () => {
  assert(canAcceptInvitation(invitation, ownership, "person-a", now).allowed, "valid invite rejected");
});
Deno.test("acceptance: deny wrong person, owner, vault, expiry and revoked", () => {
  const variants = [
    [invitation, ownership, "person-b", now],
    [invitation, { ...ownership, owner_user_id: "owner-b" }, "person-a", now],
    [invitation, { ...ownership, vault_id: "other" }, "person-a", now],
    [invitation, ownership, "person-a", new Date("2030-01-02T00:00:00.000Z")],
    [{ ...invitation, revoked_at: "2029-12-31T00:00:00Z" }, ownership, "person-a", now],
    [{ ...invitation, accepted_at: "2029-12-31T00:00:00Z", accepted_by_user_id: "person-a" }, ownership, "person-a", now],
  ] as const;
  for (const [i, o, user, time] of variants) {
    assert(!canAcceptInvitation(i, o, user, time).allowed, "invalid invite allowed");
  }
});
const accepted = { ...invitation, accepted_at: "2030-01-01T00:00:00Z", accepted_by_user_id: "person-a" };
const trusted = { vault_id: "v_test12345678", trusted_user_id: "person-a", invitation_id: "invite-1", status: "active" as const, revoked_at: null };
Deno.test("alarm: matching accepted active relationship", () => {
  assert(canTriggerAlarm(accepted, ownership, trusted, "person-a").allowed, "active trusted person rejected");
});
Deno.test("alarm: deny revoked, foreign, unaccepted and mismatched invitation", () => {
  assert(!canTriggerAlarm(accepted, ownership, { ...trusted, status: "revoked", revoked_at: "2030-01-02T00:00:00Z" }, "person-a").allowed, "revoked allowed");
  assert(!canTriggerAlarm(accepted, ownership, trusted, "person-b").allowed, "foreign person allowed");
  assert(!canTriggerAlarm(invitation, ownership, trusted, "person-a").allowed, "unaccepted allowed");
  assert(!canTriggerAlarm(accepted, ownership, { ...trusted, invitation_id: "other" }, "person-a").allowed, "mismatched invitation allowed");
  assert(!canTriggerAlarm(accepted, { ...ownership, owner_user_id: "owner-b" }, trusted, "person-a").allowed, "mismatched owner allowed");
});

Deno.test("deny missing records and malformed timestamps", () => {
  assert(!canAcceptInvitation(null, ownership, "person-a", now).allowed, "missing invitation allowed");
  assert(!canAcceptInvitation(invitation, null, "person-a", now).allowed, "missing ownership allowed");
  assert(!canAcceptInvitation({ ...invitation, expires_at: "not-a-date" }, ownership, "person-a", now).allowed, "invalid expiry allowed");
  assert(!canTriggerAlarm({ ...accepted, accepted_at: "not-a-date" }, ownership, trusted, "person-a").allowed, "invalid acceptance timestamp allowed");
  assert(!canTriggerAlarm(accepted, ownership, null, "person-a").allowed, "missing trusted record allowed");
});
