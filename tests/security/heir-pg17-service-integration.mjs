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
    const adapter=createHeirPgTransactionAdapter(pool);
    const db={transaction: async (work) => {
      try { return await adapter.transaction(work); }
      catch (error) {
        // CI-only diagnostics; do not print SQL parameters, tokens, or ciphertext.
        console.error('isolated_transaction_error', error?.code ?? error?.message ?? 'unknown');
        throw error;
      }
    }};
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

    // Owner-only list: accepted invitation visible without revealing token or hash.
    const ownerList = await service.listInvitations('Bearer trusted-owner-token', { vaultId: VAULT });
    assert.equal(ownerList.ok, true, 'verified owner can inspect invitation metadata');
    assert.equal(ownerList.invitations.length, 1);
    assert.equal(ownerList.invitations[0].status, 'accepted');
    assert.equal(ownerList.invitations[0].intendedUserId, OTHER);
    assert.equal(typeof ownerList.invitations[0].invitationId, 'string');
    assert.match(ownerList.invitations[0].expiresAt, /^\\d{4}-\\d\\d-/);
    assert.equal(JSON.stringify(ownerList).includes(created.token), false);
    assert.equal(JSON.stringify(ownerList).includes('token_hash'), false);
    assert.equal((await service.listInvitations('Bearer trusted-other-token',{vaultId:VAULT})).ok,false);
    assert.equal((await service.listInvitations('Bearer trusted-owner-token',{vaultId:'v_badowner'})).ok,false);
    // Prepare a synthetic, verified recipient key in the isolated database.
    // Actual private-key proof and HPKE correctness are covered by separate tests.
    const keyId='77777777-7777-4777-8777-777777777777';
    await pool.query(`INSERT INTO heir_private.heir_public_keys
       (key_id,heir_user_id,suite,public_key,fingerprint,verified_at)
       VALUES ($1,$2,'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM',decode(repeat('c',64),'hex'),decode(repeat('f',64),'hex'),clock_timestamp())`,[keyId,OTHER]);
    const envelope={vaultId:VAULT,heirUserId:OTHER,keyId,
      publicKeyFingerprintHex:'f'.repeat(64),encapsulatedKeyHex:'a'.repeat(64),
      wrappedDekHex:'b'.repeat(96),suite:'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM'};
    assert.equal((await service.putEnvelope('Bearer trusted-owner-token',{...envelope,publicKeyFingerprintHex:'e'.repeat(64)})).ok,false);
    assert.equal((await service.putEnvelope('Bearer trusted-owner-token',envelope)).ok,true,
      'active and fingerprint-verified recipient receives encrypted envelope');
    const beforeRevoke=await pool.query('SELECT revoked_at,octet_length(wrapped_dek) AS size FROM heir_private.heir_envelopes WHERE owner_user_id=$1 AND heir_user_id=$2',[OWNER,OTHER]);
    assert.equal(beforeRevoke.rowCount,1);
    assert.equal(beforeRevoke.rows[0].revoked_at,null);
    assert.equal(beforeRevoke.rows[0].size,48);
    // Foreign identity may not revoke; current owner atomically revokes assignment + envelope.
    assert.equal((await service.revokeInvitation('Bearer trusted-other-token',{vaultId:VAULT,invitationId:id})).ok,false);
    assert.equal((await service.revokeInvitation('Bearer trusted-owner-token',{vaultId:VAULT,invitationId:id})).ok,true);
    const rev=await pool.query('SELECT status,revoked_at FROM heir_private.heir_assignments WHERE owner_user_id=$1 AND heir_user_id=$2',[OWNER,OTHER]);
    assert.equal(rev.rows[0].status,'revoked');
    assert.ok(rev.rows[0].revoked_at);
    const revokedList = await service.listInvitations('Bearer trusted-owner-token',{vaultId:VAULT});
    assert.equal(revokedList.ok,true);
    assert.equal(revokedList.invitations[0].status,'revoked');
    const afterRevoke=await pool.query('SELECT revoked_at FROM heir_private.heir_envelopes WHERE owner_user_id=$1 AND heir_user_id=$2',[OWNER,OTHER]);
    assert.ok(afterRevoke.rows[0].revoked_at);
    assert.equal((await service.putEnvelope('Bearer trusted-owner-token',envelope)).ok,false);
    // Restrictive role MUST NOT gain write access to existing owner's snapshots.
    await assert.rejects(pool.query('UPDATE public.vault_cloud_snapshots SET encrypted_data=$1 WHERE owner_user_id=$2',[{},OWNER]), /permission denied|row-level security/i);
    // Ensure rollback: no duplicate attempt or unauthorized caller leaves an active assignment.
    const count=await pool.query('SELECT count(*)::int AS n FROM heir_private.heir_assignments WHERE status=$1',['active']);
    assert.equal(count.rows[0].n,0);
    console.log(JSON.stringify({status:'passed',engine:'PostgreSQL 17',service:'real TypeScript SqlBackend',
      actual_supabase_jwt:'not tested (auth.getUser test double)',checks:['restricted role','owner-only create','recipient-only single-use redeem','real transactional revoke','verified envelope stored','revoked envelope denied','snapshot ciphertext not writable','owner-only list hides tokens','list shows accepted and revoked']}));
  } finally {await pool.end();}
}
main().catch(err=>{console.error(JSON.stringify({status:'failed',reason:String(err)}));process.exitCode=1;});
