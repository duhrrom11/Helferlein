/**
 * Staging-only composition of authentication and authorization.
 * NOT connected to a deployed endpoint; no database access or side effects.
 *
 * Security boundary: caller MUST load ownership, invitation and trusted-person
 * records from the server-side staging database using the verified user ID and
 * requested vault ID. Never populate these from request JSON.
 * This is a preliminary decision, NOT authorization for a database write:
 * check all invariants again atomically inside the transaction.
 */
import { getVerifiedUserId, type AuthUserLookup } from "./verified-user.ts";
import {
  canTriggerAlarm,
  type Invitation,
  type Ownership,
  type TrustedPerson,
} from "./trusted-person-authorization.ts";

export type TrustedPersonRecords = {
  ownership: Ownership | null;
  invitation: Invitation | null;
  trusted: TrustedPerson | null;
};

export type LoadTrustedPersonRecords = (
  vaultId: string,
  verifiedUserId: string,
) => Promise<TrustedPersonRecords>;

export async function checkTrustedPersonForAlarm(
  authClient: AuthUserLookup,
  authorizationHeader: string | null,
  vaultId: string,
  loadRecords: LoadTrustedPersonRecords,
): Promise<boolean> {
  const verifiedUserId = await getVerifiedUserId(authClient, authorizationHeader);
  if (!verifiedUserId || !/^v_[a-zA-Z0-9_-]{8,100}$/.test(vaultId)) return false;
  try {
    const records = await loadRecords(vaultId, verifiedUserId);
    if (
      !records.ownership ||
      !records.invitation ||
      !records.trusted ||
      records.ownership.vault_id !== vaultId ||
      records.invitation.vault_id !== vaultId ||
      records.trusted.vault_id !== vaultId
    ) return false;
    return canTriggerAlarm(
      records.invitation,
      records.ownership,
      records.trusted,
      verifiedUserId,
    ).allowed;
  } catch {
    return false;
  }
}
