/**
 * Helferlein staging-only authorization decision helper.
 * Pure function: no database, no network, no side effects, no secrets.
 * NOT wired to an endpoint. The caller MUST obtain each record from a
 * trusted server-side query and verify the JWT via Supabase auth.getUser.
 */
export type Invitation = {
  invitation_id: string;
  vault_id: string;
  invited_by_user_id: string;
  intended_user_id: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
};
export type Ownership = { vault_id: string; owner_user_id: string };
export type TrustedPerson = {
  vault_id: string;
  trusted_user_id: string;
  invitation_id: string;
  status: "active" | "revoked";
  revoked_at: string | null;
};
export type Decision = { allowed: boolean; reason: "ok" | "denied" };

/** Validates consistency only; NOT a substitute for atomic DB checks. */
export function canAcceptInvitation(
  invitation: Invitation | null,
  ownership: Ownership | null,
  verifiedUserId: string | null,
  serverNow: Date,
): Decision {
  if (!invitation || !ownership || !verifiedUserId) return { allowed: false, reason: "denied" };
  const expiry = Date.parse(invitation.expires_at);
  if (
    !Number.isFinite(expiry) || !Number.isFinite(serverNow.getTime()) ||
    expiry <= serverNow.getTime() ||
    invitation.revoked_at !== null ||
    invitation.accepted_at !== null ||
    invitation.accepted_by_user_id !== null ||
    invitation.vault_id !== ownership.vault_id ||
    invitation.invited_by_user_id !== ownership.owner_user_id ||
    invitation.intended_user_id !== verifiedUserId
  ) return { allowed: false, reason: "denied" };
  return { allowed: true, reason: "ok" };
}

/** Check an already accepted, non-revoked relationship for alarm eligibility. */
export function canTriggerAlarm(
  invitation: Invitation | null,
  ownership: Ownership | null,
  trusted: TrustedPerson | null,
  verifiedUserId: string | null,
): Decision {
  if (!invitation || !ownership || !trusted || !verifiedUserId) return { allowed: false, reason: "denied" };
  if (
    invitation.vault_id !== ownership.vault_id ||
    invitation.invited_by_user_id !== ownership.owner_user_id ||
    invitation.vault_id !== trusted.vault_id ||
    invitation.invitation_id !== trusted.invitation_id ||
    invitation.intended_user_id !== verifiedUserId ||
    invitation.accepted_by_user_id !== verifiedUserId ||
    invitation.accepted_at === null ||
    !Number.isFinite(Date.parse(invitation.accepted_at)) ||
    invitation.revoked_at !== null ||
    trusted.trusted_user_id !== verifiedUserId ||
    trusted.status !== "active" ||
    trusted.revoked_at !== null
  ) return { allowed: false, reason: "denied" };
  return { allowed: true, reason: "ok" };
}
