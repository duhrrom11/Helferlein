#!/usr/bin/env python3
"""Actual PostgreSQL 17 two-session safety gate; ephemeral CI database ONLY.

Requires psycopg[binary], HEIR_ISOLATED_TEST_DB=1, PGDATABASE=helferlein_heir_ci,
PGHOST=127.0.0.1 and standalone PostgreSQL 17. No production credentials.
Tests the existing REVIEW_ONLY DDL, locks, races and browser-role grants, not
an operational heir release. Never grants any heir access.
"""
import json
import ipaddress
import os
import sys
from concurrent.futures import ThreadPoolExecutor
import psycopg
from psycopg import errors

OWNER = '11111111-1111-4111-8111-111111111111'
HEIR = '22222222-2222-4222-8222-222222222222'
INV = '44444444-4444-4444-8444-444444444444'
KEY = '55555555-5555-4555-8555-555555555555'
CHALLENGE = '66666666-6666-4666-8666-666666666666'


def conn():
    return psycopg.connect(host=os.environ['PGHOST'], port=os.getenv('PGPORT', '5432'),
                           dbname=os.environ['PGDATABASE'], user=os.getenv('PGUSER','postgres'),
                           password=os.environ['PGPASSWORD'], autocommit=False)


def check_isolation():
    if (os.getenv('HEIR_ISOLATED_TEST_DB') != '1' or os.getenv('PGHOST') != '127.0.0.1' or os.getenv('PGDATABASE') != 'helferlein_heir_ci'):
        raise RuntimeError('Refusing non-ephemeral PostgreSQL connection')
    with conn() as c:
        if c.execute('SHOW server_version_num').fetchone()[0][:2] != '17':
            raise RuntimeError('PostgreSQL 17 required')
        address = c.execute('SELECT inet_server_addr()::text').fetchone()[0]
        if address is None or not ipaddress.ip_interface(address).ip.is_private:
            raise RuntimeError('Public or unverified PostgreSQL endpoint forbidden')


def check_roles():
    with conn() as c:
        t = c.execute("""SELECT tablename FROM pg_tables WHERE schemaname='heir_private' ORDER BY tablename""").fetchall()
        assert {v[0] for v in t} == {'heir_invitations','heir_assignments','heir_public_keys','heir_envelopes','heir_key_proofs','heir_release_cases','heir_http_limits'}
        for name, forced, enabled in c.execute("""SELECT c.relname,c.relforcerowsecurity,c.relrowsecurity FROM pg_class c
          JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='heir_private' AND c.relkind='r'"""):
            assert forced and enabled, (name, 'RLS not forced')
        for role in ('anon','authenticated'):
            assert c.execute('SELECT has_schema_privilege(%s,%s,%s)',(role,'heir_private','USAGE')).fetchone()[0] is False
            for table, in t:
                assert c.execute('SELECT has_table_privilege(%s,%s,%s)',(role,f'heir_private.{table}','SELECT,INSERT,UPDATE,DELETE')).fetchone()[0] is False
            c.execute(f'SET ROLE {role}')
            try:
                c.execute('SELECT * FROM heir_private.heir_invitations')
                raise AssertionError(f'{role} bypassed private schema')
            except errors.InsufficientPrivilege:
                c.rollback()
                # Roles also must not read even if they know another user's UUID.
        # Exactly one reviewed SECURITY DEFINER gate may lock auth.sessions.
        # It cannot disclose session fields; PUBLIC/anon/authenticated lack EXECUTE.
        privileged = c.execute("""SELECT p.proname, p.pronargs, p.proargtypes::text,
                        p.proconfig,pg_get_userbyid(p.proowner)
                    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                    WHERE n.nspname='heir_private' AND p.prosecdef""").fetchall()
        assert privileged == [('heir_lock_active_session', 2, '2950 2950', ['search_path=""'], 'postgres')], privileged
        for role in ('anon','authenticated'):
            assert c.execute('SELECT has_function_privilege(%s,%s,%s)',
                (role,'heir_private.heir_lock_active_session(uuid,uuid)','EXECUTE')).fetchone()[0] is False
        assert c.execute('SELECT has_function_privilege(%s,%s,%s)',
            ('heir_ci_backend','heir_private.heir_lock_active_session(uuid,uuid)','EXECUTE')).fetchone()[0] is True
        assert c.execute('SELECT has_table_privilege(%s,%s,%s)',
            ('heir_ci_backend','auth.sessions','UPDATE,DELETE')).fetchone()[0] is False


def seed():
    with conn() as c:
        c.execute("""INSERT INTO heir_private.heir_invitations
        (invitation_id,owner_user_id,vault_id,intended_user_id,token_hash,expires_at)
        VALUES (%s,%s,'v_abcdefgh',%s,decode(repeat('a',64),'hex'),clock_timestamp()+interval '1 day')""",(INV,OWNER,HEIR))
        c.execute("""INSERT INTO heir_private.heir_public_keys
        (key_id,heir_user_id,suite,public_key,fingerprint,verified_at)
        VALUES (%s,%s,'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM',decode(repeat('a',64),'hex'),decode(repeat('b',64),'hex'),clock_timestamp())""",(KEY,HEIR))
        c.execute("""INSERT INTO heir_private.heir_key_proofs
        (challenge_id,key_id,heir_user_id,expected_hash,expires_at)
        VALUES (%s,%s,%s,decode(repeat('c',64),'hex'),clock_timestamp()+interval '5 min')""",(CHALLENGE,KEY,HEIR))
        c.execute("""INSERT INTO heir_private.heir_release_cases
        (owner_user_id,triggered_by_user_id,state,triggered_at,grace_until)
        VALUES (%s,%s,'grace',clock_timestamp()-interval '25 hours',clock_timestamp()-interval '1 hour')""",(OWNER,HEIR))


def lock_timeout_other_session(first, second, lock_query, other_query):
    first.execute("SET LOCAL lock_timeout='2000ms'")
    first.execute(lock_query)
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(lambda: second.execute("SET LOCAL lock_timeout='250ms'").execute(other_query))
        try:
            future.result(timeout=3)
            raise AssertionError('second session should have waited and failed on row lock')
        except errors.LockNotAvailable:
            second.rollback()


def two_sessions():
    with conn() as a, conn() as b:
        assert a.info.backend_pid != b.info.backend_pid, 'not independent sessions'
        # Lock ordering: owner row before invitation row. Two genuine sessions.
        lock_timeout_other_session(a,b,
            f"SELECT * FROM public.vault_cloud_snapshots WHERE owner_user_id='{OWNER}' FOR UPDATE",
            f"SELECT * FROM public.vault_cloud_snapshots WHERE owner_user_id='{OWNER}' FOR UPDATE")
        a.commit()
        assert b.execute('SELECT 1').fetchone()[0] == 1
        b.rollback()

        lock_timeout_other_session(a,b,
            f"SELECT * FROM heir_private.heir_invitations WHERE invitation_id='{INV}' FOR UPDATE",
            f"UPDATE heir_private.heir_invitations SET revoked_at=clock_timestamp() WHERE invitation_id='{INV}'")
        # Atomic redemption while other session is blocked: after commit, cannot revoke an accepted invitation.
        a.execute("UPDATE heir_private.heir_invitations SET accepted_at=clock_timestamp() WHERE invitation_id=%s AND revoked_at IS NULL",(INV,))
        a.execute("INSERT INTO heir_private.heir_assignments(owner_user_id,heir_user_id,invitation_id) VALUES (%s,%s,%s)",(OWNER,HEIR,INV))
        a.commit()
        assert b.execute("UPDATE heir_private.heir_invitations SET revoked_at=clock_timestamp() WHERE invitation_id=%s AND accepted_at IS NULL",(INV,)).rowcount == 0
        b.rollback()

        # Envelope is revoked in same transaction as assignment. Concurrent writer must re-check status.
        a.execute("INSERT INTO heir_private.heir_envelopes(owner_user_id,heir_user_id,key_id,assignment_version,suite,encapsulated_key,wrapped_dek) VALUES (%s,%s,%s,1,'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM',decode(repeat('a',64),'hex'),decode(repeat('b',96),'hex'))",(OWNER,HEIR,KEY))
        a.commit()
        lock_timeout_other_session(a,b,
            f"SELECT * FROM heir_private.heir_assignments WHERE owner_user_id='{OWNER}' AND heir_user_id='{HEIR}' FOR UPDATE",
            f"SELECT * FROM heir_private.heir_assignments WHERE owner_user_id='{OWNER}' AND heir_user_id='{HEIR}' FOR UPDATE")
        a.execute("UPDATE heir_private.heir_assignments SET status='revoked',revoked_at=clock_timestamp(),version=version+1 WHERE owner_user_id=%s AND heir_user_id=%s",(OWNER,HEIR))
        a.execute("UPDATE heir_private.heir_envelopes SET revoked_at=clock_timestamp() WHERE owner_user_id=%s AND heir_user_id=%s",(OWNER,HEIR))
        a.commit()
        assert b.execute("SELECT status FROM heir_private.heir_assignments WHERE owner_user_id=%s AND heir_user_id=%s FOR UPDATE",(OWNER,HEIR)).fetchone()[0] == 'revoked'
        assert b.execute("SELECT revoked_at IS NOT NULL FROM heir_private.heir_envelopes WHERE owner_user_id=%s",(OWNER,)).fetchone()[0]
        b.rollback()

        # A proof challenge can be consumed only once even with two real sessions.
        lock_timeout_other_session(a,b,
            f"SELECT * FROM heir_private.heir_key_proofs WHERE challenge_id='{CHALLENGE}' FOR UPDATE",
            f"UPDATE heir_private.heir_key_proofs SET consumed_at=clock_timestamp() WHERE challenge_id='{CHALLENGE}' AND consumed_at IS NULL")
        assert a.execute("UPDATE heir_private.heir_key_proofs SET consumed_at=clock_timestamp() WHERE challenge_id=%s AND consumed_at IS NULL",(CHALLENGE,)).rowcount == 1
        a.commit()
        assert b.execute("UPDATE heir_private.heir_key_proofs SET consumed_at=clock_timestamp() WHERE challenge_id=%s AND consumed_at IS NULL",(CHALLENGE,)).rowcount == 0
        b.rollback()

        # Grace expiry never changes state to 'released': schema permits only grace/cancelled.
        assert a.execute("SELECT grace_until<=clock_timestamp(),state FROM heir_private.heir_release_cases WHERE owner_user_id=%s",(OWNER,)).fetchone() == (True,'grace')
        a.execute("UPDATE heir_private.heir_release_cases SET state='cancelled',cancelled_at=clock_timestamp() WHERE owner_user_id=%s",(OWNER,))
        a.commit()
        try:
            b.execute("UPDATE heir_private.heir_release_cases SET state='released' WHERE owner_user_id=%s",(OWNER,))
            raise AssertionError('release state escaped check constraint')
        except errors.CheckViolation:
            b.rollback()
        assert a.execute("SELECT state FROM heir_private.heir_release_cases WHERE owner_user_id=%s",(OWNER,)).fetchone()[0] == 'cancelled'


def main():
    check_isolation()
    check_roles()
    seed()
    two_sessions()
    print(json.dumps({'status':'passed','engine':'PostgreSQL 17','sessions':2,
                      'checks':['private role grants and FORCE RLS','owner lock contention',
                      'acceptance vs revoke','revocation vs envelope','one-use key proof',
                      'grace cannot release']}))

if __name__ == '__main__':
    try: main()
    except Exception as exc:
        print(json.dumps({'status':'failed','reason':f'{type(exc).__name__}: {exc}'}),file=sys.stderr)
        raise
