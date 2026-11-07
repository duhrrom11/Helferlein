/**
 * Staging-only, side-effect-free preflight for invitation redemption.
 * NOT an endpoint and NOT sufficient to redeem a token.
 * A database transaction must atomically recheck these conditions, lock the
 * invitation, and create the trusted-person relationship exactly once.
 * Never log or return a raw invitation token.
 */
export type RedeemableInvitation = {
  intended_user_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function canRedeemInvitation(
  invitation: RedeemableInvitation | null,
  verifiedUserId: string | null,
  now: Date,
): boolean {
  if (!invitation || !verifiedUserId || !UUID.test(verifiedUserId)) return false;
  if (!Number.isFinite(now.getTime())) return false;
  if (invitation.accepted_at !== null || invitation.revoked_at !== null) return false;
  // Fail closed until invitation identity is bound to a verified account.
  if (invitation.intended_user_id !== verifiedUserId) return false;
  if (!ISO_UTC.test(invitation.expires_at)) return false;
  const expiry = Date.parse(invitation.expires_at);
  return Number.isFinite(expiry) && expiry > now.getTime();
}
