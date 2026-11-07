import { canCommitInvitationRedemption, type RedemptionSnapshot } from "./redemption-transaction-preflight.ts";

const owner = "744a36f2-a41c-4635-8dd1-0ef3e6f324d7";
const person = "4d9a6129-dcfb-4f93-a83e-0ac791636742";
const vaultId = "v_test12345678";
const now = new Date("2026-11-07T12:00:00Z");
const valid: RedemptionSnapshot = {
  invitation: {
    vault_id: vaultId,
    invited_by_user_id: owner,
    intended_user_id: person,
    expires_at: "2026-11-08T12:00:00Z",
    accepted_at: null,
    revoked_at: null,
  },
  ownership: { vault_id: vaultId, owner_user_id: owner },
  trustedPersonExists: false,
};
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}
Deno.test("valid snapshot passes preflight", () => {
  assert(canCommitInvitationRedemption(valid, person, now), "valid snapshot rejected");
});
Deno.test("rejects missing invitation or ownership", () => {
  assert(!canCommitInvitationRedemption({ ...valid, invitation: null }, person, now), "missing invitation accepted");
  assert(!canCommitInvitationRedemption({ ...valid, ownership: null }, person, now), "missing ownership accepted");
});
Deno.test("rejects existing trusted-person assignment", () => {
  assert(!canCommitInvitationRedemption({ ...valid, trustedPersonExists: true }, person, now), "existing assignment accepted");
});
Deno.test("rejects changed owner or foreign vault", () => {
  assert(!canCommitInvitationRedemption({ ...valid, ownership: { vault_id: vaultId, owner_user_id: person } }, person, now), "owner change accepted");
  assert(!canCommitInvitationRedemption({ ...valid, ownership: { vault_id: "v_foreign1234", owner_user_id: owner } }, person, now), "foreign vault accepted");
});
Deno.test("rejects wrong identity, used, revoked or expired invitation", () => {
  assert(!canCommitInvitationRedemption(valid, owner, now), "wrong identity accepted");
  assert(!canCommitInvitationRedemption({ ...valid, invitation: { ...valid.invitation!, accepted_at: "2026-11-07T11:00:00Z" } }, person, now), "used invitation accepted");
  assert(!canCommitInvitationRedemption({ ...valid, invitation: { ...valid.invitation!, revoked_at: "2026-11-07T11:00:00Z" } }, person, now), "revoked invitation accepted");
  assert(!canCommitInvitationRedemption({ ...valid, invitation: { ...valid.invitation!, expires_at: "2026-11-07T12:00:00Z" } }, person, now), "expired invitation accepted");
});
