# Nachlass v2 – Schlüsselhüllen und Recovery (Sicherheitsentwurf)

Stand: 2026-11-10. **Nicht implementierte Kryptografie; keine Migration und keine produktive Freigabe.**

## Vertrauensmodell

Der Eigentümer besitzt die Entschlüsselungsberechtigung seines Tresors. Jede Erbenperson hat eine eigenständige verifizierte Identität und ein getrenntes kryptografisches Schlüsselpaar. Ein Link, eine Kontaktadresse, eine Client-Uhr oder ein übermitteltes Rollenfeld erteilen niemals Zugriff. Der Server verwaltet Einladungen, Zustandsübergänge und eine geschützte Freigabeschranke. Er darf den Klartext-DEK nicht dauerhaft speichern.

**Kritische Designentscheidung:** Eine bereits für den Erben entschlüsselbare DEK-Hülle darf nicht vor Freigabe abrufbar sein. Ein vorzeitig ausgehändigter privater Schlüssel oder eine Kombination aus Hülle und Client-Geheimnis darf den DEK nicht vor Freigabe rekonstruieren. Der Erbe darf nur nach erneuter serverseitiger Autorisierung das zur Entschlüsselung erforderliche Material erhalten.

## Daten- und Kryptogrenzen

1. Pro v2-Tresor ein neuer kryptografisch zufälliger 256-Bit-Datenverschlüsselungsschlüssel (DEK); Inhaltsverschlüsselung mit einer geprüften AEAD-Konstruktion, eindeutigen Nonces und authentisierter Bindung an Tresor-ID, Schema-Version und Datenrevision.
2. Je Erbenperson ein getrenntes, versioniertes Envelope, gebunden an Tresor, Empfängeridentität und Schlüsselgeneration. Bevorzugte Kandidatenkonstruktion: RFC-9180-HPKE mit X25519, HKDF-SHA256 und AES-256-GCM. Die konkrete Serialisierung, HPKE-`enc`-Komponente, `info`/`aad` und Nonce-Ableitung müssen **vor Implementierung** anhand RFC 9180 und unabhängigen Testvektoren festgelegt werden. Ein frei übergebenes Nonce-Feld ist **kein** Nachweis korrekter HPKE-Nutzung.
3. `key-envelope-contract-v2.cjs` validiert nur eine **vorläufige Metadatenform**, nicht HPKE-Ciphertexte, Schlüssel, Signaturen, Empfängerbindung oder AEAD-Tags. Das Feld `wrappedDek` darf keine Klartextschlüssel enthalten; die tatsächliche Kryptografie und ihr Format sind noch zu prüfen. Kein Modul kann Schlüssel freigeben.
4. Der Server muss Empfängeridentität, Einladung, Widerruf, Freigabezustand und Schlüsselgeneration bei jedem Abruf aus vertrauenswürdigen Quellen erneut prüfen. Kein direkter Firestore-Clientzugriff auf gesperrte Schlüsselhüllen.
5. DEK-Rotation nach Kompromittierung; nach einer Offenlegung lässt sich früher bekanntes Material nicht zurückholen. Versions- und Migrationszustände müssen rollback-sicher sein.

## Recovery unabhängig von Erbenfreigabe

- Eigentümer erhält einen **separaten** Recovery-Weg, unabhängig von Erben-Links und dem künftigen Freigabeprozess.
- Recovery-Material wird nur nach ausdrücklicher Eigentümeraktion erzeugt und exportiert. Kein Schlüssel in URLs, HTML-Attributen, Logs, Telemetrie oder E-Mail-Tracking.
- Recovery-Backup ist verschlüsselt und versioniert; Wiederherstellung wird offline mit synthetischen Daten und anschließend ausdrücklich vom Eigentümer mit seinem Backup geprüft.
- Ein fehlgeschlagener Restore, falsche Schlüsselgeneration, nicht verifizierter Backup-Hash oder unklare Identität stoppt jede Migration. Legacy-Daten bleiben unverändert.
- Die tatsächliche Recovery-Konstruktion (z. B. passphrasenbasierte Schlüsselableitung mit geeigneter KDF und Parametern oder hardwaregestützter Schlüssel) benötigt gesondertes Threat Modeling. Keine selbst erfundene Krypto.

## Sicherheits- und Rollout-Gates

- Firestore-PROD-Regeltext aus `nachlass-app-99df8` prüfen; isolierte Emulator-Negativtests.
- Identity Provider, verifizierte Erbenidentität, Einladungs- und Widerrufsmodell festlegen.
- HPKE-Testvektoren, Cross-Recipient-Negativtests, Replay-/Rollback- und Nonce-Reuse-Tests durchführen.
- Freigabe nur in transaktionaler serverseitiger Autorisierung; serverseitige Uhr; Auditierung ohne Geheimnisse.
- Unabhängige Sicherung, Recovery-Roundtrip und Eigentümer-Opt-in nachweisen.
- Migration bleibt technisch deaktiviert. Keine produktiven Datenbankänderungen oder Deployments durch diese Vorbereitung.

## Offene Designfragen

- Wie wird die öffentliche Erben-Schlüsselidentität vertrauenswürdig registriert und bei Gerätewechsel rotiert?
- Wer verwahrt das noch nicht freizugebende Schlüsselmaterial, ohne dass ein kompromittierter Server allein den DEK rekonstruieren kann?
- Welche Sicherheitsgarantie gilt bei kompromittiertem Erben-Gerät, kompromittiertem Server und bereits verteilten Legacy-Links?
- Wie wird der Eigentümer bei einem echten Todesfall verifiziert, statt lediglich eine 24-Stunden-Frist als Todesnachweis zu behandeln?

**Keine Produktionsfreigabe, bis diese Fragen überprüfbar beantwortet sind.**

## Isolierter Eigentümer-Recovery-Prototyp (2026-11-10)

`tools/digitaler-nachlass/recovery-offline-v2.cjs` enthält jetzt zwei **ausschließlich lokal aufrufbare** Funktionen: `wrapRecoveryKey` und `unwrapRecoveryKey`. Sie ver- bzw. entschlüsseln **einen bereits vorhandenen 32-Byte-DEK** mit AES-256-GCM. Der Wrapping-Key wird per Node.js-`scrypt` aus einer vom Eigentümer bereitgestellten Passphrase und einem zufälligen 32-Byte-Salt abgeleitet (N=16384, r=8, p=1, maxmem=32 MiB). Jede Hülle erhält eine neue zufällige 12-Byte-Nonce; das AEAD-AAD bindet Schema-Version, Vault-ID und Schlüsselgeneration. Der AEAD-Tag ist 16 Byte. Der abgeleitete Wrapping-Key wird nach Verwendung aus dem Buffer gelöscht.

**Grenzen:** Die Mindestlänge von 16 Zeichen garantiert keine hohe Passphrasen-Entropie. Die KDF-Parameter sind ein prototypischer, nicht kalibrierter Ausgangspunkt und müssen vor Freigabe einem Offline-Angriffs- und Performance-Review unterzogen werden (ggf. Argon2id). JavaScript/Node.js können Kopien von Passphrasen und Schlüsseln im Speicher nicht zuverlässig vollständig löschen. Die Hülle ist **kein** Backup der Tresordaten und kein Beweis, dass ein bestehender Legacy-Tresor migriert werden kann. Die Funktionen werden von der produktiven Webseite und den APIs **nicht** aufgerufen. Es gibt keinen Passwort-Reset ohne Recovery-Material.

`tests/nachlass-recovery-offline-v2.test.cjs` prüft mit ausschließlich synthetischen Zufalls-DEKs: Verschlüsselungs-Roundtrip, unterschiedliche Salts/Nonces, falsche Passphrase, Vault-/Schlüsselgenerations-Bindung, Manipulation und Ablehnung ungültiger Parameter.

**HPKE ist weiterhin nicht implementiert.** Das oben beschriebene AES-GCM-Recovery-Verfahren ist unabhängig von der geplanten HPKE-Erbenhülle. Die bisherige `key-envelope-contract-v2.cjs` ist ein vorläufiger Metadatenvalidator; insbesondere sind HPKE-`enc`, `info`, `aad`, Serialisierung und die Rolle einer zusätzlichen Nonce noch nicht RFC-9180-konform spezifiziert. Keine produktive Freigabe oder Migration.
