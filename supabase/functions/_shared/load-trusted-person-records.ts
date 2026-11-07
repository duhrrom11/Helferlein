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

async function one<T>(query: Query): Promise<T | null> {
  const result = await query.maybeSingle();
  if (result.error || !result.data || typeof result.data !== "object") {
    throw new Error("lookup_failed");
  }
  return result.data as T;
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
    );
    const trusted = await one<TrustedPerson>(
      db.from("vault_trusted_persons")
        .select("vault_id,trusted_user_id,invitation_id,status,revoked_at")
        .eq("vault_id", vaultId)
        .eq("trusted_user_id", verifiedUserId),
    );
    if (!ownership || !trusted) throw new Error("lookup_failed");
    const invitation = await one<Invitation>(
      db.from("trusted_person_invitations")
        .select("invitation_id,vault_id,invited_by_user_id,intended_user_id,accepted_by_user_id,accepted_at,revoked_at,expires_at")
        .eq("invitation_id", trusted.invitation_id),
    );
    if (!invitation) throw new Error("lookup_failed");
    return { ownership, trusted, invitation };
  };
}
