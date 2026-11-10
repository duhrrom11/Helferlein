'use strict';
// Static draft regression tests only: no database privileges or concurrency verified.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const original = fs.readFileSync(path.resolve(__dirname, '../../docs/sql-drafts/trusted_persons_staging_DRAFT.sql'), 'utf8');
const sql = s => s.replace(/--[^\n]*/g, ' ').replace(/\s+/g, ' ');
const checks = {
  reviewOnly: s => /REVIEW ONLY\. NOT A MIGRATION\. DO NOT EXECUTE\./.test(s),
  tokenDigest: s => /token_hash bytea NOT NULL UNIQUE CHECK \(octet_length\(token_hash\) = 32\)/i.test(sql(s)),
  acceptanceIdentity: s => /accepted_by_user_id = intended_user_id/i.test(sql(s)),
  mutuallyExclusiveStates: s => /accepted_at IS NULL OR revoked_at IS NULL/i.test(sql(s)),
  matchingInvitation: s => /FOREIGN KEY \(invitation_id, vault_id, trusted_user_id\) REFERENCES public\.trusted_person_invitations \(invitation_id, vault_id, intended_user_id\)/i.test(sql(s)),
  noDuplicateAssignment: s => /PRIMARY KEY \(vault_id, trusted_user_id\)/i.test(sql(s)),
  noDuplicateInvitation: s => /UNIQUE INDEX vault_trusted_persons_invitation_idx ON public\.vault_trusted_persons \(invitation_id\)/i.test(sql(s)),
  rlsBoth: s => ['trusted_person_invitations', 'vault_trusted_persons'].every(t => new RegExp('ALTER TABLE public\\.' + t + ' ENABLE ROW LEVEL SECURITY', 'i').test(sql(s))),
  forceRlsBoth: s => ['trusted_person_invitations', 'vault_trusted_persons'].every(t => new RegExp('ALTER TABLE public\\.' + t + ' FORCE ROW LEVEL SECURITY', 'i').test(sql(s))),
  revokeBoth: s => ['trusted_person_invitations', 'vault_trusted_persons'].every(t => new RegExp('REVOKE ALL ON TABLE public\\.' + t + ' FROM PUBLIC, anon, authenticated', 'i').test(sql(s))),
  noClientGrant: s => !/\bGRANT\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql(s)),
  noPolicy: s => !/\bCREATE\s+POLICY\b/i.test(sql(s)),
};
test('original schema draft retains twelve source safeguards', () => {
  assert.deepEqual(Object.entries(checks).filter(([, check]) => !check(original)).map(([name]) => name), []);
  assert.equal(Object.keys(checks).length, 12);
});
const mutations = [
  ['tokenDigest', 'octet_length(token_hash) = 32', 'octet_length(token_hash) = 16'],
  ['acceptanceIdentity', 'accepted_by_user_id = intended_user_id', 'accepted_by_user_id IS NOT NULL'],
  ['mutuallyExclusiveStates', 'accepted_at IS NULL OR revoked_at IS NULL', 'accepted_at IS NULL OR true'],
  ['matchingInvitation', 'FOREIGN KEY (invitation_id, vault_id, trusted_user_id)', 'FOREIGN KEY (invitation_id)'],
  ['noDuplicateAssignment', 'PRIMARY KEY (vault_id, trusted_user_id)', 'UNIQUE (vault_id)'],
  ['noDuplicateInvitation', 'ON public.vault_trusted_persons (invitation_id)', 'ON public.vault_trusted_persons (vault_id)'],
  ['rlsBoth', 'ALTER TABLE public.vault_trusted_persons ENABLE ROW LEVEL SECURITY;', 'SELECT 1;'],
  ['forceRlsBoth', 'ALTER TABLE public.trusted_person_invitations FORCE ROW LEVEL SECURITY;', 'SELECT 1;'],
  ['revokeBoth', 'REVOKE ALL ON TABLE public.vault_trusted_persons FROM PUBLIC, anon, authenticated;', 'SELECT 1;'],
  ['noClientGrant', '-- No RLS policies.', 'GRANT SELECT ON public.vault_trusted_persons TO authenticated;\n-- No RLS policies.'],
  ['noPolicy', '-- No RLS policies.', 'CREATE POLICY unsafe ON public.vault_trusted_persons USING (true);\n-- No RLS policies.'],
];
for (const [name, from, to] of mutations) {
  test('detects mutation: ' + name, () => {
    assert.ok(original.includes(from), 'mutation anchor missing: ' + name);
    assert.equal(checks[name](original.replace(from, to)), false);
  });
}
