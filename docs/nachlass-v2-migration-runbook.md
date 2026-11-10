# Nachlass v2 – Migrations-Runbook (Vorbereitung, keine Ausführung)

Stand: 2026-11-10. **STOP: Migration und Freigabe sind deaktiviert.** Dieses Runbook beschreibt die Voraussetzungen für eine künftige, ausdrücklich freigegebene Migration. Weder produktive Daten noch Firebase-/Supabase-Konfigurationen werden durch die beigefügten Prüfmodule verändert.

## 1. Bestehende Sicherheitseigenschaften und Grenzen

- Bestehende Legacy-Tresore nutzen einen im Browser lokal gespeicherten Masterschlüssel. Bestehende Erben-Links enthalten `#key=<Schlüssel>`; jede Person mit vollständigem Link kann damit potenziell entschlüsseln. Die angezeigte 24-Stunden-Frist erzwingt **keine** kryptografische Sperre.
- Vorhandene Links können **nicht** rückwirkend widerrufen werden. Auch eine v2-Migration macht bereits verbreitete Legacy-Schlüssel nicht geheim.
- Firestore-PROD-Regeln von `nachlass-app-99df8` sind noch nicht geprüft. Keine Behauptung, dass aktuelle Firestore-Lese- oder Schreibrechte sicher sind.
- `migration-preflight-v2.cjs` prüft ausschließlich **Strukturmerkmale** einer lokalen Legacy-Konfiguration. `eligible: true` ist **keine** Sicherheitsfreigabe, kein Beweis korrekter Entschlüsselung und keine Erlaubnis zur Migration. `decideMigrationGate` verweigert ausnahmslos jede Migration.

## 2. Sicherheits- und Produkt-Gates vor einer Implementierung

1. Produktive Firestore Security Rules als reinen Regeltext offline prüfen; Zugriffsmatrix und Emulator-Negativtests für anonym, Inhaber, eingeladenen Erben und Fremde.
2. Authentisierungsanbieter verbindlich festlegen. Signatur, Issuer, Audience, Ablauf, Token-Sperrung und aktive Einladung **serverseitig** verifizieren.
3. Schlüsselmodell unabhängig prüfen: neuer zufälliger 256-Bit-DEK je v2-Tresor; AEAD mit eindeutigen Nonces; separater Recovery-Pfad. Kein v2-Link mit DEK, Legacy-Masterschlüssel oder rekonstruierbarem Entschlüsselungsmaterial.
4. Freigabe der Erben-Schlüsselhülle nur nach atomarer serverseitiger Zustands- und Berechtigungsprüfung; Widerruf vor Release; nach Schlüsseloffenlegung nur Rotation.
5. Verifizierte **unabhängige Sicherung** der Legacy-Daten und eine erfolgreiche Wiederherstellungsprobe in einer isolierten Umgebung. Kein bloßer Export ohne Restore-Test.
6. Explizite Einwilligung des Eigentümers nach klarer Warnung, dass alte Links nicht zurückgerufen werden können. Kein stilles Upgrade beim Seitenaufruf.
7. Eine v2-Testmigration mit synthetischen Daten in isolierter Umgebung; Roundtrip-Verschlüsselung, Einladung, Replay-/Parallelitätsfälle, Abbruch und Recovery nachweisen.
8. Rollout nur mit versioniertem Schema, unabhängiger Monitoring-/Auditierung und überprüftem Rollback. Erst nach Freigabe in separatem Change-Prozess produktiv schalten.

## 3. Vorgesehene Abfolge nach Freigabe (noch NICHT implementiert)

- **Inventarisieren:** Legacy-Format erkennen, Metadaten validieren, bestehende IDs beibehalten. Keine Schlüssel in Logs, Reports oder URLs.
- **Sichern und prüfen:** lokal/isoliert vollständigen Restore bestätigen; Sicherungs- und Wiederherstellungsnachweis ohne Geheimnisse erfassen.
- **Neu verschlüsseln:** Legacy-Daten nur in vertrauenswürdigem, freigegebenem Kontext entschlüsseln; mit neuem DEK unter frischer Nonce verschlüsseln; Authentizität und Wiederherstellbarkeit prüfen.
- **Erben einladen:** verifizierte Identitäten und unabhängige Schlüsselhüllen vorbereiten, niemals den DEK im Link versenden.
- **Paralleler Zustand:** Legacy unverändert erhalten, v2 zunächst gesperrt. Keine automatische Löschung alter Daten oder Verweise.
- **Umschalten:** erst nach ausdrücklicher Inhaberfreigabe und bestandener End-to-End-Prüfung; serverseitiges Audit und idempotente Transaktion.
- **Rollback:** vor Freigabe v2 deaktivieren und Legacy aus unabhängiger Sicherung wiederherstellen. Bereits offengelegte Schlüssel können durch Rollback nicht zurückgerufen werden.

## 4. Stop-/Abbruchbedingungen

Abbruch bei fehlenden Firebase-Regeln, unklarer Identität, nicht nachgewiesenem Restore, unvollständiger Schlüsselhüllenprüfung, Datenabweichung, nicht atomaren Zustandsübergängen, ausstehendem Widerruf oder fehlender Einwilligung. **Fail closed.** Kein produktiver Versuch zur Fehlersuche und keine Testdatensätze in PROD.

## 5. Nachweis und aktueller Stand

- GitHub Actions `B3 Nachlass pilot`, Lauf 42775931981 (Commit `4209b1d`): 25 Node-Tests und 9 Browser-Tests erfolgreich.
- Neue isolierte Tests `tests/nachlass-migration-preflight-v2.test.cjs` prüfen strukturelle Ablehnung, Geheimnisfreiheit des Ergebnisses, Unveränderlichkeit des Inputs und ausnahmslos gesperrte Ausführung.
- Die Tests und der vollständige Workflow müssen für den **neuen** Commit erneut erfolgreich sein, bevor der Vorbereitungscode als geprüft gilt.
- Es gibt **keine** aktive v2-Migration, kein produktives v2-Deployment, keine Änderung an bestehenden Tresoren und keine neue Datenbankmigration.
