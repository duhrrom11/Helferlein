'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('heir Edge endpoints require explicit, separate, server-side opt-in', () => {
  for (const [file, flag] of [
    ['supabase/functions/heir-invitations/index.ts', 'HEIR_INVITATIONS_ENABLED'],
    ['supabase/functions/heir-redemption/index.ts', 'HEIR_REDEMPTION_ENABLED']
  ]) {
    const source = read(file);
    assert.match(source, new RegExp('const configured = Deno\\.env\\.get\\("'+flag+'"\\) === "true" && !!\\(url && anonKey && serviceKey\\);'));
    assert.match(source, /auth\.getUser\(|handleRedemptionRequest\(/);
    assert.doesNotMatch(source, /Deno\.env\.get\("HEIR_.*ENABLED"\)\s*!==\s*"false"/);
  }
  const config = read('supabase/config.toml');
  assert.match(config, /\[functions\.heir-invitations\]\s*verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.heir-redemption\]\s*verify_jwt\s*=\s*true/);
});

test('owner metadata API cannot elevate to service role or return ciphertext', () => {
  const source = read('supabase/functions/vault-api/index.ts');
  assert.match(source, /supabase\.auth\.getUser\(token\)/);
  assert.match(source, /\.eq\("owner_user_id", data\.user\.id\)/);
  assert.match(source, /\.select\("vault_id, owner_user_id, updated_at"\)/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|service_role|\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
});

test('private heir tables remain denied to browser roles in SQL source', () => {
  const schema = read('supabase/migrations/20261112070000_heir_invitations_private_schema.sql');
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /revoke all/i);
  const rpc = read('supabase/migrations/20261112070001_heir_invitations_issue_revoke.sql');
  assert.match(rpc, /SECURITY DEFINER SET search_path = ''/);
  assert.match(rpc, /REVOKE ALL ON FUNCTION public\.issue_heir_invitation_atomic/);
  assert.match(rpc, /TO service_role/);
});
