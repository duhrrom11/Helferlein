/** NONPRODUCTION. Exercise the real heir TypeScript service + PostgreSQL adapter
 * with a narrowly privileged CI account. No production URLs or test data.
 */
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { createHeirPgTransactionAdapter } from '../../supabase/functions/_shared/heir-pg-transaction-adapter.ts';
import { createHeirStagingBackend } from '../../supabase/functions/_shared/heir-staging-backend.ts';
import { createHeirSupabaseVerifier } from '../../supabase/functions/_shared/heir-supabase-auth.ts';

const OWNER='11111111-1111-4111-8111-111111111111';
const HEIR='22222222-2222-4222-8222-222222222222';
const OTHER='33333333-3333-4333-8333-333333333333';
const VAULT='v_abcdefgh';
const stop=(x)=>{throw new Error(x)};
function isolated() {
  if (process.env.HEIR_ISOLATED_TEST_DB !== '1' || process.env.PGDATABASE !== 'helferlein_heir_ci' ||
      process.env.PGHOST !== '127.0.0.1' || process.env.PGUSER !== 'heir_ci_backend' ||
      process.env.HEIR_CI_ROLE_PASSWORD !== 'test-server-role-local-only') stop('non-ephemeral postgres forbidden');
}
const fakeSupabase = {auth:{getUser: async token => ({
  data:{user: ({'trusted-owner-token':{id:OWNER},'trusted-heir-token':{id:HEIR},'trusted-other-token':{id:OTHER}})[token] ?? null},
  error:null,
})}};

async function main() {
  isolated();
  const verifier = createHeirSupabaseVerifier(fakeSupabase);
  assert.equal(await verifier('Bearer trusted-owner-token'), OWNER);
  assert.equal(await verifier('Bearer forged-token'), null);
  assert.equal(await verifier('bearer trusted-owner-token'), null);
  assert.equal(await verifier('Bearer trusted-owner-token extra'), null);
  // CI substitutes an auth.getUser test double. Real service wiring must provide
  // the actual Supabase Auth network client, not this deterministic fixture.
  const pool = new Pool({host:'127.0.0.1',port:5432,database:'helferlein_heir_ci',
    user:'heir_ci_backend',password:process.env.HEIR_CI_ROLE_PASSWORD,
    max:3,connectionTimeoutMillis:2000,statement_timeout:5000});
  try {
    const db=createHeirPgTransactionAdapter(pool);
    const service=createHeirStagingBackend(db,verifier);
    // Browser account cannot use the service role. Owner identity comes only
    // from getUser; user-supplied ownerUserId is not an authority.
    assert.equal((await service.createInvitation('Bearer trusted-heir-token', {vaultId:VAULT,intendedUserId:OTHER,ttlSeconds:3600})).ok,false);
    const created=await service.createInvitation('Bearer trusted-owner-token', {vaultId:VAULT,intendedUserId:OTHER,ttlSeconds:3600});
    assert.equal(created.ok,true, 'owner creates invitation using real SQL');
    assert.equal(typeof created.token,'string');
    assert.equal((await service.redeemInvitation('Bearer trusted-heir-token',created.token)).ok,false);
    assert.equal((await service.redeemInvitation('Bearer trusted-other-token',created.token)).ok,true);
    assert.equal((await service.redeemInvitation('Bearer trusted-other-token',created.token)).ok,false);
    const client=await pool.connect();
    let id;
    try {
      const invitations=await client.query('SELECT invitation_id,accepted_at,token_hash FROM heir_private.heir_invitations WHERE intended_user_id=$1',[OTHER]);
      assert.equal(invitations.rowCount,1);
      id=invitations.rows[0].invitation_id;
      assert.ok(invitations.rows[0].accepted_at);
      assert.equal(invitations.rows[0].token_hash.length,32);
      assert.ok(!invitations.rows[0].token_hash.includes(created.token));
    } finally {client.release()}
    // Non-existent/foreign owner cannot revoke. Real revocation updates current
    // assignment and blocks subsequent envelope operations via the same DB.
    assert.equal((await service.revokeInvitation('Bearer trusted-other-token',{vaultId:VAULT,invitationId:id})).ok,false);
    assert.equal((await service.revokeInvitation('Bearer trusted-owner-token',{vaultId:VAULT,invitationId:id})).ok,true);
    const rev=await pool.query('SELECT status,revoked_at FROM heir_private.heir_assignments WHERE owner_user_id=$1 AND heir_user_id=$2',[OWNER,OTHER]);
    assert.equal(rev.rows[0].status,'revoked');
    assert.ok(rev.rows[0].revoked_at);
    const envelope={vaultId:VAULT,heirUserId:OTHER,keyId:'55555555-5555-4555-8555-555555555555',
      publicKeyFingerprintHex:'f'.repeat(64),encapsulatedKeyHex:'a'.repeat(64),
      wrappedDekHex:'b'.repeat(96),suite:'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM'};
    assert.equal((await service.putEnvelope('Bearer trusted-owner-token',envelope)).ok,false);
    // Restrictive role MUST NOT gain write access to existing owner's snapshots.
    await assert.rejects(pool.query('UPDATE public.vault_cloud_snapshots SET encrypted_data=$1 WHERE owner_user_id=$2',[{},OWNER]), /permission denied|row-level security/i);
    // Ensure rollback: no duplicate attempt or unauthorized caller leaves an active assignment.
    const count=await pool.query('SELECT count(*)::int AS n FROM heir_private.heir_assignments WHERE status=$1',['active']);
    assert.equal(count.rows[0].n,0);
    console.log(JSON.stringify({status:'passed',engine:'PostgreSQL 17',service:'real TypeScript SqlBackend',
      actual_supabase_jwt:'not tested (auth.getUser test double)',checks:['restricted role','owner-only create','recipient-only single-use redeem','real transactional revoke','revoked envelope denied','snapshot ciphertext not writable']}));
  } finally {await pool.end();}
}
main().catch(err=>{console.error(JSON.stringify({status:'failed',reason:String(err)}));process.exitCode=1;});
