/**
 * Staging-only, side-effect-free preflight for creating a trusted-person invite.
 * NOT wired to an endpoint. Never creates tokens, writes rows, or sends email.
 * The owner must come from verified Supabase Auth; ownership must be fetched
 * server-side. This is NOT sufficient to authorize a write: repeat ownership
 * and uniqueness checks atomically in the database transaction.
 */
import type { Ownership } from "./trusted-person-authorization.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VAULT_ID = /^v_[A-Za-z0-9_-]{8,100}$/;

export type InvitationRequest = {
  vaultId: string;
  intendedUserId: string;
};

export function canCreateInvitation(
  request: InvitationRequest,
  verifiedOwnerId: string | null,
  ownership: Ownership | null,
): boolean {
  if (!verifiedOwnerId || !UUID.test(verifiedOwnerId) || !ownership) return false;
  if (!VAULT_ID.test(request.vaultId) || !UUID.test(request.intendedUserId)) return false;
  // UUIDs are case-insensitive; reject self-invitation in either spelling.
  if (request.intendedUserId.toLowerCase() === verifiedOwnerId.toLowerCase()) return false;
  return ownership.vault_id === request.vaultId &&
    ownership.owner_user_id === verifiedOwnerId;
}
