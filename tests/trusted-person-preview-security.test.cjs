// Static security regression checks; no network, secrets, or staging deployment.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const api = read('supabase/functions/_shared/trusted-person-invitation-api.ts');
const hub = read('tools/notizen/vertrauenspersonen.html');
const create = read('tools/notizen/vertrauensperson-erstellen.html');
const accept = read('tools/notizen/vertrauensperson-einladung.html');
const manage = read('tools/notizen/vertrauenspersonen-verwaltung.html');
const checks = [
 ['Gateway rejects by default', api, /unavailableInvitationGateway\(\)/],
 ['Gateway throws explicit error', api, /throw new InvitationGatewayUnavailableError\(\)/],
 ['No network in gateway', api, /const deny = async/],
 ['Invitation code is 64 hex', api, /\^\[a-f0-9\]\{64\}\$/],
 ['UUIDs validated', api, /export function validateIdentifier/],
 ['Self invitation rejected', api, /self_invitation/],
 ['Duration one day', api, /durationDays !== 1/],
 ['Duration three days', api, /durationDays !== 3/],
 ['Duration seven days', api, /durationDays !== 7/],
 ['Duration fourteen days', api, /durationDays !== 14/],
 ['Overview validates arrays', api, /Array\.isArray\(overview\.invitations\)/],
 ['Overview caps invites', api, /overview\.invitations\.length <= 500/],
 ['Overview caps people', api, /overview\.trustedPersons\.length <= 500/],
 ['Overview checks duplicate invites', api, /new Set\(overview\.invitations\.map/],
 ['Creation response checks expiry', api, /Date\.parse\(result\.expiresAt\) > now/],
 ['Invitation view masks bearer code', api, /recipient: invitation\.intendedUserId/],
 ['Hub declares preview', hub, /Vorschau:/],
 ['Hub no script', hub, /default-src 'none'/],
 ['Create disabled', create, /type="submit" disabled/],
 ['Create uses UUID', create, /const uuid=/],
 ['Create has no network permission', create, /default-src 'none'/],
 ['Accept disabled', accept, /type="submit" disabled/],
 ['Accept password field', accept, /id="token" type="password"/],
 ['Accept code never in URL', accept, /Never accept bearer codes through URLs/],
 ['Accept clears on pagehide', accept, /addEventListener\("pagehide"/],
 ['Accept code not named for submission', accept, /<input id="token" type="password"/],
 ['Management disabled removal', manage, /disabled title="Erst nach sicherer Anmeldung verfügbar">Vertrauensperson entfernen/],
 ['Management disabled revocation', manage, /disabled title="Erst nach sicherer Anmeldung verfügbar">Einladung widerrufen/],
 ['Management disconnected by default', manage, /kind:"unavailable"/],
 ['Management no database connection', manage, /Keine Verbindung zu einer Datenbank/],
];
for (const [name, source, pattern] of checks) {
 test(name, () => assert.match(source, pattern));
}
test('Hub links only local trusted-person preview pages', () => {
 const hrefs = [...hub.matchAll(/href="([^"]+)"/g)].map(x => x[1]).filter(x => !x.startsWith('#'));
 assert.deepEqual(hrefs.sort(), [
  './vertrauensperson-einladung.html',
  './vertrauensperson-erstellen.html',
  './vertrauenspersonen-verwaltung.html'
 ].sort());
});
test('Invitation code never in a named form field', () => {
 assert.doesNotMatch(accept, /name="token"/);
});
test('Management never fetches data directly', () => {
 assert.doesNotMatch(manage, /\bfetch\s*\(/);
});
test('Create never fetches data directly', () => {
 assert.doesNotMatch(create, /\bfetch\s*\(/);
});
test('Accept never fetches data directly', () => {
 assert.doesNotMatch(accept, /\bfetch\s*\(/);
});
