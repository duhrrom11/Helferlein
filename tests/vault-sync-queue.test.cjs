// Ausfuehren: node --test tests/vault-sync-queue.test.cjs
// Testet den tatsaechlichen Warteschlangen-Code aus der HTML-Datei ohne Firebase-Zugriff.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/digitaler-nachlass/index.html'), 'utf8');
const start = html.indexOf('        let vaultSyncQueue = Promise.resolve();');
const end = html.indexOf('        async function performVaultSync(', start);
assert.ok(start >= 0 && end > start, 'Warteschlangen-Code muss vorhanden sein');
const queueCode = html.slice(start, end);

function setup(performVaultSync) {
  const events = [];
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, {
          innerText: '',
          classList: {
            add(name) { events.push([id, 'add', name]); },
            remove(name) { events.push([id, 'remove', name]); },
            toggle(name, enabled) { events.push([id, enabled ? 'add' : 'remove', name]); }
          }
        });
      }
      return elements.get(id);
    }
  };
  const logs = [];
  const context = vm.createContext({
    Promise, document, console: { error(...args) { logs.push(args); } },
    performVaultSync
  });
  vm.runInContext(queueCode + '\nthis.sync = syncVaultToFirebase;', context);
  return { sync: context.sync, events, elements, logs };
}

test('Cloud-Status zeigt Fehlschlag und nachfolgenden Erfolg', async () => {
  let calls = 0;
  const { sync, elements } = setup(async () => ++calls === 2);
  assert.equal(await sync(true), false);
  assert.match(elements.get('vault-sync-result').textContent, /nicht bestätigt/);
  assert.equal(await sync(true), true);
  assert.match(elements.get('vault-sync-result').textContent, /bestätigt/);
});

test('sichtbarer Cloud-Status wird nach lokalem Speichern zurueckgenommen', () => {
  assert.match(html, /Neuere Änderungen sind lokal gespeichert, aber noch nicht als Cloud-Sicherung bestätigt/);
  assert.match(html, /syncStatus\.classList\.remove\('border-emerald-700'/);
});

test('Cloud-Sync verwendet den exakt gespeicherten Tresorstand', () => {
  assert.match(html, /const localSnapshot = localStorage\.getItem\('digital_estate_vault'\)/);
  assert.match(html, /cfg\.encryptedData/);
  assert.match(html, /localStorage\.getItem\('digital_estate_vault'\) !== localSnapshot/);
});

test('manueller Snapshot-Konflikt beendet Ladeanzeige mit Fehlermeldung', () => {
  assert.match(html, /Der lokale Tresor wurde während der Vorbereitung geändert/);
  assert.match(html, /Nach der Cloud-Speicherung wurden neuere lokale Änderungen erkannt/);
  assert.match(html, /const stillCurrent = syncRevision === localSaveRevision/);
  assert.match(html, /lastPersistedRevision !== localSaveRevision/);
  assert.match(html, /lastPersistedRevision === localSaveRevision/);
  assert.match(html, /if \(stillCurrent\) \{/);
});

test('Supabase-Cloud-Sicherung ist explizit und kontogebunden', () => {
  assert.match(html, /bindClick\('supabaseBackupBtn', \(\) => backupVaultToSupabase\(\)\)/);
  assert.match(html, /supabaseClient\.auth\.getUser\(\)/);
  assert.match(html, /\.from\('vault_cloud_snapshots'\)/);
  assert.match(html, /existing\.vault_id !== cfg\.vaultId/);
  assert.match(html, /\.eq\('owner_user_id', user\.id\)\.eq\('vault_id', cfg\.vaultId\)/);
  assert.match(html, /encrypted_data: cfg\.encryptedData/);
  assert.doesNotMatch(html, /encrypted_data: cfg\.masterKeyHex/);
});

test('Supabase-Sicherungsstand wird nur lesend verglichen', () => {
  const start = html.indexOf('async function checkSupabaseVaultBackup()');
  const end = html.indexOf('// Explicit, account-bound encrypted cloud copy.', start);
  assert.ok(start >= 0 && end > start);
  const source = html.slice(start, end);
  assert.match(source, /\.select\('vault_id,updated_at,encrypted_data,encrypted_config,recovery_key'\)/);
  assert.match(source, /localEncrypted\[key\] === remoteEncrypted\[key\]/);
  assert.doesNotMatch(source, /localStorage\.setItem|\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

test('Cloud-Wiederherstellungsprobe entschluesselt nur lesend', () => {
  const start = html.indexOf('async function previewSupabaseVaultRecovery()');
  const end = html.indexOf('// Read-only status check; never imports', start);
  assert.ok(start >= 0 && end > start);
  const source = html.slice(start, end);
  assert.match(source, /decryptVaultPayload\(remote\.encrypted_data, currentMasterKeyHex\)/);
  assert.match(source, /local\.vaultId !== remote\.vault_id/);
  assert.doesNotMatch(source, /localStorage\.setItem|\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

test('Cloud-Wiederherstellung verlangt Passwort und schuetzt vorhandene Eintraege', () => {
  const start = html.indexOf('async function restoreVaultFromSupabase()');
  const end = html.indexOf('// Opt-in: wrap only the random vault key', start);
  assert.ok(start >= 0 && end > start);
  const source = html.slice(start, end);
  assert.match(source, /currentDecryptedVault\.entries\.length !== 0/);
  assert.match(source, /localStorage\.getItem\('digital_estate_vault'\) !== localSnapshot/);
  assert.match(source, /decryptVaultPayload\(remote\.encrypted_data, hexKey\)/);
  assert.match(source, /crypto\.subtle\.decrypt/);
  assert.match(source, /requestCloudRecoveryPassword/);
  assert.match(html, /input\.type = 'password'/);
  assert.match(html, /input\.value = ''/);
});

test('Recovery-Key nur fuer exakt passenden Cloud-Ciphertext', () => {
  const start = html.indexOf('async function prepareSupabaseRecoveryKey()');
  const end = html.indexOf('// Verify decryptability with the current local key', start);
  assert.ok(start >= 0 && end > start);
  const source = html.slice(start, end);
  assert.match(source, /encrypted\.iv !== cfg\.encryptedData\.iv/);
  assert.match(source, /encrypted\.ciphertext !== cfg\.encryptedData\.ciphertext/);
  assert.match(source, /\.select\('vault_id,encrypted_data'\)/);
});

test('Wiederherstellung warnt nach erfolgreicher Entschluesselung vor fehlenden Metadaten', () => {
  const start = html.indexOf('async function restoreVaultFromSupabase()');
  const end = html.indexOf('// Opt-in: wrap only the random vault key', start);
  const source = html.slice(start, end);
  assert.match(source, /Für diese ältere Sicherung fehlen Cloud-Einstellungen/);
  assert.match(source, /Kontakte, Alarmregeln und Check-in/);
  assert.ok(source.indexOf('Tresor erfolgreich entschlüsselt') < source.indexOf('localStorage.setItem'));
});

test('Cloud-Restore mischt keine fremden Kontakt- oder Alarmdaten bei', () => {
  const start = html.indexOf('async function restoreVaultFromSupabase()');
  const end = html.indexOf('// Opt-in: wrap only the random vault key', start);
  const source = html.slice(start, end);
  assert.match(source, /const restored = \{/);
  assert.match(source, /trustees: \[\]/);
  assert.match(source, /alarmPersons: \[\]/);
  assert.doesNotMatch(source, /const restored = \{ \.\.\.local/);
  assert.match(source, /rawKey\.fill\(0\)/);
});

test('Cloud-Backup verschluesselt Konfiguration und Restore prueft sie', () => {
  const backupStart = html.indexOf('async function backupVaultToSupabase()');
  const backupEnd = html.indexOf('function syncVaultToFirebase(', backupStart);
  const backup = html.slice(backupStart, backupEnd);
  assert.match(backup, /encryptVaultPayload\(configPayload, currentMasterKeyHex\)/);
  assert.match(backup, /encrypted_config: encryptedConfig/);
  const restoreStart = html.indexOf('async function restoreVaultFromSupabase()');
  const restoreEnd = html.indexOf('// Opt-in: wrap only the random vault key', restoreStart);
  const restore = html.slice(restoreStart, restoreEnd);
  assert.match(restore, /decryptVaultPayload\(remote\.encrypted_config, hexKey\)/);
  assert.match(restore, /restored\.trustees = recoveredConfig\.trustees/);
  assert.match(restore, /restored\.alarmPersons = recoveredConfig\.alarmPersons/);
});

test('Supabase-Status kontrolliert auch verschluesselte Konfiguration und Recovery-Key', () => {
  const start = html.indexOf('async function checkSupabaseVaultBackup()');
  const end = html.indexOf('// Explicit, account-bound encrypted cloud copy', start);
  const source = html.slice(start, end);
  assert.match(source, /encrypted_config,recovery_key/);
  assert.match(source, /decryptVaultPayload\(remote\.encrypted_config, currentMasterKeyHex\)/);
  assert.match(source, /configMatches/);
  assert.match(source, /remote\.recovery_key/);
  assert.doesNotMatch(source, /localStorage\.setItem|\.insert\(|\.update\(/);
});

test('Lesende Cloud-Wiederherstellungsprobe kontrolliert auch Kontakte', () => {
  const start = html.indexOf('async function previewSupabaseVaultRecovery()');
  const end = html.indexOf('// Read-only status check; never imports', start);
  const source = html.slice(start, end);
  assert.match(source, /encrypted_config,updated_at/);
  assert.match(source, /decryptVaultPayload\(remote\.encrypted_config, currentMasterKeyHex\)/);
  assert.match(source, /config\.trustees\.length/);
  assert.match(source, /config\.alarmPersons\.length/);
  assert.doesNotMatch(source, /localStorage\.setItem|\.insert\(|\.update\(/);
});

test('Cloud-Restore blockiert angepasste lokale Kontakte und Einstellungen auch ohne Eintraege', () => {
  const start = html.indexOf('async function restoreVaultFromSupabase()');
  const end = html.indexOf('// Opt-in: wrap only the random vault key', start);
  const source = html.slice(start, end);
  assert.match(source, /const pristineMetadata =/);
  assert.match(source, /local\.ownerName === 'Dein Name'/);
  assert.match(source, /local\.ownerEmail === ''/);
  assert.match(source, /local\.checkInIntervalDays === 30/);
  assert.match(source, /local\.alarmPersons\.length === 0/);
  assert.match(source, /JSON\.stringify\(local\.trustees\)/);
  assert.match(source, /!pristineMetadata/);
});

test('Cloud-Restore kontrolliert unveraenderte Metadaten auch direkt vor dem Schreiben', () => {
  const start = html.indexOf('async function restoreVaultFromSupabase()');
  const end = html.indexOf('// Opt-in: wrap only the random vault key', start);
  const source = html.slice(start, end);
  const guard = source.lastIndexOf('!pristineMetadata');
  const write = source.indexOf("localStorage.setItem('digital_estate_vault'");
  assert.ok(guard > source.indexOf('Tresor erfolgreich entschlüsselt'));
  assert.ok(write > guard);
});

test('ein fehlgeschlagener Auftrag blockiert den naechsten nicht', async () => {
  const calls = [];
  const { sync } = setup(async () => {
    calls.push(calls.length + 1);
    return calls.length === 1 ? false : true;
  });
  const first = sync(true);
  const second = sync(true);
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.deepEqual(calls, [1, 2]);
});

test('unerwartete Ausnahme liefert false und Warteschlange laeuft weiter', async () => {
  let calls = 0;
  const { sync, logs } = setup(async () => {
    calls++;
    if (calls === 1) throw new Error('simulierter Firebase-Fehler');
    return true;
  });
  assert.equal(await sync(true), false);
  assert.equal(await sync(true), true);
  assert.equal(calls, 2);
  assert.equal(logs.length, 1);
});

test('Auftraege werden nicht parallel ausgefuehrt', async () => {
  let active = 0;
  let maxActive = 0;
  const { sync } = setup(async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return true;
  });
  assert.deepEqual(await Promise.all([sync(true), sync(true), sync(true)]), [true, true, true]);
  assert.equal(maxActive, 1);
});

test('unerwarteter manueller Fehler zeigt Fehlermeldung', async () => {
  const { sync, elements, events } = setup(async () => { throw new Error('Testfehler'); });
  assert.equal(await sync(false), false);
  assert.match(elements.get('syncErrorMessage').innerText, /nicht abgeschlossen/);
  assert.ok(events.some(e => e[0] === 'syncStatusError' && e[1] === 'remove' && e[2] === 'hidden'));
});
