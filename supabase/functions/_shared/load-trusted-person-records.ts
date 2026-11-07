/**
 * Staging-only database lookup adapter. Not deployed or wired to any endpoint.
 * Must be called only AFTER verified Supabase Auth and with a server-side
 * staging admin client. Never expose service-role credentials to browsers.
 * Read-only. This check is NOT sufficient to authorize writes: repeat checks
 * atomically in a transaction before any state change.
 */
import type { LoadTrustedPersonRecords } from "./authorized-trusted-person.ts";
import type { Invitation, Ownership, TrustedPerson } from "./trusted-person-authorization.ts";

type QueryResult<T> = { data: T | null; error: unknown | null };
type Query = {
  select(columns: string): Query;
  eq(column: string, value: string): Query;
  maybeSingle(): Promise<QueryResult<unknown>>;
};
export type StagingReadClient = { from(table: string): Query };

type Validator<T> = (value: unknown) => value is T;
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const nullableString = (v: unknown): v is string | null => v === null || nonempty(v);
const ownershipValid: Validator<Ownership> = (v): v is Ownership =>
  record(v) && nonempty(v.vault_id) && nonempty(v.owner_user_id);
const trustedValid: Validator<TrustedPerson> = (v): v is TrustedPerson =>
  record(v) && nonempty(v.vault_id) && nonempty(v.trusted_user_id) &&
  nonempty(v.invitation_id) && (v.status === "active" || v.status === "revoked") &&
  nullableString(v.revoked_at);
const invitationValid: Validator<Invitation> = (v): v is Invitation =>
  record(v) && nonempty(v.invitation_id) && nonempty(v.vault_id) &&
  nonempty(v.invited_by_user_id) && nonempty(v.intended_user_id) &&
  nullableString(v.accepted_by_user_id) && nullableString(v.accepted_at) &&
  nullableString(v.revoked_at) && nonempty(v.expires_at);

async function one<T>(query: Query, validate: Validator<T>): Promise<T> {
  const result = await query.maybeSingle();
  if (result.error || !validate(result.data)) throw new Error("lookup_failed");
  return result.data;
}

/** Never return partial records if any lookup fails. */
export function createTrustedPersonRecordLoader(
  db: StagingReadClient,
): LoadTrustedPersonRecords {
  return async (vaultId, verifiedUserId) => {
    const ownership = await one<Ownership>(
      db.from("vault_ownership")
        .select("vault_id,owner_user_id")
        .eq("vault_id", vaultId),
      ownershipValid,
    );
    const trusted = await one<TrustedPerson>(
      db.from("vault_trusted_persons")
        .select("vault_id,trusted_user_id,invitation_id,status,revoked_at")
        .eq("vault_id", vaultId)
        .eq("trusted_user_id", verifiedUserId),
      trustedValid,
    );
    if (!ownership || !trusted) throw new Error("lookup_failed");
    const invitation = await one<Invitation>(
      db.from("trusted_person_invitations")
        .select("invitation_id,vault_id,invited_by_user_id,intended_user_id,accepted_by_user_id,accepted_at,revoked_at,expires_at")
        .eq("invitation_id", trusted.invitation_id),
      invitationValid,
    );
    if (!invitation) throw new Error("lookup_failed");
    return { ownership, trusted, invitation };
  };
}
