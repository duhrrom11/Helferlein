'use strict';
// Server-only PostgreSQL adapter. A single locking statement reads all rows
// under READ COMMITTED. No direct browser connection or service-role exposure.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^v_[A-Za-z0-9_-]{8,128}$/;
const QUERY = `select v.id as vault_id, v.owner_user_id, v.state,
  m.vault_id as membership_vault_id, m.heir_user_id, m.status,
  m.identity_verified, e.encrypted_envelope
from nachlass_v2.vaults v
join nachlass_v2.heir_memberships m on m.vault_id = v.id
join nachlass_v2.heir_envelopes e on e.vault_id = m.vault_id
 and e.heir_user_id = m.heir_user_id
where v.id = $1 and m.heir_user_id = $2
 and v.owner_user_id <> $2
 and v.state = 'RELEASED' and m.status = 'ACTIVE'
 and m.identity_verified is true
for share of v, m, e`;
function createHeirRepository(db) {
  if (!db || typeof db.query !== 'function') throw new TypeError('invalid_database');
  return Object.freeze({
    async readAuthorizedEnvelopeSnapshot({vaultId,userId}={}) {
      if (typeof vaultId !== 'string' || !ID.test(vaultId) ||
          typeof userId !== 'string' || !UUID.test(userId)) return null;
      const result = await db.query(QUERY,[vaultId,userId]);
      if (!result || !Array.isArray(result.rows) || result.rows.length !== 1) return null;
      const r=result.rows[0];
      if (r.vault_id!==vaultId || r.membership_vault_id!==vaultId ||
          r.heir_user_id!==userId || r.owner_user_id===userId || r.state!=='RELEASED' ||
          r.status!=='ACTIVE' || r.identity_verified!==true ||
          !r.encrypted_envelope || typeof r.encrypted_envelope!=='object' ||
          Array.isArray(r.encrypted_envelope)) return null;
      return {vault:{id:r.vault_id,ownerUserId:r.owner_user_id,state:r.state},
        membership:{vaultId:r.membership_vault_id,userId:r.heir_user_id,
          status:r.status,identityVerified:r.identity_verified},
        envelope:r.encrypted_envelope};
    }
  });
}
module.exports={createHeirRepository,QUERY};
