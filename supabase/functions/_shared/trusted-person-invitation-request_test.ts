// Pure authorization tests: no network, credentials, database or email.
import { canCreateInvitation } from "./trusted-person-invitation-request.ts";
const owner = "744a36f2-a41c-4635-8dd1-0ef3e6f324d7";
const person = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const vaultId = "v_test12345678";
const ownership = { vault_id: vaultId, owner_user_id: owner };
const request = { vaultId, intendedUserId: person };
const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("valid owner can request invitation for another account", () => {
  assert(canCreateInvitation(request, owner, ownership), "valid owner rejected");
});

Deno.test("reject missing, foreign or mismatched ownership", () => {
  assert(!canCreateInvitation(request, null, ownership), "missing login allowed");
  assert(!canCreateInvitation(request, person, ownership), "foreign owner allowed");
  assert(!canCreateInvitation(request, owner, null), "missing ownership allowed");
  assert(!canCreateInvitation(request, owner, { ...ownership, vault_id: "v_foreign1234" }), "foreign vault allowed");
});

Deno.test("reject self invitation, malformed IDs and empty values", () => {
  assert(!canCreateInvitation({ ...request, intendedUserId: owner }, owner, ownership), "self invitation allowed");
  assert(!canCreateInvitation({ ...request, intendedUserId: "invalid" }, owner, ownership), "invalid person ID allowed");
  assert(!canCreateInvitation({ ...request, vaultId: "" }, owner, ownership), "empty vault allowed");
  assert(!canCreateInvitation(request, "invalid", ownership), "invalid owner ID allowed");
});
