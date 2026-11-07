/**
 * Staging-only, pure model of a locked invitation redemption decision.
 * This function does NOT lock rows, transact, authorize an RPC, or write data.
 * A future database implementation MUST repeat every check atomically.
 */
import { canRedeemInvitation, type RedeemableInvitation } from "./redeem-invitation.ts";

export type RedemptionSnapshot = {
  invitation: (RedeemableInvitation & {
    vault_id: string;
    invited_by_user_id: string;
  }) | null;
  ownership: { vault_id: string; owner_user_id: string } | null;
  trustedPersonExists: boolean;
};

export function canCommitInvitationRedemption(
  snapshot: RedemptionSnapshot,
  verifiedUserId: string | null,
  now: Date,
): boolean {
  const { invitation, ownership, trustedPersonExists } = snapshot;
  if (!invitation || !ownership || trustedPersonExists) return false;
  if (!canRedeemInvitation(invitation, verifiedUserId, now)) return false;
  // A changed or missing owner invalidates the invitation; fail closed.
  return invitation.vault_id === ownership.vault_id &&
    invitation.invited_by_user_id === ownership.owner_user_id;
}
