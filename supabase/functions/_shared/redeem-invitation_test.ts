import { canRedeemInvitation } from "./redeem-invitation.ts";

const user = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const other = "744a36f2-a41c-4635-8dd1-0ef3e6f324d7";
const now = new Date("2026-11-07T12:00:00.000Z");
const invitation = {
  intended_user_id: user,
  expires_at: "2026-11-08T12:00:00.000Z",
  accepted_at: null,
  revoked_at: null,
};
function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

Deno.test("accepts valid, unused, unexpired invitation for verified user", () => {
  assert(canRedeemInvitation(invitation, user, now), "valid invitation rejected");
});

Deno.test("rejects missing or unverified user and missing invitation", () => {
  assert(!canRedeemInvitation(null, user, now), "missing invitation accepted");
  assert(!canRedeemInvitation(invitation, null, now), "anonymous user accepted");
  assert(!canRedeemInvitation(invitation, "not-a-uuid", now), "malformed user accepted");
  assert(!canRedeemInvitation(invitation, other, now), "wrong user accepted");
  assert(!canRedeemInvitation({ ...invitation, intended_user_id: null }, user, now), "unbound invitation accepted");
});

Deno.test("rejects previously accepted or revoked invitations", () => {
  assert(!canRedeemInvitation({ ...invitation, accepted_at: "2026-11-07T11:00:00Z" }, user, now), "used invitation accepted");
  assert(!canRedeemInvitation({ ...invitation, revoked_at: "2026-11-07T11:00:00Z" }, user, now), "revoked invitation accepted");
});

Deno.test("rejects expired invitations including exact expiration boundary", () => {
  assert(!canRedeemInvitation({ ...invitation, expires_at: "2026-11-07T11:59:59Z" }, user, now), "expired invitation accepted");
  assert(!canRedeemInvitation({ ...invitation, expires_at: "2026-11-07T12:00:00Z" }, user, now), "boundary invitation accepted");
});

Deno.test("rejects invalid expiry or invalid current time", () => {
  for (const expiry of ["", "tomorrow", "2026-13-07T12:00:00Z", "2026-11-08"]) {
    assert(!canRedeemInvitation({ ...invitation, expires_at: expiry }, user, now), "invalid expiry accepted");
  }
  assert(!canRedeemInvitation(invitation, user, new Date(NaN)), "invalid now accepted");
});
