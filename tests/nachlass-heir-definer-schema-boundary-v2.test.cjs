'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../docs/nachlass-v2-heir-definer-review.sql'),'utf8');
const body=sql.split('AS $function$')[1]?.split('$function$;')[0];
function safe(source){
 return !!source &&
  /FROM\s+nachlass_v2\.vaults\s+AS\s+v\b/i.test(source) &&
  /JOIN\s+nachlass_v2\.heir_memberships\s+AS\s+m\b/i.test(source) &&
  /JOIN\s+nachlass_v2\.heir_envelopes\s+AS\s+e\b/i.test(source) &&
  /e\.vault_id\s*=\s*m\.vault_id/i.test(source) &&
  /e\.heir_user_id\s*=\s*m\.heir_user_id/i.test(source) &&
  /m\.vault_id\s*=\s*v\.id/i.test(source) &&
  /FOR\s+SHARE\s+OF\s+v\s*,\s*m\s*,\s*e/i.test(source) &&
  !/\bEXECUTE\b|\bformat\s*\(|\bquote_ident\s*\(/i.test(source);
}
test('review function has fully qualified locked relations and both join bindings',()=>assert.equal(safe(body),true));
const changes=[
 ['vault shadowing','nachlass_v2.vaults','vaults'],
 ['membership shadowing','nachlass_v2.heir_memberships','heir_memberships'],
 ['envelope shadowing','nachlass_v2.heir_envelopes','heir_envelopes'],
 ['cross-vault membership','m.vault_id = v.id','m.vault_id = m.vault_id'],
 ['cross-vault envelope','e.vault_id = m.vault_id','e.vault_id = e.vault_id'],
 ['cross-heir envelope','e.heir_user_id = m.heir_user_id','e.heir_user_id = e.heir_user_id'],
 ['envelope lock removed','FOR SHARE OF v, m, e','FOR SHARE OF v, m'],
];
for(const [name,from,to] of changes)test('mutation rejected: '+name,()=>{
 assert.ok(body.includes(from));
 assert.equal(safe(body.replace(from,to)),false);
});
