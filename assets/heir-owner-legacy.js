
        const firebaseConfig = {
            apiKey: "AIzaSyAMWtuQHTGhMMd3WmIgW46NbvT6bQoBwm8",
            authDomain: "nachlass-app-99df8.firebaseapp.com",
            projectId: "nachlass-app-99df8",
            storageBucket: "nachlass-app-99df8.firebasestorage.app",
            messagingSenderId: "593798150622",
            appId: "1:593798150622:web:e4e980c9fb6b06201ec54f",
            measurementId: "G-LWRZKYPJXC"
        };
        
        let db;
        try {
            if (typeof firebase !== "undefined" && !firebase.apps.length) { 
                firebase.initializeApp(firebaseConfig); 
            }
            db = firebase.firestore();
        } catch (e) {
            console.error("Firebase Fehler:", e);
        }

        // Supabase Konfiguration & Instanz
        const SUPABASE_URL = "https://avapuibsidubuzxjtyld.supabase.co";
        const SUPABASE_ANON_KEY = "sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC";
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        async function supabaseRegister() {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            if(!email || !password) return alert('Bitte E-Mail und Passwort eingeben.');
            const { error } = await supabaseClient.auth.signUp({ email, password });
            if(error) alert('Das hat leider nicht geklappt. Bitte prüfe deine Angaben und versuche es erneut.');
            else { alert('Konto erstellt'); checkUserSession(); }
        }

        async function supabaseLogin() {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            if(!email || !password) return alert('Bitte E-Mail und Passwort eingeben.');
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if(error) alert('Das hat leider nicht geklappt. Bitte prüfe deine Angaben und versuche es erneut.');
            else { alert('Angemeldet'); checkUserSession(); }
        }

        async function supabaseLogout() {
            await supabaseClient.auth.signOut();
            checkUserSession();
            alert('Abgemeldet.');
        }

        async function checkUserSession() {
            let user = null;
            let sessionError = false;
            try {
                const result = await supabaseClient.auth.getUser();
                user = result.data?.user ?? null;
                sessionError = Boolean(result.error);
            } catch (error) {
                console.warn("Supabase-Anmeldestatus konnte nicht geprüft werden:", error);
                sessionError = true;
            }
            const statusText = document.getElementById('cloud-status-text');
            const userEmailSpan = document.getElementById('cloud-user-email');
            const headerUserInfo = document.getElementById('header-user-info');
            const btnLogout = document.getElementById('btn-logout');

            if(user) {
                statusText.innerText = "Angemeldet";
                userEmailSpan.innerText = user.email;
                headerUserInfo.innerText = "👤 " + user.email;
                headerUserInfo.classList.remove('hidden');
                btnLogout.classList.remove('hidden');
            } else {
                statusText.innerText = sessionError
                    ? "Anmeldung konnte nicht geprüft werden"
                    : "Nicht angemeldet";
                userEmailSpan.innerText = "";
                headerUserInfo.innerText = "Nicht angemeldet";
                headerUserInfo.classList.add('hidden');
                btnLogout.classList.add('hidden');
            }
        }

        let currentMasterKeyHex = null;
        let currentDecryptedVault = { entries: [] };
        let vaultReady = false; // Erst nach erfolgreicher Entschlüsselung Schreibzugriff erlauben.

        document.addEventListener('DOMContentLoaded', () => {
            setupGlobalEventListeners();
            checkUserSession();

            (async () => {
                try {
                    await initVault();
                    vaultReady = true;
                    renderApp();
                    await checkIncomingAlarms();
                } catch (err) {
                    console.error("Kritischer Fehler beim Laden der Tresordaten:", err);
                    const notice = document.createElement('div');
                    notice.setAttribute('role', 'alert');
                    notice.className = 'fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-2xl rounded-xl border-2 border-red-500 bg-red-950 p-5 text-white shadow-2xl';
                    notice.textContent = "Tresor gesperrt: " + err.message + " Bitte vorhandene Backups sichern und keine neuen Einträge anlegen.";
                    document.body.appendChild(notice);
                }
            })();
        });

        function setupGlobalEventListeners() {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
            });

            const bindClick = (id, handler) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('click', handler);
            };
            bindClick('closeModalBtn', () => document.getElementById('syncModalOverlay').classList.add('hidden'));
            bindClick('closeSuccessModalBtn', () => document.getElementById('syncModalOverlay').classList.add('hidden'));
            bindClick('clearAlarmBtn', clearEmergencyAlarm);
            bindClick('saveEntryBtn', saveVaultEntry);
            bindClick('supabaseBackupBtn', () => syncVaultToFirebase(false));
            bindClick('supabaseBackupStatusBtn', checkSupabaseVaultBackup);
            bindClick('supabaseRestorePreviewBtn', previewSupabaseVaultRecovery);
            bindClick('supabaseRecoveryKeyBtn', prepareSupabaseRecoveryKey);
            bindClick('supabaseRestoreBtn', restoreVaultFromSupabase);
            bindClick('checkInBtn', performCheckIn);
            
            const intervalSel = document.getElementById('deadmanIntervalSelect');
            if (intervalSel) intervalSel.addEventListener('change', updateDeadmanInterval);

            bindClick('addAlarmPersonBtn', addAlarmPerson);
            bindClick('saveTrusteesBtn', saveTrustees);
            bindClick('generatePdfBtn', () => window.estatePrintKeys?.());
            bindClick('saveSettingsBtn', saveSettings);

            document.addEventListener('click', (e) => {
                const target = e.target;

                if (target.classList.contains('delete-entry-btn')) {
                    const id = parseInt(target.getAttribute('data-id'));
                    deleteVaultEntry(id);
                }

                if (target.classList.contains('copy-link-btn') || target.classList.contains('email-btn')) {
                    alert('Erben-Links mit dem Tresorschlüssel sind deaktiviert. Es wird nichts kopiert oder versendet.');
                }

                if (target.classList.contains('delete-person-btn')) {
                    const idx = parseInt(target.getAttribute('data-idx'));
                    deleteAlarmPerson(idx);
                }
            });
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
            if (activeBtn) activeBtn.classList.add('active');

            document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
            const targetSec = document.getElementById(`section-${tabName}`);
            if (targetSec) targetSec.classList.remove('hidden');

            if (tabName === 'kit') renderPrintableKit();
        }

        async function getCryptoKeyFromHex(hexKey) {
            if (typeof hexKey !== "string" || !/^[a-fA-F0-9]{64}$/.test(hexKey)) throw new Error("Ungültiges Schlüsselformat");
            const bytes = new Uint8Array(hexKey.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
        }

        async function encryptVaultPayload(dataObj, hexKey) {
            const encoder = new TextEncoder();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const cryptoKey = await getCryptoKeyFromHex(hexKey);
            const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, cryptoKey, encoder.encode(JSON.stringify(dataObj)));
            const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
            return { ciphertext: b64(encrypted), iv: b64(iv) };
        }

        async function decryptVaultPayload(encryptedObj, hexKey) {
            try {
                if (!encryptedObj || !encryptedObj.iv || !encryptedObj.ciphertext) return null;
                const b64toBuf = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                const iv = b64toBuf(encryptedObj.iv);
                const ciphertext = b64toBuf(encryptedObj.ciphertext);
                const cryptoKey = await getCryptoKeyFromHex(hexKey);
                const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, cryptoKey, ciphertext);
                return JSON.parse(new TextDecoder().decode(decrypted));
            } catch(e) { return null; }
        }

        async function initVault() {
            const storedVault = localStorage.getItem('digital_estate_vault');
            let cfg = null;
            if (storedVault !== null) {
                try {
                    cfg = JSON.parse(storedVault);
                } catch (error) {
                    throw new Error("Vorhandene Tresordaten sind nicht lesbar. Der Datensatz wurde nicht überschrieben.");
                }
                if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg) ||
                    !/^[a-f0-9]{64}$/i.test(cfg.masterKeyHex || '') ||
                    !cfg.encryptedData || typeof cfg.encryptedData !== 'object') {
                    throw new Error("Vorhandene Tresordaten sind unvollständig oder beschädigt. Der Datensatz wurde nicht überschrieben.");
                }
            }

            if (storedVault === null) {
                const randomBytes = crypto.getRandomValues(new Uint8Array(32));
                currentMasterKeyHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                // Generate non-guessable IDs without changing any existing vault or heir identifiers.
                const vaultId = "v_" + Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');

                currentDecryptedVault = { entries: [] };
                cfg = {
                    vaultId: vaultId,
                    ownerName: "Dein Name",
                    ownerEmail: "",
                    masterKeyHex: currentMasterKeyHex,
                    checkInIntervalDays: 30,
                    lastCheckIn: new Date().toISOString(),
                    trustees: [
                        { id: 1, name: "Person 1", role: "Partner/in" },
                        { id: 2, name: "Person 2", role: "Kind" },
                        { id: 3, name: "Notar", role: "Rechtsbeistand" }
                    ],
                    alarmPersons: []
                };
                cfg.encryptedData = await encryptVaultPayload(currentDecryptedVault, currentMasterKeyHex);
                localStorage.setItem('digital_estate_vault', JSON.stringify(cfg));
            } else {
                currentMasterKeyHex = cfg.masterKeyHex;
                if (!cfg.alarmPersons) cfg.alarmPersons = [];
                const dec = await decryptVaultPayload(cfg.encryptedData, currentMasterKeyHex);
                if (!dec || !Array.isArray(dec.entries)) {
                    throw new Error("Der Tresor konnte nicht entschlüsselt werden. Vorhandene Daten bleiben unverändert.");
                }
                currentDecryptedVault = dec;
            }
        }

        function getVaultConfig() {
            return JSON.parse(localStorage.getItem('digital_estate_vault'));
        }

        // Nur der zuletzt gestartete lokale Speichervorgang darf schreiben.
        // Verschlüsselungen können in anderer Reihenfolge fertig werden.
        let localSaveRevision = 0;
        let lastPersistedRevision = 0;

        async function saveLocalConfig(cfg) {
            const revision = ++localSaveRevision;
            const encryptedData = await encryptVaultPayload(currentDecryptedVault, currentMasterKeyHex);
            if (revision !== localSaveRevision) return false;
            cfg.encryptedData = encryptedData;
            localStorage.setItem('digital_estate_vault', JSON.stringify(cfg));
            lastPersistedRevision = revision;
            const syncStatus = document.getElementById('vault-sync-result');
            if (syncStatus && !syncStatus.classList.contains('hidden')) {
                syncStatus.classList.remove('border-emerald-700', 'bg-emerald-950/70', 'text-emerald-100');
                syncStatus.classList.add('border-amber-700', 'bg-amber-950/70', 'text-amber-100');
                syncStatus.textContent = 'Deine letzten Änderungen sind noch nicht online gesichert. Bitte erneut versuchen.';
            }
            return true;
        }

        // Einstellungen seriell auf den jeweils neuesten lokalen Stand anwenden.
        let localConfigUpdateQueue = Promise.resolve();

        function updateLocalConfig(mutate) {
            if (!vaultReady) return Promise.reject(new Error('Tresor ist nicht entsperrt. Änderungen wurden nicht gespeichert.'));
            const operation = localConfigUpdateQueue.then(async () => {
                if (!vaultReady) throw new Error('Tresor ist nicht entsperrt.');
                const cfg = getVaultConfig();
                const previousVault = JSON.parse(JSON.stringify(currentDecryptedVault));
                try {
                    mutate(cfg);
                    const saved = await saveLocalConfig(cfg);
                    if (!saved) currentDecryptedVault = previousVault;
                    return saved;
                } catch (error) {
                    currentDecryptedVault = previousVault;
                    throw error;
                }
            });
            localConfigUpdateQueue = operation.then(() => undefined, () => undefined);
            return operation;
        }

        // Synchronisierungen nacheinander ausführen: spätere Änderungen
        // dürfen nicht mit einem bereits laufenden Schreibvorgang verschmelzen.
        let vaultSyncQueue = Promise.resolve();

        function showVaultSyncResult(success) {
            const status = document.getElementById('vault-sync-result');
            if (!status) return;
            if (success) {
                status.classList.add('hidden');
                status.textContent = '';
                return;
            }
            status.classList.remove('hidden');
            status.textContent = 'Online-Sicherung gerade nicht möglich. Bitte später erneut versuchen.';
        }

        function requestCloudRecoveryPassword(message) {
            return new Promise(resolve => {
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px';
                const form = document.createElement('form');
                form.setAttribute('role', 'dialog');
                form.setAttribute('aria-modal', 'true');
                form.style.cssText = 'background:#0f172a;color:#fff;padding:24px;border:1px solid #475569;border-radius:16px;width:min(100%,440px)';
                const label = document.createElement('label');
                label.textContent = message;
                label.style.cssText = 'display:block;margin-bottom:12px;font-size:14px';
                const input = document.createElement('input');
                input.type = 'password';
                input.autocomplete = 'new-password';
                input.required = true;
                input.style.cssText = 'width:100%;padding:10px;color:#111;background:#fff;border-radius:6px';
                label.appendChild(input);
                const buttons = document.createElement('div');
                buttons.style.cssText = 'display:flex;gap:12px;margin-top:16px';
                const cancel = document.createElement('button');
                cancel.type = 'button';
                cancel.textContent = 'Abbrechen';
                const submit = document.createElement('button');
                submit.type = 'submit';
                submit.textContent = 'Bestätigen';
                for (const button of [cancel, submit]) {
                    button.style.cssText = 'padding:10px;border-radius:6px;background:#334155;color:white';
                    buttons.appendChild(button);
                }
                form.append(label, buttons);
                overlay.appendChild(form);
                document.body.appendChild(overlay);
                const previousFocus = document.activeElement;
                const finish = value => {
                    input.value = '';
                    overlay.remove();
                    if (previousFocus && previousFocus.focus) previousFocus.focus();
                    resolve(value);
                };
                cancel.addEventListener('click', () => finish(null));
                form.addEventListener('submit', event => {
                    event.preventDefault();
                    finish(input.value);
                });
                overlay.addEventListener('keydown', event => {
                    if (event.key === 'Escape') { event.preventDefault(); finish(null); }
                });
                input.focus();
            });
        }

        // Recovery is intentionally limited to a fresh, empty local vault.
        // Never replace a vault containing entries or with a pending local save.
        async function restoreVaultFromSupabase() {
            if (!vaultReady) return alert('Bitte öffne zuerst deine Daten.');
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            const user = authData?.user;
            if (authError || !user) return alert('Bitte melde dich zuerst in deinem Konto an.');
            const startingRevision = localSaveRevision;
            const startingMasterKeyHex = currentMasterKeyHex;
            const localSnapshot = localStorage.getItem('digital_estate_vault');
            let local;
            try { local = localSnapshot ? JSON.parse(localSnapshot) : null; } catch {}
            // An empty entries array does not mean the local vault is disposable:
            // contacts and check-in settings may already contain real data.
            const defaultTrustees = [
                { id: 1, name: 'Person 1', role: 'Partner/in' },
                { id: 2, name: 'Person 2', role: 'Kind' },
                { id: 3, name: 'Notar', role: 'Rechtsbeistand' }
            ];
            const pristineMetadata = local &&
                local.ownerName === 'Dein Name' && local.ownerEmail === '' &&
                local.checkInIntervalDays === 30 &&
                Array.isArray(local.alarmPersons) && local.alarmPersons.length === 0 &&
                JSON.stringify(local.trustees) === JSON.stringify(defaultTrustees);
            if (!local || !currentDecryptedVault || !Array.isArray(currentDecryptedVault.entries) ||
                currentDecryptedVault.entries.length !== 0 || !pristineMetadata ||
                lastPersistedRevision !== localSaveRevision) {
                return alert('Wiederherstellung nur bei einem neuen, unveränderten lokalen Tresor möglich. Bestehende Einträge, Kontakte und Einstellungen bleiben geschützt.');
            }
            if (!confirm('Der leere lokale Tresor wird durch die Online-Sicherung ersetzt. Vorher eine verschlüsselte lokale Sicherungsdatei erstellen. Fortfahren?')) return;
            const password = await requestCloudRecoveryPassword('Wiederherstellungspasswort eingeben (nicht das Anmeldepasswort):');
            if (!password) return;
            const button = document.getElementById('supabaseRestoreBtn');
            if (button) button.disabled = true;
            try {
                const { data: remote, error } = await supabaseClient
                    .from('vault_cloud_snapshots').select('vault_id,encrypted_data,encrypted_config,recovery_key')
                    .eq('owner_user_id', user.id).maybeSingle();
                if (error) throw error;
                if (!remote || !remote.recovery_key) return alert('Keine Online-Sicherung mit Wiederherstellungsschlüssel vorhanden.');
                const keyInfo = remote.recovery_key;
                if (keyInfo.version !== 1 || keyInfo.kdf !== 'PBKDF2-SHA256' ||
                    keyInfo.iterations !== 600000 || !/^v_[A-Za-z0-9_-]{8,80}$/.test(remote.vault_id)) {
                    throw new Error('Unbekanntes Wiederherstellungsformat');
                }
                const decode = value => Uint8Array.from(atob(value), ch => ch.charCodeAt(0));
                const salt = decode(keyInfo.salt), iv = decode(keyInfo.iv);
                const wrappedKey = decode(keyInfo.ciphertext);
                // AES-GCM wraps exactly 32 raw key bytes plus a 16-byte tag.
                if (salt.length !== 16 || iv.length !== 12 || wrappedKey.length !== 48) {
                    throw new Error('Ungültige Schlüsselhülle');
                }
                const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password),
                    'PBKDF2', false, ['deriveKey']);
                const wrappingKey = await crypto.subtle.deriveKey({
                    name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256'
                }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
                const rawKey = new Uint8Array(await crypto.subtle.decrypt({
                    name: 'AES-GCM', iv
                }, wrappingKey, wrappedKey));
                if (rawKey.length !== 32) {
                    rawKey.fill(0);
                    throw new Error('Ungültiger Tresorschlüssel');
                }
                const hexKey = Array.from(rawKey, byte => byte.toString(16).padStart(2, '0')).join('');
                rawKey.fill(0);
                const decrypted = await decryptVaultPayload(remote.encrypted_data, hexKey);
                if (!decrypted || !Array.isArray(decrypted.entries)) throw new Error('Tresor nicht entschlüsselbar');
                let recoveredConfig = null;
                if (remote.encrypted_config) {
                    recoveredConfig = await decryptVaultPayload(remote.encrypted_config, hexKey);
                    if (!recoveredConfig || typeof recoveredConfig !== 'object' ||
                        Array.isArray(recoveredConfig) ||
                        !Array.isArray(recoveredConfig.trustees) ||
                        !Array.isArray(recoveredConfig.alarmPersons)) {
                        throw new Error('Verschlüsselte Konfiguration konnte nicht geprüft werden');
                    }
                }
                if (recoveredConfig && (
                    typeof recoveredConfig.ownerName !== 'string' ||
                    typeof recoveredConfig.ownerEmail !== 'string' ||
                    !Number.isInteger(recoveredConfig.checkInIntervalDays) ||
                    recoveredConfig.checkInIntervalDays < 1 ||
                    recoveredConfig.checkInIntervalDays > 3650 ||
                    typeof recoveredConfig.lastCheckIn !== 'string' ||
                    !Number.isFinite(Date.parse(recoveredConfig.lastCheckIn)) ||
                    recoveredConfig.trustees.length > 100 ||
                    recoveredConfig.alarmPersons.length > 100 ||
                    !recoveredConfig.trustees.every(person =>
                        person && typeof person === 'object' && !Array.isArray(person) &&
                        typeof person.name === 'string' && person.name.length <= 500) ||
                    !recoveredConfig.alarmPersons.every(person =>
                        person && typeof person === 'object' && !Array.isArray(person) &&
                        typeof person.name === 'string' && person.name.length <= 500)
                )) {
                    throw new Error('Verschlüsselte Konfiguration enthält ungültige Einstellungen');
                }
                // A newly initialized local vault can still contain important
                // contact/check-in configuration despite having zero entries.
                // Require an explicit second confirmation after decryption.
                if (!confirm('Online-Tresor erfolgreich entschlüsselt (' + decrypted.entries.length +
                    ' Einträge). ' + (recoveredConfig
                        ? 'Verschlüsselte Kontakte und Check-in-Einstellungen sind vorhanden und werden mit wiederhergestellt. '
                        : 'Für diese ältere Sicherung fehlen gespeicherte Einstellungen; Kontakte, Alarmregeln und Check-in müssen neu eingerichtet werden. ') +
                    'Den bisherigen leeren lokalen Tresor wirklich ersetzen?')) {
                    return;
                }
                if (localStorage.getItem('digital_estate_vault') !== localSnapshot ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    !currentDecryptedVault || !Array.isArray(currentDecryptedVault.entries) ||
                    currentDecryptedVault.entries.length !== 0 ||
                    !pristineMetadata) {
                    return alert('Lokale Daten wurden inzwischen geändert. Wiederherstellung abgebrochen.');
                }
                // Never silently retain a different local vault's contacts,
                // alarms or check-in state under the recovered cloud vault ID.
                const restored = {
                    vaultId: remote.vault_id,
                    masterKeyHex: hexKey,
                    encryptedData: remote.encrypted_data,
                    ownerName: 'Dein Name',
                    ownerEmail: '',
                    checkInIntervalDays: 30,
                    lastCheckIn: new Date().toISOString(),
                    trustees: [],
                    alarmPersons: []
                };
                if (recoveredConfig) {
                    restored.ownerName = typeof recoveredConfig.ownerName === 'string' ? recoveredConfig.ownerName : restored.ownerName;
                    restored.ownerEmail = typeof recoveredConfig.ownerEmail === 'string' ? recoveredConfig.ownerEmail : restored.ownerEmail;
                    restored.checkInIntervalDays = Number.isInteger(recoveredConfig.checkInIntervalDays) &&
                        recoveredConfig.checkInIntervalDays > 0 ? recoveredConfig.checkInIntervalDays : restored.checkInIntervalDays;
                    restored.lastCheckIn = typeof recoveredConfig.lastCheckIn === 'string' ?
                        recoveredConfig.lastCheckIn : restored.lastCheckIn;
                    restored.trustees = recoveredConfig.trustees;
                    restored.alarmPersons = recoveredConfig.alarmPersons;
                }
                // A10: the authenticated account may change while crypto or dialogs await.
                // Never apply a cloud result under a different signed-in account.
                const { data: verifiedAuth, error: verifiedAuthError } = await supabaseClient.auth.getUser();
                if (verifiedAuthError || verifiedAuth?.user?.id !== user.id) {
                    return alert('Konto während des Vorgangs gewechselt. Vorgang abgebrochen.');
                }
                if (localStorage.getItem('digital_estate_vault') !== localSnapshot ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    !currentDecryptedVault || !Array.isArray(currentDecryptedVault.entries) ||
                    currentDecryptedVault.entries.length !== 0) {
                    return alert('Lokaler Tresor während der Kontoprüfung geändert. Wiederherstellung abgebrochen.');
                }
                localStorage.setItem('digital_estate_vault', JSON.stringify(restored));
                alert('Daten wiederhergestellt. Die Seite wird neu geladen. ' +
                    (recoveredConfig ? 'Bitte Kontakte und Check-in-Einstellungen kontrollieren. ' :
                        'Kontakte, Alarmregeln und Check-in-Einstellungen müssen neu eingerichtet werden. ') +
                    'Bitte sofort eine verschlüsselte lokale Sicherung erstellen.');
                location.reload();
            } catch (error) {
                console.error('Wiederherstellung fehlgeschlagen:', error);
                alert('Wiederherstellung fehlgeschlagen. Passwort oder Daten ungültig. Lokale Daten wurden nicht verändert.');
            } finally {
                if (button) button.disabled = false;
            }
        }

        // Opt-in: wrap only the random vault key with a user-chosen recovery
        // passphrase. Never upload the passphrase or the unwrapped key.
        async function prepareSupabaseRecoveryKey() {
            if (!vaultReady || !currentMasterKeyHex) return alert('Bitte zuerst den Tresor öffnen.');
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            const user = authData?.user;
            if (authError || !user) return alert('Bitte melde dich zuerst in deinem Konto an.');
            const password = await requestCloudRecoveryPassword('Ein eigenes Wiederherstellungspasswort festlegen (mindestens 16 Zeichen). Nicht das Anmeldepasswort verwenden.');
            if (password === null) return;
            if (password.length < 16) return alert('Mindestens 16 Zeichen erforderlich.');
            const confirmation = await requestCloudRecoveryPassword('Wiederherstellungspasswort erneut eingeben.');
            if (confirmation !== password) return alert('Die Passwörter stimmen nicht überein. Nichts wurde hochgeladen.');
            if (!confirm('Den lokalen Tresorschlüssel mit dem Wiederherstellungspasswort verschlüsseln und nur die verschlüsselte Schlüsselhülle im eigenen Konto speichern? Das Passwort sicher getrennt aufbewahren.')) return;
            const button = document.getElementById('supabaseRecoveryKeyBtn');
            if (button) button.disabled = true;
            try {
                const startingMasterKeyHex = currentMasterKeyHex;
                const startingRevision = localSaveRevision;
                const snapshot = localStorage.getItem('digital_estate_vault');
                const cfg = snapshot ? JSON.parse(snapshot) : null;
                if (!cfg || !/^[a-f0-9]{64}$/i.test(currentMasterKeyHex || '') ||
                    cfg.masterKeyHex !== currentMasterKeyHex ||
                    !cfg.encryptedData || !cfg.encryptedData.iv || !cfg.encryptedData.ciphertext ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Lokaler Tresorschlüssel oder Tresorstand ist ungültig oder wurde geändert. Bitte erneut versuchen.');
                }
                const { data: remote, error: readError } = await supabaseClient
                    .from('vault_cloud_snapshots').select('vault_id,encrypted_data')
                    .eq('owner_user_id', user.id).maybeSingle();
                if (readError) throw readError;
                if (!remote || remote.vault_id !== cfg.vaultId) {
                    return alert('Bitte sichere deine Daten zuerst online. Andere Tresore werden nicht überschrieben.');
                }
                const encrypted = remote.encrypted_data || {};
                if (!encrypted.iv || !encrypted.ciphertext ||
                    encrypted.iv !== cfg.encryptedData.iv ||
                    encrypted.ciphertext !== cfg.encryptedData.ciphertext) {
                    return alert('Die Sicherungen passen nicht zusammen. Bitte zuerst die aktuelle verschlüsselte Sicherung hochladen.');
                }
                const verifiedVault = await decryptVaultPayload(cfg.encryptedData, currentMasterKeyHex);
                if (!verifiedVault || !Array.isArray(verifiedVault.entries)) {
                    return alert('Der lokale Tresorinhalt lässt sich mit dem aktuellen Schlüssel nicht entschlüsseln. Kein Wiederherstellungsschlüssel gespeichert.');
                }
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Tresor während der Entschlüsselungsprüfung geändert. Bitte erneut versuchen.');
                }
                const salt = crypto.getRandomValues(new Uint8Array(16));
                const iv = crypto.getRandomValues(new Uint8Array(12));
                const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password),
                    'PBKDF2', false, ['deriveKey']);
                const wrappingKey = await crypto.subtle.deriveKey({
                    name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256'
                }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
                const rawMasterKey = Uint8Array.from(startingMasterKeyHex.match(/.{2}/g),
                    byte => parseInt(byte, 16));
                let wrapped;
                try {
                    wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, rawMasterKey);
                } finally {
                    rawMasterKey.fill(0);
                }
                const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
                const recovery = { version: 1, kdf: 'PBKDF2-SHA256', iterations: 600000,
                    salt: b64(salt), iv: b64(iv), ciphertext: b64(wrapped) };
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Tresor während der Vorbereitung geändert. Bitte erneut versuchen.');
                }
                // A10: the authenticated account may change while crypto or dialogs await.
                // Never apply a cloud result under a different signed-in account.
                const { data: verifiedAuth, error: verifiedAuthError } = await supabaseClient.auth.getUser();
                if (verifiedAuthError || verifiedAuth?.user?.id !== user.id) {
                    return alert('Konto während des Vorgangs gewechselt. Vorgang abgebrochen.');
                }
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Lokaler Tresor während der Kontoprüfung geändert.');
                }
                const { data: saved, error: saveError } = await supabaseClient
                    .from('vault_cloud_snapshots').update({ recovery_key: recovery })
                    .eq('owner_user_id', user.id).eq('vault_id', cfg.vaultId).select('vault_id');
                if (saveError || !saved || saved.length !== 1) throw saveError || new Error('Nicht bestätigt');
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Wiederherstellungsschlüssel für den vorherigen Tresorstand gespeichert, aber der lokale Tresor wurde inzwischen geändert. Bitte Sicherungsstand und Schlüssel erneut prüfen.');
                }
                alert('Gespeichert. Bitte bewahre dein Wiederherstellungspasswort gut auf.');
            } catch (error) {
                console.error('Online-Schlüsselvorbereitung fehlgeschlagen:', error);
                alert('Wiederherstellungsschlüssel konnte nicht bestätigt gespeichert werden.');
            } finally {
                if (button) button.disabled = false;
            }
        }

        // Verify decryptability with the current local key, without importing data.
        async function previewSupabaseVaultRecovery() {
            if (!vaultReady || !currentMasterKeyHex) {
                return alert('Bitte zuerst den lokalen Tresor öffnen.');
            }
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            const user = authData?.user;
            if (authError || !user) return alert('Bitte melde dich zuerst in deinem Konto an.');
            const localSnapshot = localStorage.getItem('digital_estate_vault');
            const startingMasterKeyHex = currentMasterKeyHex;
            const startingRevision = localSaveRevision;
            const button = document.getElementById('supabaseRestorePreviewBtn');
            if (button) button.disabled = true;
            try {
                const { data: remote, error } = await supabaseClient
                    .from('vault_cloud_snapshots').select('vault_id,encrypted_data,encrypted_config,updated_at')
                    .eq('owner_user_id', user.id).maybeSingle();
                if (error) throw error;
                if (!remote) return alert('Keine Online-Sicherung für dieses Konto vorhanden.');
                const local = getVaultConfig();
                if (!local || local.vaultId !== remote.vault_id) {
                    return alert('Diese Sicherung gehört zu anderen Daten. Es wurde nichts geändert.');
                }
                if (local.masterKeyHex !== currentMasterKeyHex) {
                    return alert('Der lokale Tresorschlüssel stimmt nicht mit dem aktiven Schlüssel überein. Keine Daten verändert.');
                }
                const decrypted = await decryptVaultPayload(remote.encrypted_data, currentMasterKeyHex);
                if (!decrypted || !Array.isArray(decrypted.entries)) {
                    return alert('Online-Sicherung lässt sich mit dem lokalen Schlüssel nicht entschlüsseln. Keine Daten wurden verändert.');
                }
                let configStatus = 'Ältere Sicherung ohne gespeicherte Einstellungen.';
                if (remote.encrypted_config) {
                    const config = await decryptVaultPayload(remote.encrypted_config, currentMasterKeyHex);
                    if (!config || typeof config !== 'object' || Array.isArray(config) ||
                        typeof config.ownerName !== 'string' ||
                        typeof config.ownerEmail !== 'string' ||
                        !Number.isInteger(config.checkInIntervalDays) ||
                        config.checkInIntervalDays < 1 || config.checkInIntervalDays > 3650 ||
                        typeof config.lastCheckIn !== 'string' ||
                        !Number.isFinite(Date.parse(config.lastCheckIn)) ||
                        !Array.isArray(config.trustees) || config.trustees.length > 100 ||
                        !Array.isArray(config.alarmPersons) || config.alarmPersons.length > 100 ||
                        !config.trustees.every(person =>
                            person && typeof person === 'object' && !Array.isArray(person) &&
                            typeof person.name === 'string' && person.name.length <= 500) ||
                        !config.alarmPersons.every(person =>
                            person && typeof person === 'object' && !Array.isArray(person) &&
                            typeof person.name === 'string' && person.name.length <= 500)) {
                        return alert('Tresoreinträge entschlüsselbar, aber Kontakte oder Einstellungen sind für die Wiederherstellung ungültig. Keine Daten verändert.');
                    }
                    configStatus = 'Verschlüsselte Einstellungen erfolgreich entschlüsselt: ' +
                        config.trustees.length + ' Vertrauenspersonen und ' +
                        config.alarmPersons.length + ' Alarmkontakte.';
                }
                if (localStorage.getItem('digital_estate_vault') !== localSnapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Der lokale Tresor oder aktive Schlüssel wurde während der Wiederherstellungsprüfung geändert. Bitte erneut prüfen.');
                }
                const date = remote.updated_at ? new Date(remote.updated_at).toLocaleString('de-DE') : 'unbekannt';
                alert('Sicherung geprüft. Enthaltene Einträge: ' +
                    decrypted.entries.length + '. ' + configStatus +
                    ' Dies war nur eine Prüfung: Lokale Daten wurden nicht überschrieben.');
            } catch (error) {
                console.error('Wiederherstellungsprüfung fehlgeschlagen:', error);
                alert('Wiederherstellungsprüfung fehlgeschlagen. Lokale Daten wurden nicht verändert.');
            } finally {
                if (button) button.disabled = false;
            }
        }

        // Read-only status check; never imports or replaces local vault data.
        async function checkSupabaseVaultBackup() {
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            const user = authData?.user;
            if (authError || !user) return alert('Bitte melde dich zuerst in deinem Konto an.');
            const button = document.getElementById('supabaseBackupStatusBtn');
            if (button) button.disabled = true;
            try {
                const { data: remote, error } = await supabaseClient
                    .from('vault_cloud_snapshots')
                    .select('vault_id,updated_at,encrypted_data,encrypted_config,recovery_key')
                    .eq('owner_user_id', user.id).maybeSingle();
                if (error) throw error;
                if (!remote) return alert('In deinem Konto ist noch keine verschlüsselte Tresor-Sicherung vorhanden.');
                const startingMasterKeyHex = currentMasterKeyHex;
                const startingRevision = localSaveRevision;
                const localSnapshot = localStorage.getItem('digital_estate_vault');
                let local = null;
                try { local = localSnapshot ? JSON.parse(localSnapshot) : null; } catch {}
                const date = remote.updated_at ? new Date(remote.updated_at).toLocaleString('de-DE') : 'unbekannt';
                if (!local || local.vaultId !== remote.vault_id) {
                    return alert('Online-Sicherung vom ' + date + ' vorhanden, aber sie gehört zu einer anderen Tresor-ID. Es wurde nichts geändert.');
                }
                // PostgreSQL jsonb may reorder object keys; compare canonical fields.
                const localEncrypted = local.encryptedData || {};
                const remoteEncrypted = remote.encrypted_data || {};
                const matches = ['iv', 'ciphertext'].every(key =>
                    typeof localEncrypted[key] === 'string' &&
                    localEncrypted[key] === remoteEncrypted[key]);
                if (!matches) {
                    return alert('Online-Sicherung vom ' + date + ' weicht vom lokalen Tresorinhalt ab. Bitte lokale Änderungen prüfen und bei Bedarf erneut sichern.');
                }
                if (!vaultReady || !/^[a-f0-9]{64}$/i.test(currentMasterKeyHex || '') ||
                    local.masterKeyHex !== currentMasterKeyHex) {
                    return alert('Der lokale Tresorschlüssel ist nicht verfügbar oder stimmt nicht mit dem gespeicherten Tresor überein. Keine Änderungen vorgenommen.');
                }
                const verifiedCloudEntries = await decryptVaultPayload(remote.encrypted_data, currentMasterKeyHex);
                if (!verifiedCloudEntries || !Array.isArray(verifiedCloudEntries.entries)) {
                    return alert('Gespeicherte und lokale Verschlüsselungsdaten stimmen überein, lassen sich aber nicht entschlüsseln. Keine Änderungen vorgenommen.');
                }
                if (!remote.encrypted_config) {
                    return alert('Tresorinhalt ist mit der Online-Sicherung vom ' + date +
                        ' entschlüsselbar und stimmt überein. Diese ältere Sicherung enthält jedoch keine verschlüsselte Konfiguration. Bitte erneut sichern.');
                }
                const cloudConfig = await decryptVaultPayload(remote.encrypted_config, currentMasterKeyHex);
                if (!cloudConfig || typeof cloudConfig !== 'object' || Array.isArray(cloudConfig) ||
                    typeof cloudConfig.ownerName !== 'string' ||
                    typeof cloudConfig.ownerEmail !== 'string' ||
                    !Number.isInteger(cloudConfig.checkInIntervalDays) ||
                    cloudConfig.checkInIntervalDays < 1 || cloudConfig.checkInIntervalDays > 3650 ||
                    typeof cloudConfig.lastCheckIn !== 'string' ||
                    !Number.isFinite(Date.parse(cloudConfig.lastCheckIn)) ||
                    !Array.isArray(cloudConfig.trustees) || cloudConfig.trustees.length > 100 ||
                    !Array.isArray(cloudConfig.alarmPersons) || cloudConfig.alarmPersons.length > 100 ||
                    !cloudConfig.trustees.every(person =>
                        person && typeof person === 'object' && !Array.isArray(person) &&
                        typeof person.name === 'string' && person.name.length <= 500) ||
                    !cloudConfig.alarmPersons.every(person =>
                        person && typeof person === 'object' && !Array.isArray(person) &&
                        typeof person.name === 'string' && person.name.length <= 500)) {
                    return alert('Die Sicherung enthält fehlerhafte Einstellungen. Es wurde nichts geändert.');
                }
                const keys = ['ownerName', 'ownerEmail', 'checkInIntervalDays',
                    'lastCheckIn', 'trustees', 'alarmPersons'];
                if (localStorage.getItem('digital_estate_vault') !== localSnapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Der lokale Tresor oder aktive Schlüssel wurde während der Online-Prüfung geändert. Bitte die Prüfung wiederholen.');
                }
                const configMatches = keys.every(key =>
                    JSON.stringify(cloudConfig[key] ?? null) === JSON.stringify(local[key] ?? null));
                alert(configMatches
                    ? 'Tresorinhalt und verschlüsselte Konfiguration entsprechen der Online-Sicherung vom ' + date +
                        '. ' + (remote.recovery_key ? 'Ein Wiederherstellungsschlüssel ist hinterlegt.' :
                        'Ein Wiederherstellungsschlüssel fehlt noch.') + ' Dies ist keine vollständige Wiederherstellungsprobe.'
                    : 'Tresorinhalt stimmt überein, aber Kontakte oder Check-in-Einstellungen weichen von der Online-Sicherung ab. Bitte erneut sichern.');
            } catch (error) {
                console.error('Online-Sicherungsprüfung fehlgeschlagen:', error);
                alert('Online-Sicherungsstand konnte nicht geprüft werden. Lokale Daten bleiben unverändert.');
            } finally {
                if (button) button.disabled = false;
            }
        }

        // Explicit, account-bound encrypted cloud copy. No key or plaintext
        // metadata is uploaded. Existing remote vaults are never overwritten
        // unless their vault_id matches the local vault exactly.
        async function backupVaultToSupabase(silent = false) {
            if (!vaultReady) { if (!silent) alert('Der lokale Tresor ist nicht bereit.'); return false; }
            const { data: authData, error: authError } = await supabaseClient.auth.getUser();
            const user = authData?.user;
            if (authError || !user) { if (!silent) alert('Bitte melde dich zuerst in deinem Konto an.'); return false; }
            const startingMasterKeyHex = currentMasterKeyHex;
            const startingRevision = localSaveRevision;
            const snapshot = localStorage.getItem('digital_estate_vault');
            let cfg;
            try { cfg = snapshot ? JSON.parse(snapshot) : null; } catch { cfg = null; }
            if (!cfg || !cfg.vaultId || !cfg.encryptedData ||
                !/^[a-f0-9]{64}$/i.test(currentMasterKeyHex || '') ||
                cfg.masterKeyHex !== currentMasterKeyHex ||
                lastPersistedRevision !== localSaveRevision) {
                return alert('Bitte warte, bis das Speichern abgeschlossen ist.');
            }
            if (!silent && !confirm('Den aktuell lokal verschlüsselten Tresor einschließlich verschlüsselter Kontakte und Check-in-Einstellungen im angemeldeten Konto sichern? Ein unverschlüsselter Tresorschlüssel wird nicht hochgeladen. Für den Gerätewechsel muss zusätzlich ein Wiederherstellungspasswort vorbereitet werden; eine verschlüsselte lokale Sicherungsdatei bleibt empfohlen.')) return false;
            const button = document.getElementById('supabaseBackupBtn');
            if (button) button.disabled = true;
            try {
                const { data: existing, error: readError } = await supabaseClient
                    .from('vault_cloud_snapshots').select('vault_id,encrypted_data,recovery_key')
                    .eq('owner_user_id', user.id).maybeSingle();
                if (readError) throw readError;
                if (existing && existing.vault_id !== cfg.vaultId) {
                    return alert('In diesem Konto ist bereits ein anderer Tresor gesichert. Es wurde nichts überschrieben. Bitte zuerst die Zuordnung klären.');
                }
                // A matching vault ID alone does not prove the key is unchanged.
                // Never replace ciphertext under a different key while keeping
                // an existing password-wrapped recovery key for the old key.
                if (existing && existing.recovery_key) {
                    const previous = await decryptVaultPayload(existing.encrypted_data, currentMasterKeyHex);
                    if (!previous || !Array.isArray(previous.entries)) {
                        return alert('Die bestehende Online-Sicherung mit Wiederherstellungspasswort lässt sich mit dem aktuellen Tresorschlüssel nicht entschlüsseln. Keine Überschreibung: zuerst die Schlüsselzuordnung klären.');
                    }
                }
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Der lokale Tresor wurde inzwischen geändert. Bitte erneut sichern.');
                }
                // Verify the encrypted entry payload before replacing a recoverable cloud copy.
                const verifiedEntries = await decryptVaultPayload(cfg.encryptedData, currentMasterKeyHex);
                if (!verifiedEntries || !Array.isArray(verifiedEntries.entries)) {
                    return alert('Der lokale verschlüsselte Tresorinhalt konnte nicht geprüft werden. Die Online-Sicherung bleibt unverändert.');
                }
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Der lokale Tresor wurde während der Prüfung geändert. Bitte erneut sichern.');
                }
                // Do not upload a configuration that a later recovery would reject.
                if (typeof cfg.ownerName !== 'string' ||
                    typeof cfg.ownerEmail !== 'string' ||
                    !Number.isInteger(cfg.checkInIntervalDays) ||
                    cfg.checkInIntervalDays < 1 || cfg.checkInIntervalDays > 3650 ||
                    typeof cfg.lastCheckIn !== 'string' ||
                    !Number.isFinite(Date.parse(cfg.lastCheckIn)) ||
                    !Array.isArray(cfg.trustees) || cfg.trustees.length > 100 ||
                    !Array.isArray(cfg.alarmPersons) || cfg.alarmPersons.length > 100 ||
                    !cfg.trustees.every(person =>
                        person && typeof person === 'object' && !Array.isArray(person) &&
                        typeof person.name === 'string' && person.name.length <= 500) ||
                    !cfg.alarmPersons.every(person =>
                        person && typeof person === 'object' && !Array.isArray(person) &&
                        typeof person.name === 'string' && person.name.length <= 500)) {
                    return alert('Lokale Kontakte oder Check-in-Einstellungen sind unvollständig oder ungültig. Keine Online-Sicherung erstellt.');
                }
                // Protect all non-key local configuration with the same vault key.
                const configPayload = {
                    ownerName: cfg.ownerName, ownerEmail: cfg.ownerEmail,
                    checkInIntervalDays: cfg.checkInIntervalDays, lastCheckIn: cfg.lastCheckIn,
                    trustees: cfg.trustees, alarmPersons: cfg.alarmPersons
                };
                const encryptedConfig = await encryptVaultPayload(configPayload, currentMasterKeyHex);
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Lokaler Tresor wurde inzwischen geändert. Bitte erneut sichern.');
                }
                // A10: the authenticated account may change while crypto or dialogs await.
                // Never apply a cloud result under a different signed-in account.
                const { data: verifiedAuth, error: verifiedAuthError } = await supabaseClient.auth.getUser();
                if (verifiedAuthError || verifiedAuth?.user?.id !== user.id) {
                    return alert('Konto während des Vorgangs gewechselt. Vorgang abgebrochen.');
                }
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Lokaler Tresor wurde während der Kontoprüfung geändert.');
                }
                const record = { owner_user_id: user.id, vault_id: cfg.vaultId,
                    encrypted_data: cfg.encryptedData, encrypted_config: encryptedConfig };
                let result;
                if (existing) {
                    result = await supabaseClient.from('vault_cloud_snapshots')
                        .update({ encrypted_data: record.encrypted_data,
                            encrypted_config: record.encrypted_config, updated_at: new Date().toISOString() })
                        .eq('owner_user_id', user.id).eq('vault_id', cfg.vaultId).select('vault_id');
                } else {
                    result = await supabaseClient.from('vault_cloud_snapshots').insert(record).select('vault_id');
                }
                if (result.error) throw result.error;
                if (!result.data || result.data.length !== 1) {
                    throw new Error('Online-Speicherung nicht bestätigt.');
                }
                if (localStorage.getItem('digital_estate_vault') !== snapshot ||
                    currentMasterKeyHex !== startingMasterKeyHex ||
                    localSaveRevision !== startingRevision ||
                    lastPersistedRevision !== localSaveRevision) {
                    return alert('Der vorherige Stand wurde gesichert, aber inzwischen gibt es neuere lokale Änderungen. Bitte erneut sichern.');
                }
                if (!silent) alert('Gespeichert');
                return true;
            } catch (error) {
                console.error('Online-Sicherung fehlgeschlagen:', error);
                if (!silent) alert('Online-Sicherung gerade nicht möglich. Bitte später erneut versuchen.');
                return false;
            } finally {
                if (button) button.disabled = false;
            }
        }

        function syncVaultToFirebase(silent = false) {
            const operation = vaultSyncQueue.then(async () => {
                const saved = await backupVaultToSupabase(silent);
                showVaultSyncResult(saved === true);
                return saved === true;
            }).catch(error => {
                console.error('Supabase-Synchronisierung fehlgeschlagen:', error);
                showVaultSyncResult(false);
                if (!silent) alert('Online-Sicherung gerade nicht möglich. Bitte später erneut versuchen.');
                return false;
            });
            vaultSyncQueue = operation.then(() => undefined);
            return operation;
        }

        async function performVaultSync(silent = false) {
            // A10 release gate: the legacy Firestore path uploads contact and
            // check-in metadata without vault encryption. Never write it while
            // the secure migration and ownership review are incomplete.
            if (!silent) {
                const message = 'Die alte Firebase-Tresorsynchronisierung ist aus Sicherheitsgründen deaktiviert. Lokale Daten bleiben erhalten. Bitte die verschlüsselte lokale Sicherung verwenden.';
                const errorText = document.getElementById('syncErrorMessage');
                if (errorText) errorText.textContent = message;
                const loading = document.getElementById('syncStatusLoading');
                if (loading) loading.classList.add('hidden');
                const success = document.getElementById('syncStatusSuccess');
                if (success) success.classList.add('hidden');
                const failure = document.getElementById('syncStatusError');
                if (failure) failure.classList.remove('hidden');
                const overlay = document.getElementById('syncModalOverlay');
                if (overlay) overlay.classList.remove('hidden');
            }
            return false;
            if (!vaultReady) {
                if (!silent) alert('Tresor ist nicht entsperrt. Es wurden keine Daten synchronisiert.');
                return false;
            }
            if (!silent) {
                document.getElementById('syncStatusLoading').classList.remove('hidden');
                document.getElementById('syncStatusSuccess').classList.add('hidden');
                document.getElementById('syncStatusError').classList.add('hidden');
                document.getElementById('syncModalOverlay').classList.remove('hidden');
            }
            if (!db) {
                if (!silent) {
                    document.getElementById('syncErrorMessage').innerText = "Firebase nicht verbunden.";
                    document.getElementById('syncStatusLoading').classList.add('hidden');
                    document.getElementById('syncStatusError').classList.remove('hidden');
                }
                return false;
            }
            
            try {
                const localSnapshot = localStorage.getItem('digital_estate_vault');
                const cfg = localSnapshot ? JSON.parse(localSnapshot) : null;
                const syncRevision = localSaveRevision;
                // Read the exact ciphertext already persisted locally. Re-encrypting
                // mutable in-memory data here could race with a local save.
                if (!cfg || !cfg.encryptedData || !cfg.vaultId) {
                    throw new Error("Kein vollständig gespeicherter lokaler Tresor vorhanden.");
                }

                // A newer local edit must not be represented as already cloud-saved.
                if (syncRevision !== localSaveRevision ||
                    lastPersistedRevision !== localSaveRevision ||
                    localStorage.getItem('digital_estate_vault') !== localSnapshot) {
                    if (!silent) {
                        document.getElementById('syncErrorMessage').innerText =
                            "Der lokale Tresor wurde während der Vorbereitung geändert. Bitte erneut synchronisieren.";
                        document.getElementById('syncStatusLoading').classList.add('hidden');
                        document.getElementById('syncStatusError').classList.remove('hidden');
                    }
                    return false;
                }
                await db.collection("vaults").doc(cfg.vaultId).set({
                    vaultId: cfg.vaultId,
                    ownerName: cfg.ownerName || "",
                    ownerEmail: cfg.ownerEmail || "",
                    lastCheckIn: cfg.lastCheckIn,
                    checkInIntervalDays: cfg.checkInIntervalDays,
                    alarmPersons: cfg.alarmPersons || [],
                    encryptedData: cfg.encryptedData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                
                // The write may have succeeded for an older snapshot while the user
                // continued editing locally. Do not claim the latest state is synced.
                if (syncRevision !== localSaveRevision ||
                    localStorage.getItem('digital_estate_vault') !== localSnapshot) {
                    if (!silent) {
                        document.getElementById('syncErrorMessage').innerText =
                            "Während der Online-Speicherung wurden neuere lokale Änderungen vorgenommen. Bitte erneut synchronisieren.";
                        document.getElementById('syncStatusLoading').classList.add('hidden');
                        document.getElementById('syncStatusSuccess').classList.add('hidden');
                        document.getElementById('syncStatusError').classList.remove('hidden');
                    }
                    return false;
                }
                // Keine alte Konfiguration zurück in localStorage schreiben:
                // Während des Online-Aufrufs können neuere lokale Änderungen entstanden sein.
                // Der erfolgreiche Firestore-Schreibvorgang ist bereits bestätigt.
                // Ein Fehler bei der nachgelagerten Alarmabfrage darf diesen Erfolg
                // nicht nachträglich als fehlgeschlagene Speicherung darstellen.
                try {
                    await checkIncomingAlarms();
                } catch (alarmError) {
                    console.warn("Alarmprüfung nach Online-Speicherung fehlgeschlagen:", alarmError);
                }
                // Alarm checks are asynchronous: local changes during this
                // follow-up must not turn an old cloud snapshot into a success.
                const stillCurrent = syncRevision === localSaveRevision &&
                    lastPersistedRevision === localSaveRevision &&
                    localStorage.getItem('digital_estate_vault') === localSnapshot;
                if (!silent) {
                    document.getElementById('syncStatusLoading').classList.add('hidden');
                    if (stillCurrent) {
                        document.getElementById('syncStatusSuccess').classList.remove('hidden');
                    } else {
                        document.getElementById('syncErrorMessage').innerText =
                            "Nach der Online-Speicherung wurden neuere lokale Änderungen erkannt. Bitte erneut synchronisieren.";
                        document.getElementById('syncStatusSuccess').classList.add('hidden');
                        document.getElementById('syncStatusError').classList.remove('hidden');
                    }
                }
                return stillCurrent;
            } catch(e) {
                if (!silent) {
                    console.error("Firebase-Synchronisierung fehlgeschlagen:", e);
                    document.getElementById('syncErrorMessage').innerText =
                        "Online-Sicherung nicht möglich. Bitte Internetverbindung und Berechtigungen prüfen und später erneut versuchen.";
                    document.getElementById('syncStatusLoading').classList.add('hidden');
                    document.getElementById('syncStatusError').classList.remove('hidden');
                }
                return false;
            }
        }

        async function checkIncomingAlarms() {
            if (!db) return;
            try {
                const cfg = getVaultConfig();
                if (!cfg || !cfg.vaultId) return;

                const docRef = await db.collection("vaults").doc(cfg.vaultId).get();
                if (!docRef.exists) return;

                const data = docRef.data();
                const banner = document.getElementById('emergencyAlarmBanner');
                const detailsText = document.getElementById('alarmDetailsText');

                let activeAlarmFound = false;
                let alarmSender = "Vertrauensperson";

                if (data.emergencyTriggers) {
                    for (let personKey in data.emergencyTriggers) {
                        const trigger = data.emergencyTriggers[personKey];
                        if (trigger && (trigger.status === "active" || trigger.status === "test_active")) {
                            activeAlarmFound = true;
                            const foundPerson = (cfg.alarmPersons || []).find(p => p.id === personKey);
                            alarmSender = foundPerson ? foundPerson.name : personKey;
                        }
                    }
                }

                if (activeAlarmFound) {
                    banner.classList.remove('hidden');
                    detailsText.innerText = `Der Alarm wurde von "${alarmSender}" ausgelöst. Klicke auf Entwarnung, um den Timer zurückzusetzen.`;
                } else {
                    banner.classList.add('hidden');
                }
            } catch (e) {
                console.error("Fehler beim Prüfen der Alarme:", e);
            }
        }

        async function clearEmergencyAlarm() {
            if (!vaultReady) { alert('Tresor ist nicht entsperrt.'); return; }
            // A10: never write plaintext check-in metadata to the retired Firestore vault.
            alert('Die alte Firebase-Entwarnung ist aus Sicherheitsgründen deaktiviert. Es wurde kein Alarm zurückgesetzt und keine lokale Check-in-Zeit verändert.');
            return;
            if (!confirm("Möchtest du Entwarnung geben und den Alarm zurücksetzen?")) return;

            try {
                const cfg = getVaultConfig();
                await db.collection("vaults").doc(cfg.vaultId).update({
                    emergencyTriggers: {},
                    lastCheckIn: new Date().toISOString()
                });

                cfg.lastCheckIn = new Date().toISOString();
                localStorage.setItem('digital_estate_vault', JSON.stringify(cfg));

                document.getElementById('emergencyAlarmBanner').classList.add('hidden');
                alert("Gespeichert");
                renderApp();
            } catch (e) {
                alert("Fehler beim Zurücksetzen: " + e.message);
            }
        }

        function renderApp() {
            const cfg = getVaultConfig();
            if (!cfg) return;

            const lastCheck = new Date(cfg.lastCheckIn);
            const diffDays = Math.floor((new Date() - lastCheck) / (1000 * 60 * 60 * 24));
            const remaining = (cfg.checkInIntervalDays || 30) - diffDays;

            const countdownEl = document.getElementById('deadmanCountdown');
            if (countdownEl) countdownEl.innerText = remaining <= 0 ? "0 Tage (Abgelaufen)" : `${remaining} Tage`;
            
            const lastCheckEl = document.getElementById('deadmanLastCheck');
            if (lastCheckEl) lastCheckEl.innerText = `Letzter Check-in: ${lastCheck.toLocaleDateString('de-DE')}`;
            
            const intervalSel = document.getElementById('deadmanIntervalSelect');
            if (intervalSel) intervalSel.value = cfg.checkInIntervalDays || 30;

            const trusteesGrid = document.getElementById('trusteesGrid');
            if (trusteesGrid) {
                trusteesGrid.innerHTML = cfg.trustees.map((t, idx) => `
                    <div class="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                        <span class="font-bold text-indigo-400">Vertrauensperson #${idx + 1}</span>
                        <input type="text" id="tName_${idx}" value="${escapeHtml(t.name)}" class="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200">
                        <input type="text" id="tRole_${idx}" value="${escapeHtml(t.role)}" class="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200">
                    </div>
                `).join('');
            }

            const ownerNameInput = document.getElementById('ownerNameInput');
            if (ownerNameInput) ownerNameInput.value = cfg.ownerName || "";
            
            const ownerEmailInput = document.getElementById('ownerEmailInput');
            if (ownerEmailInput) ownerEmailInput.value = cfg.ownerEmail || "";

            renderVaultEntries();
            renderAlarmPersons();
        }

        // Tresordaten beim Einfügen in HTML und Attribute sicher kodieren.
        function escapeHtml(value) {
            const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
            return String(value ?? "").replace(/[&<>"']/g, character => entities[character]);
        }

        function renderVaultEntries() {
            const container = document.getElementById('vaultEntriesList');
            if (!container) return;
            const entries = currentDecryptedVault.entries || [];
            if (entries.length === 0) {
                container.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">Keine Einträge vorhanden.</p>`;
                return;
            }
            container.innerHTML = entries.map(e => `
                <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                    <div>
                        <span class="font-bold text-slate-100 text-sm">${escapeHtml(e.title)}</span> <span class="text-indigo-400">(${escapeHtml(e.category)})</span>
                        <p class="text-slate-300 font-mono mt-1">${escapeHtml(e.content)}</p>
                    </div>
                    <button data-id="${escapeHtml(e.id)}" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg delete-entry-btn">Löschen</button>
                </div>
            `).join('');
        }

        function renderAlarmPersons() {
            const cfg = getVaultConfig();
            const container = document.getElementById('alarmPersonsList');
            if (!container) return;
            if (!cfg?.alarmPersons?.length) {
                container.textContent = 'Noch keine Personen angelegt.';
                return;
            }
            container.innerHTML = cfg.alarmPersons.map((p, idx) => `
                <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                    <div>
                        <span class="font-bold text-slate-100">${escapeHtml(p.name)}</span>
                        ${p.contact ? `<span class="text-slate-400 text-[11px] ml-2">(${escapeHtml(p.contact)})</span>` : ''}
                        
                    </div>
                    <button data-idx="${idx}" class="px-2 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[11px] delete-person-btn">Kontakt entfernen</button>
                </div>
            `).join('');
            window.dispatchEvent(new Event('estate:people-updated'));
        }

        async function saveSettings() {
            const nameInput = document.getElementById('ownerNameInput').value.trim();
            const emailInput = document.getElementById('ownerEmailInput').value.trim();
            
            if (!nameInput) {
                alert("Bitte gib zumindest deinen Namen ein.");
                return;
            }
            
            let locallySaved = false;
            try {
                locallySaved = await updateLocalConfig(cfg => {
                    cfg.ownerName = nameInput;
                    cfg.ownerEmail = emailInput;
                });
            } catch (error) {
                console.error("Lokales Speichern der Einstellungen fehlgeschlagen:", error);
            }
            if (!locallySaved) {
                alert("❌ Einstellungen konnten nicht lokal gespeichert werden. Es wurde keine Online-Sicherung gestartet.");
                return;
            }
            const cloudSaved = await syncVaultToFirebase(true);
            alert(cloudSaved ? "Gespeichert" : "Auf diesem Gerät gespeichert. Die Online-Sicherung ist gerade nicht möglich.");
        }

        async function addAlarmPerson() {
            const nameInput = document.getElementById('newAlarmPersonName');
            const contactInput = document.getElementById('newAlarmPersonContact');
            const name = nameInput.value.trim();
            if (!name) { alert("Bitte Namen eingeben."); return; }
            const existingPeople = getVaultConfig()?.alarmPersons || [];
            if (existingPeople.length >= 10) { alert("Du hast bereits 10 Vertrauenspersonen."); return; }
            const contactEmail = contactInput.value.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
                alert("Bitte gib eine gültige E-Mail-Adresse ein."); return;
            }

            // Names must not leak into identifiers; legacy person IDs remain readable.
            const personId = "p_" + Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
            const contact = contactInput.value.trim();
            let locallySaved = false;
            try {
                locallySaved = await updateLocalConfig(cfg => {
                    if (!cfg.alarmPersons) cfg.alarmPersons = [];
                    if (cfg.alarmPersons.length >= 10) throw new Error("Maximal 10 Vertrauenspersonen.");
                    cfg.alarmPersons.push({ id: personId, name, contact });
                    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
                    const keyCode = Array.from(keyBytes, b => b.toString(16).padStart(2, '0')).join('');
                    if (!currentDecryptedVault.trusteeKeys) currentDecryptedVault.trusteeKeys = {};
                    currentDecryptedVault.trusteeKeys[personId] = keyCode;
                });
            } catch (error) {
                console.error("Lokales Speichern des Notfallkontakts fehlgeschlagen:", error);
            }
            if (!locallySaved) {
                alert("❌ Notfallkontakt konnte nicht lokal gespeichert werden. Es wurde keine Online-Sicherung gestartet. Bitte versuche es erneut.");
                return;
            }
            const contactCloudSaved = await syncVaultToFirebase(true);
            if (!contactCloudSaved) {
                alert("⚠️ Notfallkontakt nur lokal hinzugefügt. Die Cloud ist nicht aktualisiert; der Notfallzugang ist derzeit nicht zuverlässig verfügbar.");
            }
            nameInput.value = "";
            contactInput.value = "";
            renderAlarmPersons();
        }

        async function deleteAlarmPerson(idx) {
            const personId = getVaultConfig().alarmPersons?.[idx]?.id;
            if (!personId) {
                alert("Notfallkontakt nicht gefunden. Bitte Liste aktualisieren.");
                return;
            }
            const removed = await updateLocalConfig(cfg => {
                const personIndex = (cfg.alarmPersons || []).findIndex(person => person.id === personId);
                if (personIndex === -1) throw new Error("Notfallkontakt wurde bereits geändert.");
                cfg.alarmPersons.splice(personIndex, 1);
                if (currentDecryptedVault.trusteeKeys) delete currentDecryptedVault.trusteeKeys[personId];
            }).catch(error => {
                alert("Notfallkontakt konnte nicht gelöscht werden: " + error.message);
                return false;
            });
            if (!removed) return;
            const deletionCloudSaved = await syncVaultToFirebase(true);
            if (!deletionCloudSaved) {
                alert("⚠️ Notfallkontakt nur lokal gelöscht. Die Cloud ist nicht aktualisiert; der bisherige Zugang kann nach einer späteren Freigabe weiterhin bestehen.");
            }
            renderAlarmPersons();
        }

        async function saveVaultEntry() {
            const title = document.getElementById('entryTitle').value.trim();
            const category = document.getElementById('entryCategory').value;
            const content = document.getElementById('entryContent').value.trim();
            if (!title || !content) { alert("Titel und Inhalt erforderlich!"); return; }

            const entry = { id: Date.now(), title, category, content };
            let locallySaved = false;
            try {
                locallySaved = await updateLocalConfig(() => {
                    currentDecryptedVault.entries.unshift(entry);
                });
            } catch (error) {
                console.error("Lokales Speichern des Tresoreintrags fehlgeschlagen:", error);
            }
            if (!locallySaved) {
                alert("❌ Tresoreintrag konnte nicht dauerhaft lokal gespeichert werden. Es wurde keine Online-Sicherung gestartet. Bitte lade die Tresordaten neu, bevor du weitere Änderungen vornimmst.");
                return;
            }
            document.getElementById('entryTitle').value = "";
            document.getElementById('entryContent').value = "";
            renderVaultEntries();
            const entryCloudSaved = await syncVaultToFirebase(true);
            alert(entryCloudSaved ? "Gespeichert" : "Auf diesem Gerät gespeichert. Die Online-Sicherung ist gerade nicht möglich.");
        }

        async function deleteVaultEntry(id) {
            let locallySaved = false;
            try {
                locallySaved = await updateLocalConfig(() => {
                    currentDecryptedVault.entries = currentDecryptedVault.entries.filter(e => e.id !== id);
                });
            } catch (error) {
                console.error("Lokales Löschen des Tresoreintrags fehlgeschlagen:", error);
            }
            if (!locallySaved) {
                alert("❌ Löschen des Tresoreintrags konnte nicht dauerhaft lokal gespeichert werden. Es wurde keine Online-Sicherung gestartet. Bitte lade die Tresordaten neu, bevor du weitere Änderungen vornimmst.");
                return;
            }
            renderVaultEntries();
            const deletionCloudSaved = await syncVaultToFirebase(true);
            if (!deletionCloudSaved) {
                alert("⚠️ Tresoreintrag nur lokal gelöscht. Eine ältere verschlüsselte Kopie kann weiterhin in der Cloud vorhanden sein. Die Online-Löschung wurde NICHT bestätigt.");
            }
        }

        async function performCheckIn() {
            const checkInTime = new Date().toISOString();
            let locallySaved = false;
            try {
                locallySaved = await updateLocalConfig(cfg => {
                    cfg.lastCheckIn = checkInTime;
                });
            } catch (error) {
                console.error("Lokaler Check-in konnte nicht gespeichert werden:", error);
            }
            if (!locallySaved) {
                alert("❌ Check-in konnte nicht lokal gespeichert werden. Es wurde keine Online-Sicherung gestartet; die Notfallüberwachung ist nicht zuverlässig verfügbar.");
                return;
            }
            renderApp();
            const cloudCheckInSaved = await syncVaultToFirebase(true);
            // A local check-in never counts as server-side emergency cancellation.
            const canceled = await (window.estateOwnerCancelAlarm?.() ?? Promise.resolve(false));
            if (canceled) {
                alert("Lebenszeichen gespeichert. Ein laufender Notfallalarm wurde beendet.");
            } else {
                alert("Lebenszeichen lokal gespeichert. Die Entwarnung auf dem Server ist noch offen – bitte melde dich an und versuche es erneut.");
            }
        }

        async function updateDeadmanInterval() {
            const interval = Number(document.getElementById('deadmanIntervalSelect').value);
            if (!Number.isSafeInteger(interval) || interval < 1 || interval > 365) {
                alert("Bitte ein gültiges Check-in-Intervall zwischen 1 und 365 Tagen wählen.");
                return;
            }
            let locallySaved = false;
            try {
                locallySaved = await updateLocalConfig(cfg => {
                    cfg.checkInIntervalDays = interval;
                });
            } catch (error) {
                console.error("Lokales Speichern des Check-in-Intervalls fehlgeschlagen:", error);
            }
            if (!locallySaved) {
                alert("❌ Check-in-Intervall konnte nicht lokal gespeichert werden. Es wurde keine Online-Sicherung gestartet; die Notfallüberwachung ist nicht zuverlässig verfügbar.");
                return;
            }
            const intervalCloudSaved = await syncVaultToFirebase(true);
            if (!intervalCloudSaved) {
                alert("⚠️ Check-in-Intervall nur lokal gespeichert. Die Online-Frist wurde NICHT aktualisiert; die Notfallüberwachung ist derzeit nicht zuverlässig verfügbar.");
            }
        }

        async function saveTrustees() {
            const trusteeValues = Array.from({ length: 3 }, (_, i) => ({
                name: document.getElementById(`tName_${i}`).value.trim(),
                role: document.getElementById(`tRole_${i}`).value.trim()
            }));
            let locallySaved = false;
            try {
                locallySaved = await updateLocalConfig(cfg => {
                    trusteeValues.forEach((trustee, i) => {
                        cfg.trustees[i].name = trustee.name;
                        cfg.trustees[i].role = trustee.role;
                    });
                });
            } catch (error) {
                console.error("Lokales Speichern der Vertrauenspersonen fehlgeschlagen:", error);
            }
            if (!locallySaved) {
                alert("❌ Vertrauenspersonen konnten nicht lokal gespeichert werden. Es wurde keine Online-Sicherung gestartet. Bitte versuche es erneut.");
                return;
            }
            const trusteesCloudSaved = await syncVaultToFirebase(true);
            alert(trusteesCloudSaved ? "Gespeichert" : "Nur auf diesem Gerät gespeichert. Der Notfallzugang ist gerade nicht verfügbar.");
        }

        // Emergency contact sheet: no secret keys, passwords or access links.
        function renderPrintableKit() {
            const container = document.getElementById('kitSharesPreview');
            if (!container) return;
            const contacts = getVaultConfig()?.alarmPersons || [];
            container.replaceChildren();
            if (window.estateRenderPrintChoices) { window.estateRenderPrintChoices(); return; }
            const intro = document.createElement('p');
            intro.className = 'text-sm text-slate-300 col-span-full';
            intro.textContent = contacts.length
                ? 'Diese Kontakte stehen auf deinem Ausdruck. Passwörter und geheime Schlüssel werden nicht mitgedruckt.'
                : 'Noch keine Notfallkontakte eingetragen. Du kannst sie unter „Vertrauenspersonen“ hinzufügen.';
            container.append(intro);
            for (const person of contacts) {
                const card = document.createElement('div');
                card.className = 'rounded-xl border border-slate-700 p-3 text-sm text-slate-100';
                const name = document.createElement('strong');
                name.textContent = person.name || 'Kontakt';
                const detail = document.createElement('p');
                detail.textContent = person.contact || '';
                card.append(name, detail);
                container.append(card);
            }
        }

        function generatePrintableKitPDF() {
            const contacts = getVaultConfig()?.alarmPersons || [];
            if (!contacts.length) {
                alert('Bitte lege zuerst einen Notfallkontakt an.');
                return false;
            }
            const printable = window.open('', '_blank');
            if (!printable) {
                alert('Bitte erlaube das Öffnen eines neuen Fensters und versuche es erneut.');
                return false;
            }
            const doc = printable.document;
            doc.title = 'Meine Notfallkontakte';
            const style = doc.createElement('style');
            style.textContent = 'body{font:18px/1.5 system-ui,sans-serif;color:#17223d;max-width:750px;margin:40px auto;padding:0 20px}h1{font-size:28px}li{margin:18px 0;break-inside:avoid}small{color:#555}@media print{body{margin:15mm auto}}';
            doc.head.append(style);
            const title = doc.createElement('h1');
            title.textContent = 'Meine Notfallkontakte';
            const note = doc.createElement('p');
            note.textContent = 'Diese Liste enthält keine Passwörter oder Zugangsschlüssel.';
            const list = doc.createElement('ol');
            for (const person of contacts) {
                const item = doc.createElement('li');
                const name = doc.createElement('strong');
                name.textContent = person.name || 'Kontakt';
                const detail = doc.createElement('div');
                detail.textContent = person.contact || '';
                item.append(name, detail);
                list.append(item);
            }
            doc.body.append(title, note, list);
            printable.focus();
            printable.print();
            return true;
        }

    // Replace legacy inline event attributes with delegated, explicit listeners.
document.querySelector('[data-heir-auth-action="login"]')?.addEventListener('click',()=>supabaseLogin());
document.querySelector('[data-heir-auth-action="register"]')?.addEventListener('click',()=>supabaseRegister());
document.getElementById('btn-logout')?.addEventListener('click',()=>supabaseLogout());
