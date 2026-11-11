# Helferlein 10 – Roadmap Nachlassverwaltung und Erben-Portal

**Stand:** 10. November 2026  
**Status:** Geplant / in Umsetzung; keine produktive Erbenfreigabe nachgewiesen  
**Geltungsbereich:** Ausschließlich Nachlassverwaltung (digitaler Tresor) und Erben-Portal  
**Arbeitsweise:** Möglichst große, abgeschlossene Umsetzungspakete auf GitHub `main`, mit gezielten Freigabeprüfungen statt zusätzlicher Kleinsttests.

> Diese Roadmap dokumentiert den Audit-Befund und die weitere Umsetzung. Sie ist keine Freigabe zur Umgehung von Sicherheitsprüfungen. Produktive Nutzerdaten dürfen nicht gelöscht oder als Testdaten verwendet werden.

## 1. Audit – bestätigter und offener Stand

- Das GitHub-Repository `duhrrom11/Helferlein` und der Zweig `main` sind erreichbar.
- Das aktive Supabase-Projekt `Helferlein` nutzt PostgreSQL 17.11; es handelt sich **nicht** um eine isolierte Testinstanz.
- In `public` existiert `vault_cloud_snapshots` mit aktivierter RLS; die Einladungs- und Vertrauenspersonen-Tabellen aus den Review-/Staging-Entwürfen wurden bei der letzten Bestandsaufnahme nicht als produktive Tabellen gefunden.
- Bei der letzten Prüfung waren keine Edge Functions im Supabase-Projekt deployed. Im Repository enthaltene `vault-api`- und Einladungspfade waren teilweise gesperrt/Platzhalter.
- Das vorhandene Erben-Portal enthält noch Firebase-bezogene Altlogik; die vollständige Supabase-Integration ist nicht nachgewiesen.
- Bestehende Offline-Sicherheitstests und SQL-Review-Entwürfe sind Vorarbeiten, aber **kein** Nachweis für echte RLS-/EXECUTE-Berechtigungen, Nebenläufigkeit oder sichere Schlüsselübergabe.
- Die projektweiten Supabase-Sicherheitswarnungen betreffen teilweise andere Module und werden nicht ohne gesonderten Auftrag umgebaut. Authentifizierungsrisiken, die den Nachlass betreffen, müssen jedoch bei der Freigabe berücksichtigt werden.

**Kritischer Architekturpunkt:** Nach einer berechtigten Freigabe muss ein Erbe genau die vorgesehenen verschlüsselten Inhalte entschlüsseln können, ohne dass Server, andere Nutzer oder widerrufene Berechtigte unbeabsichtigt Zugriff erhalten. Statusfelder allein lösen die Schlüsselübergabe nicht.

## 2. Priorisierte Restarbeiten

| Prio | Arbeit | Abschlusskriterium |
| --- | --- | --- |
| P0 | Rollen-, Identitäts- und Schlüsselzugriffsmodell | Eigentümer, Vertrauenspersonen, Erben, Freigabebedingungen und Kryptografie sind eindeutig spezifiziert |
| P0 | Cloud-Tresor absichern und anbinden | Bestandsdaten bleiben erhalten; APIs und Zugriffskontrollen sind konsistent |
| P0 | Einladung, Annahme, Widerruf, Eigentümerwechsel | Servergeprüfte Identität, atomare Zustandswechsel und fail-closed Verhalten |
| P0 | Erben-Portal integrieren | Kein ungesicherter Firebase-Altpfad, ein nachvollziehbarer berechtigter Zugriffspfad |
| P0 | Alarm-/Karenz-/Freigabelogik | Serverseitig durchgesetzt, widerrufbar, prüfbar und ohne vorzeitige Offenlegung |
| P1 | Wiederherstellung und Gerätewechsel | Schlüssel- und Datenverlustszenarien definiert und abgesichert |
| P1 | Audit-Ereignisse, Missbrauchsschutz, Monitoring, Rollback | Betriebs- und Notfallabläufe funktionieren |
| P1 | Echte Integrations- und End-to-End-Freigabeprüfung | Berechtigungen, Race Conditions, Schlüsselübergabe und Nutzerablauf nachgewiesen |
| P2 | Komfort, Formulierungen, kosmetische UI-Verbesserungen | Nach sicherer Kernfreigabe priorisieren |

## 3. Umsetzungspakete

### Paket A – Sicherheitsarchitektur und Ist-Bestand (gebündelt mit Vorarbeiten B/C)

1. Repository-Pfade, Datenmodelle, aktive Supabase-Schemas/Migrationen, APIs, Verschlüsselung und Erben-UI in **einem** Durchgang erfassen.
2. Tatsächliche Datenflüsse, Rollen, Identitätsquelle, Schlüsselhaltung, Widerrufssemantik, Alarmzustände und Eigentümerwechsel verbindlich entscheiden und dokumentieren.
3. Review-only-SQL von tatsächlich deploybaren Migrationen trennen; keine ungetesteten Entwürfe aktivieren.
4. Anforderungen und Akzeptanzkriterien für Backend und UI gemeinsam festlegen.

**Fertig, wenn:** Ein zusammenhängender, implementierbarer Sicherheits- und Schnittstellenvertrag existiert; bekannte Blocker sind sichtbar.

### Paket B – Vollständiges Backend (ein großer Implementierungsdurchgang)

1. Datenbankschema, Constraints, RLS, Rechte, Indexe und Migrationen für den Nachlassbereich konsistent aufbauen.
2. Sichere serverseitige Authentifizierung und interne Ausführung: keine aus dem Browser frei vorgebbare Nutzer-ID; kein unkontrolliertes `SECURITY DEFINER`/`EXECUTE`.
3. Einladungen, Annahme, Widerruf, Eigentümerwechsel und Sperrreihenfolge atomar implementieren.
4. Alarmzustände, Karenzzeiten, Berechtigungsfreigabe, geschützte Schlüsselübergabe und Audit-Ereignisse integrieren.
5. Rückwärtskompatibilität und Datenerhalt kontrollieren; Rollback planen.

**Fertig, wenn:** Die Backend-Flows durchgängig implementiert und in einer **nicht produktiven** Umgebung für die Freigabeprüfung bereit sind.

### Paket C – Nachlassverwaltung und Erben-Portal (möglichst mit B gebündelt)

1. Besitzer-Oberfläche für Tresor, Vertrauenspersonen, Einladungen, Widerrufe und Status integrieren.
2. Erben-Portal auf die verbindlichen Backend- und Schlüsselverträge umstellen; unsichere Altpfade beseitigen oder deaktiviert lassen.
3. Verständliche Zustände für noch nicht freigegeben, widerrufen, abgelaufen, berechtigt und abgeschlossen implementieren.
4. Gerätewechsel, Wiederherstellung und Fehlerzustände in den Gesamtfluss aufnehmen.

**Fertig, wenn:** Ein vollständiger, technisch durchgehender Nutzerablauf bereitsteht; noch nicht automatisch produktiv aktiviert.

### Paket D – Minimale notwendige Freigabeprüfung und Deployment

1. Eine **wirklich isolierte** PostgreSQL-17-Instanz bereitstellen; keine synthetischen Testdaten auf der produktiven Supabase-Datenbank.
2. Mindestens zwei unabhängige Sessions für konkurrierende Einladungseinlösung, Widerruf und Eigentümerwechsel prüfen.
3. Tatsächliche Rollen-/EXECUTE-/RLS-/Funktionsinhaberrechte prüfen, einschließlich Identitätsspoofing, falschem Erben und vorzeitiger Freigabe.
4. Verschlüsselung, Schlüsselübergabe, Recovery und End-to-End-Portalfluss gezielt testen.
5. Migrationen/Deployments erst nach bestandenem Sicherheits-Gate kontrolliert durchführen; Backup, Monitoring und Rollback bereitstellen; Aktivierung ausdrücklich als eigenen Schritt dokumentieren.

**Fertig, wenn:** Nachweisbare Freigabeergebnisse, Deploy-Status und funktionsfähiger Rückfallplan vorliegen.

### Paket E – Stabilisierung und Übergabe

1. Laufzeitfehler, Audit-Ereignisse und betriebliche Warnsignale prüfen.
2. Wesentliche Probleme priorisiert beheben, veraltete Entwürfe kennzeichnen.
3. Technische und Nutzer-Dokumentation konsolidieren.
4. Abschließende Betriebs- und Sicherheitsübergabe dokumentieren.

**Fertig, wenn:** Das System wartbar und betriebsfähig ist und verbleibende Risiken transparent sind.

## 4. Teststrategie: notwendige Tests statt Testserien

**Nur diese risikoorientierten Freigaben sind zwingend:**
- **Autorisierung:** falsche Identität, fremder Tresor, widerrufene Einladung, bereits akzeptierter oder abgelaufener Token.
- **Nebenläufigkeit:** parallele Einlösung, Widerruf und Eigentümerwechsel mit mindestens zwei echten Datenbanksessions.
- **Kryptografie:** keine unbeabsichtigte Klartextfreigabe; berechtigte Schlüsselübergabe und Wiederherstellung.
- **Datenintegrität:** keine zerstörte Bestandsinformation, keine stillschweigende Reaktivierung.
- **End-to-End:** ein vollständiger Besitzer-zu-Erben-Ablauf.

Keine zusätzlichen Regex-/Mutations-Tests ohne konkrete bisher ungesicherte Schutzbedingung. Bereits vorhandene geeignete Tests wiederverwenden.

## 5. Autopilot-Regeln

- **Geltungsbereich strikt begrenzen** auf Nachlassverwaltung und Erben-Portal.
- **`main` bevorzugen**; Änderungen möglichst als zusammenhängende, überprüfte Implementierungspakete committen, nicht als Kleinst-Commits.
- GitHub-Arbeiten, erforderliche Merges, Supabase-Änderungen und Deployments im Rahmen der Nutzerfreigabe eigenständig durchführen.
- **Produktive Daten schützen:** keine Löschungen, keine synthetischen Daten im Live-System, keine unkontrollierten Rechtefreigaben.
- **Sicherheits-Gate beibehalten:** Kritische Berechtigungs-, Verschlüsselungs- und Freigabeänderungen erst nach erfolgreicher Prüfung aktivieren.
- Ein Abschlussbericht **pro Paket** mit Änderungen, Tests, Grenzen, Deploy-Status, offenen Blockern und echten Commit-SHAs.
- Vor jeder Ausführung den tatsächlichen aktuellen `main`- und Supabase-Stand erneut abgleichen; die hier dokumentierten Befunde sind eine Momentaufnahme.

## 6. Nächster gebündelter Arbeitsauftrag

**Paket A unmittelbar beginnen und die umsetzbaren Teile von B und C möglichst im selben Durchgang erledigen.** Erst die vollständige Daten-, Rechte- und Schlüsselarchitektur gegen den realen Projektbestand abgleichen, dann Backend und Portal integriert implementieren. Anschließend das sicherheitskritische Freigabe-Gate aus Paket D abarbeiten. Keine weitere Testserie als Selbstzweck.

**Aktueller Roadmap-Status:** A offen; B/C vorbereitet, nicht fertig; D blockiert bis isolierte Integrationsumgebung und sichere Implementierung vorliegen; E nach erfolgreicher Freigabe.

## 7. Umsetzungsstand – Eigentümer-Metadaten-API (10. November 2026)

- **Bestandsabgleich:** Die produktive Datenbank enthält `public.vault_cloud_snapshots`, aber keine Tabelle `public.vault_ownership`. Die frühere `vault-api` referenzierte damit eine nicht vorhandene Tabelle.
- **Rechte geprüft (nur lesend):** `vault_cloud_snapshots` hat RLS aktiviert; eine SELECT-Policy bindet `owner_user_id` an `auth.uid()`. `authenticated` hat SELECT, `anon` nicht; `FORCE ROW LEVEL SECURITY` ist nicht aktiviert.
- **Backend-Code:** `supabase/functions/vault-api/index.ts` verwendet nun ein mit dem geprüften Benutzer-JWT konfiguriertes Supabase-Clientobjekt und liest ausschließlich `vault_id`, `owner_user_id` und `updated_at` aus `vault_cloud_snapshots`. Es gibt nur Metadaten für den nachweislich passenden Eigentümer zurück; keine verschlüsselten Inhalte, Schlüssel oder Erbenfreigaben. `service_role` wird nicht verwendet.
- **Gezielte Offline-Prüfung:** Fünf Node.js-Handler-Tests bestanden (Eigentümer, ungültige Tokens, Fremdzugriff, Datenbankfehler, ungültige Tresor-ID). Getestet mit Mock-Clients; **keine reale JWT-/RLS-End-to-End-Prüfung**.
- **Commits:** API `d23a140489af9979c0212be3c9e67a802a11a496`; Tests `eec7e76ec187755560867ec2b554382e7b91bea0`.
- **Deployment:** In diesem Arbeitsschritt **nicht deployed** und **nicht aktiviert**. Kein produktives Schema oder Nutzerdatum geändert.

**Nächste gebündelte Etappe:** Schlüssel- und Freigabeprotokoll sowie Besitzer-/Erben-Datenflüsse verbindlich abschließen; bestehende Alt-Firebase-Lesepfade vor aktivierter Erbenfreigabe ersetzen oder sicher sperren; anschließend Backend und UI integriert vervollständigen. Eine produktive Erbenfreigabe bleibt bis zum Sicherheits-Gate von Paket D aus.

## 8. Erben-Portal im fail-closed Übergangsbetrieb (10. November 2026)

**GitHub-Befund:** Das bisherige Erben-Portal las Ciphertext direkt aus Firebase und erlaubte eine Freigabe nach ausschließlich browserseitig berechneten Zeitbedingungen. Ältere URLs konnten Master-Keys transportieren. Eine nachträgliche UI-Frist kann bereits verteilte Schlüssel nicht zurückholen.

**Umsetzung auf main:** Der Portal-Einstieg `tools/digitaler-nachlass/erben.html` wurde auf eine eigenständige gesperrte Statusseite ohne Firebase, Netzwerkabfragen, Alarm, Schlüsselannahme und Entschlüsselung umgestellt. URL-Query und Fragment werden sofort per History-API entfernt; bereits erfolgte Übertragung von Query-Parametern an Webserver und alte Links bleiben ein Restrisiko.

**Sicherheitsvertrag:** `docs/NACHLASS_ERBEN_SICHERHEITSVERTRAG.md` spezifiziert serverseitige Identitäts-/Freigabeprüfung, personengebundene Schlüsselhüllen, Zustandsübergänge, Widerruf und notwendige echte PG17-Nebenläufigkeitstests. Er ist **noch keine Implementierung**.

**Gezielte Tests:** Drei offline ausgeführte Node.js-Prüfungen bestanden: keine Alt-Firebase-/Netzwerkpfade im neuen Portal, Query-/Fragment-Bereinigung unter simulierten URL-Zuständen sowie Prüfung der frühen Ausführung. Keine echte Browser-/Hosting- oder Ende-zu-Ende-Integration geprüft.

**Commits:** Portal `33e4944293ae8953470af17817596db5fd52cc76`; Tests `bc2950caed3df1a7dadac62b03172202adc86a90`; Sicherheitsvertrag `356b16925961320029a88c9fe83576e1c15d9b24`.

**Verbleibende P0-Blocker:** Besitzeroberfläche mit Firebase-/Master-Key-Link-Erzeugung, sichere Bestandsdatenmigration, reale serverseitige atomare Einladung/Widerruf, Schlüsselhüllen und der gesamte Freigabe-Gate. Kein Supabase-Deployment oder Datenbankschema-Eingriff in dieser Runde. GitHub-main-Datei ist geändert; der tatsächliche GitHub-Pages-Veröffentlichungszustand wurde nicht bestätigt.

## 9. Besitzeroberfläche: Schlüssel-Link-Ausgabe gesperrt / Datenflüsse inventarisiert (10. November 2026)

**Audit:** Im Besitzer-Frontend wurden vier Stellen mit potentieller Ausgabe von `#key=` gefunden (Kopieren/Versand, QR-Vorschau, PDF-Erzeugung, zugehörige Linkvalidierung). Der vollständige lokale Tresorschlüssel war damit trotz eines gesperrten Erben-Portals weiterhin als Notfall-Link teilbar. Firestore synchronisiert weiterhin verschlüsselte Tresor-Inhalte mit **unverschlüsselten** Kontakt-/Check-in-Metadaten; die Supabase-Tabelle enthält separat verschlüsselte Owner-Backups. Diese Alt-Datenflüsse wurden nicht gelöscht.

**Änderung auf `main`:** Die Besitzeroberfläche erstellt keine Master-Key-Erben-URLs mehr, kopiert/versendet diese nicht und erzeugt keine Schlüssel-QRs oder -PDFs. Kontaktverwaltung und lokale Tresorverschlüsselung bleiben bestehen. Die nicht mehr benötigten PDF-/QR-/E-Mail-Bibliotheken wurden aus der Seite entfernt. Notfall-Kit und Schlüsselversand erscheinen ausdrücklich als gesperrt. Die Legacy-Firebase-Synchronisierung existiert weiterhin (ohne Erbenfreigabe); die Besitzeroberfläche ist deshalb noch **nicht vollständig migriert**.

**Bestandskompatibles Backend-Design:** `docs/NACHLASS_ERBEN_IMPLEMENTIERUNGSPLAN.md` dokumentiert Datenflüsse, genaue Endpunktverträge, benötigte private Tabellen, serverseitige JWT-Bindung, Lock-Reihenfolge, Verschlüsselungs-Hüllen, Widerruf, Freigabe-Gates und Migrationsrisiken. Beachten: Primärschlüssel der bestehenden `vault_cloud_snapshots` ist `owner_user_id`, `vault_id` hat bislang keine nachgewiesene UNIQUE-Constraint; alte `vault_ownership`-Drafts nicht unverändert verwenden.

**Prüfung:** Der originale GitHub-Blob wurde vor Änderungen abgerufen. Nach der Änderung wurden elf gezielte Schutzbedingungen gegen den tatsächlichen HTML-Stand geprüft (kein Key-Link/Clipboard/E-Mail/QR/PDF-Code; lokale Kryptografie und Recovery erhalten); das gesamte Inline-JavaScript bestand eine Syntaxkompilierung. Nach Entfernen ungenutzter Bibliotheken erneut vollständige Inline-Syntaxprüfung. **Keine End-to-End-/Browser-/Supabase-Migrationstests.**

**Commits:** Hardening `c05fb355749b6e39f2823c116097bca8b935e048`, ungenutzte Bibliotheken `45d052c1d71e2fc9ca32060c9612233735c73fc8`, Implementierungsplan `211378b9d9e4ef1aa9175a525142b6ba410fb6dc`.

**Nächster Blocker:** Aktive serverseitige Einladung/Widerruf/Schlüsselhüllen erfordern die isolierte PG17-Nebenläufigkeitsprüfung und eine geprüfte Endgeräte-Kryptografie. Die Erben-Freigabe ist nicht aktiv. Alte, bereits geteilte Geheimschlüssel können nicht rückwirkend gesperrt werden.

## 10. Staging-Backend für Einladung, Widerruf und Schlüsselhüllen (11. November 2026)

**Umgesetzt, ausschließlich im Repository und nicht deployed:**

- `supabase/functions/_shared/heir-staging-backend.ts`: serverseitiger, nicht erreichbarer Service mit vier Operationen: `createInvitation`, `redeemInvitation`, `revokeInvitation`, `putEnvelope`. Identität kommt allein aus einer extern bereitzustellenden und mit Supabase `auth.getUser` zu verknüpfenden `VerifyUser`-Funktion. Zufallstoken werden nur einmal zurückgegeben, in SQL ausschließlich SHA-256-Hashes gespeichert; Annahme verweigert falsche Empfänger, abgelaufene/widerrufene oder bereits angenommene Tokens. Widerruf macht bestehende Zuordnungen und Schlüsselhüllen unbrauchbar für künftige Abrufe. Hüllen dürfen nur für aktive Zuordnungen mit bereits verifiziertem Erben-Public-Key gespeichert werden; der Server entschlüsselt sie nicht.
- `supabase/functions/_shared/heir-pg-transaction-adapter.ts`: generischer serverseitiger PostgreSQL-Pooladapter mit parameterisierten Queries, `BEGIN`, `COMMIT`, `ROLLBACK`, `SET LOCAL search_path`, Lock-/Statement-Timeout und Freigabe der Verbindung. **Noch kein konfigurierter PG-Pool oder Endpunkt.** Der benötigte eng berechtigte DB-Account muss in isolierter Staging-Umgebung geprüft werden.
- `docs/sql-drafts/heir_private_backend_REVIEW_ONLY.sql`: **nur SQL-Entwurf, keine Migration**, mit privatem Schema `heir_private`, `heir_invitations`, `heir_assignments`, `heir_public_keys`, `heir_envelopes`, FK zum echten Primärschlüssel `vault_cloud_snapshots.owner_user_id`, RLS/FORCE RLS und ohne Browser-/Service-GRANTs. Das Schema wurde **nicht** in PostgreSQL ausgeführt.

**Gezielte lokale Prüfungen:** TypeScript Strict-Check beider Backendmodule bestanden; insgesamt **8/8 Node.js-Tests bestanden** (Token/Identitätsbindung, einmalige Annahme, Pending-/Accepted-Widerruf, Schlüssel-Fingerprint/Attestation-Gate, Rollback und PG-Transaktionsadapter). Alle Tests arbeiten mit synthetischen Mock-Transaktionen, **nicht mit echtem PostgreSQL**. Beispiel lokal mit Node 22: `node --test tests/security/heir-staging-backend.test.cjs tests/security/heir-pg-transaction-adapter.test.cjs`. Die Node-Typentfernung ist in Node 22 experimentell; CI-Laufzeit vorher prüfen.

**Commits dieses Pakets:** Service `e2d7d55d39f760f53aa66af8c7a1c7981a47f9eb`, privater SQL-Entwurf `c0bcb746635bf4f34e376d114292748183cc8fac`, Domain-Tests `e81c1a8b5537b0668e53962220c3bb22196d0493`, Transaktionsadapter `8e0505dcb118d345465e730c5d0689ec770691b3`, Adapter-Tests `a8bbb2c4c906716d8eacbfa827001aa113d8195e`.

**Verbleibende zwingende Blocker vor produktiver Freigabe:** isoliertes PG17 mit echten Sessions; geprüfte Privilegien/Transaktions- und Deadlock-Semantik; Public-Key-Registrierung und **Besitznachweis** (`verified_at` bleibt bis dahin NULL); überprüfte HPKE-Implementierung mit sicherem, authentifiziertem Endgeräte-Schlüsseltausch; serverseitige Freigabe-/Alarm-/Karenz-Zustandsmaschine, sichere Ausgabe verschlüsselter Snapshots/Hüllen und E2E-Browserprüfung; Backup, Rollback und kontrollierte Migration. Keine neue Edge Function, kein Browserzugriff, kein Deployment, keine Datenänderung und keine Freigabe in dieser Runde.

## 11. Besitznachweis, HPKE-Schlüsselhüllen und Alarm-Karenz (11. November 2026)

**Nur im GitHub-Repository, nicht deployed:** `heir-key-proof-staging.ts` registriert X25519-Public-Keys mit serverseitig generierter, fünf Minuten gültiger ECDH/HKDF-Challenge und einmaligem Besitznachweis; Identität muss aus serverseitig verifiziertem Supabase-JWT stammen. `heir-hpke-envelope.ts` implementiert clientseitige RFC-9180-HPKE-Schlüsselhüllen (X25519/HKDF-SHA256/AES-256-GCM), deren AAD an Besitzer, Erben, Tresor, Schlüssel-ID und Zuordnungsversion gebunden ist. `heir-release-staging.ts` setzt Alarm, Abbruch und serverseitige 24h-Karenz als atomare, nicht deployte SQL-Operationen um. Zeitablauf führt **ausschließlich** zu `pending_independent_review`, niemals zu einer Schlüsselfreigabe.

**Review-only SQL:** `docs/sql-drafts/heir_key_release_REVIEW_ONLY.sql` enthält nur Entwürfe für `heir_key_proofs` und `heir_release_cases`; keine Migration, GRANTs, Edge Function oder produktive Datenänderung.

**Prüfungen:** TypeScript Strict-Check der drei Module und 5/5 offline ausgeführte Node.js-Tests (Identity/Replay, verbrauchter Fehlversuch, Envelope-Roundtrip mit falschem Schlüssel/AAD, Alarm/Abbruch, offizieller RFC-9180-X25519-KEM-Testvektor). Keine reale PostgreSQL-/RLS-, Browser-, API- oder Produktivprüfung.

**Freigabe-Blocker:** Isolierte PostgreSQL-17-Tests mit zwei Sessions, Rechte/Owner/Lock-Audit, vollständige Ende-zu-Ende-Integration, unabhängige kryptografische Review sowie rechtlich/operativ definiertes gesondertes Freigabeverfahren. Produktive Erbenfreigabe bleibt gesperrt.

## 12. Endgeräte-Schlüssel- und Eigentümer-Hüllen-Integration (11. November 2026)

- **Staging-Client, nicht deployed:** `heir-device-keys-staging.ts` erzeugt nicht exportierbare X25519-Privatschlüssel auf dem Erbengerät, speichert diese vor dem serverseitigen Besitznachweis über einen vorgesehenen IndexedDB-Adapter und hält unbestätigte Schlüssel konsequent auf `pending`. Lokale Geräte- und Kontoidentität ist **keine** serverseitige Berechtigung.
- **Eigentümerseitige HPKE:** `heir-envelope-owner-staging.ts` verlangt einen unabhängig bestätigten SHA-256-Public-Key-Fingerprint des Erben, eine aktive Zuordnung und einen verifizierten, nicht widerrufenen Schlüssel. Der Tresor-DEK wird lokal verschlüsselt; nur die Schlüsselhülle ist für den späteren Servertransport vorgesehen. Der Server muss alle Rechte und Versionsstände vor Speicherung atomar erneut prüfen.
- **Datenhaltung:** Der IndexedDB-Adapter benutzt Structured Clone für nicht exportierbare `CryptoKey`-Objekte. Keine Browser-/Live-UI importiert dieses Modul. Eine XSS-/CSP-/Drittanbieter-Skript-Prüfung und echtes Browser-/IndexedDB-Testing bleiben Pflicht.
- **Prüfung:** TypeScript Strict-Check bestanden; 4/4 neue Node-WebCrypto-Tests und 5/5 bereits vorhandene Kryptografie-/Alarmtests bestanden. Der Eigentümer/Erben-Roundtrip und fehlerhafte Konten-, Schlüssel-, Fingerprint-, Widerrufs- und Speicherszenarien wurden offline geprüft. Kein echtes Supabase-JWT, keine echte PostgreSQL-17-Datenbank und keine parallelen Sessions getestet.
- **Details:** [NACHLASS_ERBEN_GERAETESCHLUESSEL_STAGING.md](NACHLASS_ERBEN_GERAETESCHLUESSEL_STAGING.md).
- **Freigabe:** Nicht deployed, keine produktive Migration, keine Entschlüsselungs- oder Erbenfreigabe. Geplanter nächster Schritt: sichere tatsächliche Browser-/Auth- und Datenbankintegration nur nach isolierten PG17-Tests mit zwei unabhängigen Sessions und gesondertem Freigabe-Gate.


## 13. IndexedDB-Schlüsselbindung und lokale Testumgebung (11. November 2026)

- **Sicherheitslücke geschlossen (Staging, nicht deployed):** `createIndexedDbHeirKeyStore` lässt innerhalb einer atomaren IndexedDB-Readwrite-Transaktion ausschließlich die erste Speicherung einer neuen `pending`-Identität und danach den Übergang derselben Identität / desselben Public Keys auf `verified` zu. Bereits verifizierte Geräte-Schlüssel können nicht stillschweigend überschrieben oder zurückgestuft werden; eine frische `verified`-Speicherung ohne vorheriges `pending` wird abgelehnt. Das private X25519-`CryptoKey` bleibt nicht exportierbar. Vor Speichern und nach Lesen wird der öffentliche Schlüssel anhand einer X25519-Basispunktableitung aus dem privaten Schlüssel verifiziert (ohne Export privater Bytes).
- **Gezielt ausgeführt:** TypeScript-Strict-Check bestanden; sechs Node.js-Tests (vier vorhandene Geräte-/HPKE-Workflowtests, zwei neue mit simulierten IndexedDB-Transaktionen) bestanden. Der simulierte Speicher prüft atomare Statuswechsel, Schlüsselaustausch/-beschädigung, Kontentrennung und Exportverbot. Er ersetzt keinen echten Browser-/IndexedDB-Test.
- **Browser-Gate nicht bestanden/ausführbar:** Der vorhandene Chromium-Browser wurde mit Playwright gestartet, aber sämtliche Versuche zum Aufrufen lokaler, HTTP(S)- bzw. simuliert ausgelieferter Seiten schlugen mit `net::ERR_BLOCKED_BY_ADMINISTRATOR` fehl. Deshalb **kein** behaupteter echter Browsererfolg; Browser-Freigabe bleibt offen.
- **PostgreSQL-Gate weiterhin offen:** Keine lokal installierte PostgreSQL-17-Server-Instanz (`postgres`, `initdb`, `pg_ctl` fehlen); Paketbezug über `deb.debian.org` wegen DNS-Fehler unmöglich. Supabase-Entwicklungszweige: keine vorhandenen; eine kostenpflichtige Zweig-/Projektanlage wurde nicht automatisch ausgelöst. Keine produktiven Tests oder Datenänderungen.
- **Nächste Schritte:** Reale Browser-/IndexedDB-Tests in geeigneter isolierter Testumgebung durchführen; gleichzeitige Tab-/Speicherkonflikte prüfen; danach echte isolierte PostgreSQL-17-Transaktionen mit zwei Sessions und Rollen-/RLS-Analyse. Erst anschließend kontrollierter API- und Browseranschluss mit CSP-/XSS-Audit. Keine produktive Freigabe.


## 14. Reproduzierbares reales Browser-Gate (11. November 2026)

**Umsetzung:** `tests/security/heir-indexeddb-real-browser.py` ist ein eigenständiger, nichtproduktiver Playwright/Chromium-Prüflauf. Er übersetzt die vorhandenen TypeScript-Module in ein temporäres Verzeichnis, stellt sie ausschließlich auf einem zufälligen `127.0.0.1`-Port bereit, blockiert alle Requests auf fremde Hosts, benutzt ein separates temporäres Browserprofil und testet echte IndexedDB-/WebCrypto-Persistenz über zwei Browser-Tabs einschließlich nicht exportierbarem X25519-Schlüssel, Account-Isolation, Verbot der Statusrückstufung und HPKE-Roundtrip. Ein externes Supabase-Projekt wird weder benötigt noch verwendet.

**Befehl:** `python tests/security/heir-indexeddb-real-browser.py` (Python Playwright, Chromium, TypeScript 5.8+ erforderlich). Das Skript darf nur als **bestanden** gemeldet werden, wenn sein JSON-Ergebnis `status: passed` tatsächlich ausgegeben wurde.

**Real ausgeführte Prüfungen:** Python-`py_compile` dieses Skripts bestanden. Browserstart und lokale Navigation wurden tatsächlich versucht. Der Browser blockiert die Navigation mit `net::ERR_BLOCKED_BY_ADMINISTRATOR`; **das reale Browser-/IndexedDB-Gate ist daher NICHT bestanden**. Die bereits vorhandenen sechs Node.js-Geräte-/Speichertests wurden mit `node --experimental-strip-types --test` erneut erfolgreich ausgeführt. Die Ablehnung der normalen Node-Ausführung ohne `--experimental-strip-types` ist ein Laufzeitkonfigurationsproblem, kein bestandener Test.

**PostgreSQL:** Lokale PostgreSQL-17-Serverwerkzeuge, `psql` und Docker/Podman fehlen. Bestehende Supabase-Entwicklungszweige: null. Eine kostenpflichtige Testumgebung wurde nicht erstellt. Reale SQL-RLS- und Nebenläufigkeitstests mit zwei unabhängigen Sessions sind weiterhin **offen**. Die produktive Supabase-Datenbank blieb unverändert, ebenso alle Erbenfreigaben.

**Nächste Schritte:** Skript auf einer regulär navigierbaren, isolierten Testmaschine ausführen und bei Erfolg die Browser-Freigabe separat protokollieren. Für PostgreSQL 17 eine nachweislich isolierte, kostenfreigegebene Instanz bereitstellen und zwei echte Sessions plus RLS-/EXECUTE-/Lock-Tests ausführen; erst danach Backend und Browser überhaupt deploybar machen.


## 15. Echte isolierte Browser- und PostgreSQL-17-Gates bestanden (11. November 2026)

**Nachweis:** Der kostenlose Standard-GitHub-Actions-Runner des öffentlichen Repositories führte den Workflow `.github/workflows/heir-isolated-gates.yml` erfolgreich aus. Erfolgreicher Run: [42962399793](https://github.com/duhrrom11/Helferlein/actions/runs/42962399793), Status **completed / success**, zwei Jobs (echter Chromium-/IndexedDB-Test und echter PostgreSQL-17-Test). Der Runner war eine getrennte ephemere Umgebung, nicht das produktive Supabase-Projekt.

**Chromium:** `tests/security/heir-indexeddb-real-browser.py` startete echtes Chromium und lieferte `status: passed`, `real_indexeddb: true`, `checks: 2`. Nicht exportierbare X25519-Keys konnten nach gespeichertem `pending -> verified`-Übergang aus einem **zweiten Tab** geladen werden; Schlüssel-Export und Downgrade wurden verweigert, fremde Identität abgewiesen, HPKE-Verschlüsselung/Entschlüsselung auf passendem Gerät funktionierte.

**PostgreSQL 17:** Das Workflow-Job-Protokoll enthält `{"status":"passed","engine":"PostgreSQL 17","sessions":2}`. In der **separaten Datenbank** `helferlein_heir_ci` wurden die beiden `REVIEW_ONLY`-SQL-Entwürfe auf eine minimal nachgebildete bestehende Snapshotstruktur angewendet. Die Prüfungen bestätigten für diese Umgebung: gesperrten Schema-/Tabellenzugriff von `anon`/`authenticated`, erzwungene RLS, tatsächlich konkurrierende Sperren des Eigentümerdatensatzes, Akzeptanz gegen Widerruf, Widerruf gegen Schlüsselhüllen, Einmaligkeit des Besitznachweises und keine zulässige automatische Freigabe nach Ablauf einer Karenzzeit.

**Notwendige Begrenzung:** Die Tests benutzen einen PostgreSQL-17-Container mit **synthetischem** `auth.users`-/`vault_cloud_snapshots`-Fixture. Sie sind kein Lauf der Edge Functions, keine Supabase-JWT-E2E-Autorisierung, kein Test einer eng berechtigten Produktions-Serverrolle und keine Prüfung der realen Bestandsdatenmigration. Der transaktionale `SqlBackend`-Dienst ist nicht mit dieser Datenbank verdrahtet; die Tests prüfen seine entscheidenden DB-Invarianten und Race-Bedingungen separat. Auch der Browser-Test nutzt eine eigene temporäre Domain/Origin und keine veröffentlichte Besitzer-/Erben-UI. Diese Rest-Gates sowie eine unabhängige Kryptografie- und Betriebsprüfung stehen aus. Ein rechtlicher Freigabenachweis fehlt; automatische Freigabe bleibt gesperrt.

**GitHub-Commits:** Isolierter CI-Workflow und Test-Fixtures `4ffe71b3846e7141809642ecabcdecac58d6a74b`; Korrektur der Docker-Hostprüfung und Compiler-Pinning `7eb2b53227273a9467ba06c057c8ce1896d065fd`; Korrektur für Docker-`inet`-CIDR `57e3ded8652c4d2ca3cd1aa23bd7253f3d8ab489`.

**Nächster Produktivvorbereitungsschritt:** Isolierte Datenbank-End-to-End-Tests **direkt über den echten `SqlBackend`-Adapter** und restriktive Serverrolle; Supabase-Auth-`getUser`-Adapter und Missbrauchsschutz; kontrollierte Browser-UI-Integration mit CSP/XSS-Review; unabhängig verantworteter Freigabeprozess, Backup und Rollback. **Kein Produktivdeploy, keine produktiven Tests und keine Erbenfreigabe in dieser Runde.**


## 16. Echter SQL-Adapter, eingeschränkte Serverrolle und verifizierter Auth-Adapter (11. November 2026)

**Umsetzung ausschließlich auf GitHub main, kein Produktivdeploy:**
- `supabase/functions/_shared/heir-supabase-auth.ts`: verifiziert `Authorization: Bearer …` durch Aufruf eines injizierten Supabase-`auth.getUser(token)`-Clients, kontrolliert das UID-Format und verweigert fehlgeschlagene/ungültige Tokens. Keine Benutzer-ID aus Request-JSON und keine lokale ungeprüfte JWT-Claim-Auswertung. In den isolierten Tests ist der `auth.getUser`-Provider ein ausdrücklich gekennzeichneter Test-Doppelgänger; **echte Supabase-Auth-Netzwerkprüfung und Session-Widerruf bleiben offen**.
- `tests/security/heir-pg17-restricted-role.sql`: erzeugt **nur in der ephemeren CI-Datenbank** `helferlein_heir_ci` eine eigene PostgreSQL-Loginrolle ohne `BYPASSRLS`, `SUPERUSER`, `CREATEDB` oder `CREATEROLE`. Gewährt Tabellenrechte ausschließlich für die privaten Testtabellen und eine begrenzte Sperrberechtigung auf der Snapshot-Tabelle; kein Schreibrecht auf `encrypted_data`. Notwendige RLS-Policies sind nur Teil dieses isolierten Test-Fixtures, **kein Produktions-Rollenvertrag**.
- `tests/security/heir-pg17-service-integration.mjs`: benutzt **den echten** TypeScript-`createHeirStagingBackend` mit `createHeirPgTransactionAdapter`, `pg` und der eingegrenzten CI-Serverrolle. Prüft falsche Eigentümer, JWT-Verifier-Aufrufe, einmalige Einladungseinlösung für die vorgesehene Person, Ablehnung falscher Fingerprints, **positive Schlüsselhüllen-Speicherung**, anschließenden Widerruf von Zuordnung und Hülle, gesperrtes erneutes Hinterlegen und fehlendes Schreibrecht auf Snapshot-Ciphertext.
- Echter Integrationsfehler behoben: PostgreSQL `bigint` (`assignment.version`) wird vom `pg`-Treiber als Zeichenfolge gelesen. `heir-staging-backend.ts` akzeptiert jetzt ausschließlich positive, sicher in JavaScript darstellbare ganzzahlige Versionen und verweigert Überläufe. Der positive Hüllenpfad besteht danach.
- CI-Workflow `.github/workflows/heir-isolated-gates.yml` führt die neue Integration zusätzlich zu den bisherigen echten Zwei-Sitzungen-Race-Checks und Chromium-/IndexedDB-Prüfungen aus. Standard-Push-Gate für relevante Nachlass-Dateien.

**Nachgewiesener erfolgreicher Lauf:** [GitHub Actions 42965703420](https://github.com/duhrrom11/Helferlein/actions/runs/42965703420), beide Jobs **success**. PostgreSQL-17-Log: zwei unabhängige DB-Sitzungen und sechs Race-/RLS-Prüfbereiche bestanden, plus tatsächlicher TypeScript-Adapter mit sieben positiven/negativen Integrationsprüfbereichen. Chromium mit echtem IndexedDB ebenfalls erfolgreich. Die früheren Zwischenläufe [42965184041](https://github.com/duhrrom11/Helferlein/actions/runs/42965184041) und [42965551213](https://github.com/duhrrom11/Helferlein/actions/runs/42965551213) waren wegen des zunächst nicht erkannten `bigint`-Typs **fehlgeschlagen** und dürfen nicht als grün gewertet werden.

**Commits:** Backend/CI/Auth-Adapter `358701a3c5c9e9ee35db960b17ab75240abd3a61`; positiver Schlüsselhüllen-Test `81d464a1c4ab88f7b5cfbc960d767a78c7aba4d8`; nichtgeheime CI-Fehlerdiagnostik `c3aeb48d6f223a1c002061a3b293dab7667d9090`; `bigint`-Fix `29e54e9c85ca8e65f75a9f4521b734a6254b7ef3`.

**Restliche Sicherheits-Gates:** Die eigentliche Supabase-`auth.getUser`-Anbindung mit realen, widerrufbaren Benutzer-Sessions, geschützte API-Endpunkte/Rate-Limits, echte Browser-UI, Endgeräte-Vertrauensgrenzen, Schlüsselausgabe nur nach unabhängig geprüfter rechtlicher Freigabe, Migration/Rollen-Audit am tatsächlichen produktiven Schema, vollständige E2E-Prüfung und Backup/Rollback fehlen. Die bisher erfolgreich geprüfte Serverrolle ist **nur ein CI-Fixture** mit bewusst weit gefassten privaten Tabellenrechten; nicht unverändert für Produktion übernehmen. Keine Migration, kein Deployment und keine Erbenfreigabe.

## 17. Nicht deployte HTTP-Grenze mit verpflichtender Zugriffsdrosselung (11. November 2026)

- **Serverseitige API, ausschließlich als importierbares Staging-Modul:** `supabase/functions/_shared/heir-http-staging.ts` stellt einen strikten Request-Handler für Einladung anlegen/einlösen/widerrufen, Schlüsselhülle ablegen, X25519-Geräteschlüssel bestätigen sowie Alarm auslösen/abbrechen/Status bereit. Er startet **keinen** Webserver, ist nicht als Edge Function registriert und ist auf GitHub Pages nicht aktiv. Es gibt keinen Abruf-Endpunkt für verschlüsselte Tresordaten, Schlüsselhüllen oder Klartextschlüssel.
- **Fail-closed:** HTTPS-Herkunft muss ausdrücklich auf der Allowlist stehen, Browser-Preflight ist eingeschränkt, Anfragen sind nur POST/JSON, 8-KiB-Streaming-Bodylimit, exakt definierte Parameter ohne zusätzliche Benutzer-/Besitzerfelder, verifiziertes `auth.getUser`-Vertrags-Interface, generische Fehler und `no-store`-/`no-referrer`-Antworten. Erfolgsantworten sind auf zulässige Felder begrenzt, insbesondere Einladungstoken nur beim Anlegen. Die Services prüfen die Benutzerberechtigung nochmals in ihren eigenen DB-Transaktionen.
- **Verpflichtende Aufnahmebegrenzung:** `heir-http-rate-limit-staging.ts` kapselt atomare PostgreSQL-Zeitfenster für noch nicht authentifizierte Anfragen (30/Minute pro **vertrauenswürdig vom Ingress gelieferten** Remote-Identifier und Route) sowie für authentifizierte Benutzer (3 neue Einladungen oder Schlüssel-Challenges/Minute, sonst 12 Aktionen/Minute). Fehlender/fehlerhafter Begrenzer verweigert Zugriff. Remote-Identifier kommen **niemals** aus ungeprüften `X-Forwarded-For`-Headern. Die Tabelle `heir_http_limits` ist lediglich in `docs/sql-drafts/heir_http_limits_REVIEW_ONLY.sql` spezifiziert, **keine produktive Migration**. Für den späteren Betrieb sind ein vertrauenswürdiger Remote-Identifier, Abwehr von Auth-Versuchsfluten, RLS-/Privilegienreview und Datenbereinigung zwingend.
- **Notwendige Prüfungen:** Acht gezielte HTTP-/Limiter-Vertragstests lokal bestanden, TypeScript strict für beide neuen Module bestanden. Der bestehende isolierte GitHub-Actions-PostgreSQL-17-Job wird zusätzlich einen echten parallelen Limiter-Test mit der eingeschränkten CI-Rolle durchführen. **Tatsächlicher CI-Nachweis:** [GitHub Actions 42968608692](https://github.com/duhrrom11/Helferlein/actions/runs/42968608692) **beide Jobs erfolgreich**: acht HTTP-/Limiter-Vertragstests im PostgreSQL-Job; isolierte PostgreSQL 17/RLS/Race-Tests mit zwei Sessions; realer TypeScript-Domainservice; atomare Limiter-Prüfung mit eingeschränkter Rolle (`30/36` Pre-Auth und `3/6` authentifizierte Einladungslimits, getrennte Routen); echter Chromium-/IndexedDB-Job erfolgreich. Der unmittelbar vorherige Lauf 42968469995 scheiterte allein an einer veralteten exakt sechsteiligen Tabellenliste im RLS-Test; der korrigierte Test prüft ausdrücklich alle **sieben** privaten Tabellen. **Keine** Live-Supabase-Auth-, Edge-Function- oder Produktivprüfung.

**Commits:** zusammenhängender HTTP-/Limiter-Block `ad85e1baa6ad114d48c6800203be0f886ff5427e`, Erweiterung der RLS-Testtabelle `374f7efeb27cee86994ebf07fc4805b06de9d7a5`.
Der CI-Lauf muss separat erfolgreich bestätigt werden; ein grüner Vertragstest ist **keine** Freigabe für Deployment.
- **Restgates:** Herkunftskonfiguration der tatsächlichen Betreiber-Domain, echte Supabase-Sessions und Revocation, Rate-Limiter-Remote-Vertrauensgrenze, echte Netzwerk-API/E2E mit CORS/CSP, Wiederherstellung und unabhängiger Nachlass-Freigabeprozess. Das Portal bleibt bis dahin gesperrt.


## 18. Serverkomposition und gesperrte Besitzer-Einladungsoberfläche (11. November 2026)

- **Nicht deployte Komposition:** `supabase/functions/_shared/heir-server-composition-staging.ts` verknüpft die vorhandene Supabase-`auth.getUser`-Verifikation, Einladungs-/Widerrufs-/Schlüsselhüllenservices, Schlüsselnachweis, Alarmzustände, HTTP-Routen und verpflichtende PostgreSQL-Zugriffsdrosselung in genau einer serverseitigen, nur durch bewusst injizierte Abhängigkeiten initialisierbaren `Request -> Response`-Funktion. Es gibt **keinen** Listener, keinen automatisch konfigurierten Pool, keine Edge Function und keine Freigabe-/Abrufroute.
- **Besitzeroberfläche:** `tools/digitaler-nachlass/index.html`, Bereich `Vertrauenspersonen`, zeigt nun einen getrennten, barrierearm beschrifteten Abschnitt für sichere Einladungen. Status und Ablauf sind klar erklärt. Erbenkonto, Einladungs- und Widerrufsaktionen sind durch ein dauerhaft deaktiviertes `fieldset` gesperrt; sie rufen weder Firebase noch Supabase noch eine nicht existierende API auf. Die bisherigen lokalen Kontakte und Tresorfunktionen bleiben erhalten. **Diese UI-Änderung ist nur vorbereitend; keine Einladungen können hier tatsächlich versendet werden.**
- **Gezielte Prüfungen:** `tests/security/heir-server-composition.test.mjs` überprüft den geschlossenen Start ohne vertrauenswürdige Abhängigkeiten, die tatsächliche interne Kette HTTP → Rate-Limit → `auth.getUser` → Domain-Transaktion und das Verwerfen unbekannter Abrufpfade, gefälschter Besitzerfelder sowie ungültiger Tokens. Der bestehende isolierte GitHub-Actions-Workflow führt diese Prüfungen zusätzlich zum bereits eingeführten echten PostgreSQL-17-/Chromium-Gate aus. TypeScript-Strict-Check für das neue Modul ist in CI verpflichtend.
- **Noch fehlend:** ein unabhängig geprüfter und sicher deployter HTTP-Ingress, tatsächliche Supabase-Auth-Sessions, produktionsgerechte private Rollen- und RLS-Policies, serverseitige Einladungsliste mit ID-gebundenem Widerruf, Rate-Limit-Remote-Vertrauensgrenze, sichere Benutzerkontenauswahl und vollständige Browser-/API-E2E-Prüfung. Erst dann darf die Besitzeroberfläche aktiviert werden. Erben-Portal, Snapshot- und Envelope-Abruf bleiben fail-closed. Keine produktive Migration oder Erbenfreigabe.

## 19. Eigentümer-Einladungsmetadaten und widerrufbare IDs (11. November 2026)

- **Implementiert, nicht deployed:** Der bestehende `heir-staging-backend.ts` bietet jetzt `listInvitations` als Eigentümer-Metadatenabfrage. Autorisierung durch verifizierten JWT-Benutzer und gesperrte `vault_cloud_snapshots.owner_user_id`-Zeile, genau wie im übrigen Transaktionsvertrag. Ergebnis: höchstens 50 neueste Einladungen (Erkennung weiterer Einträge), ID, Empfänger-UUID, Status `pending/accepted/expired/revoked`, Erstell- und Ablaufdatum. Status wird anhand der PostgreSQL-Uhrzeit und widerrufener Zuordnungen ermittelt. Die begrenzte SQL-Abfrage liefert **keinen** Einmalcode, Token-Hash, Tresorinhalt oder Schlüssel.
- **HTTP und Komposition:** Eine neue `POST /v1/heirs/invitations/list`-Route erwartet ausschließlich `vaultId`, verlangt dieselbe verifizierte Authentifizierung und die verpflichtenden Distributed-Limits wie die bestehenden Routen; alle Antwortfelder werden explizit geprüft und whitelisted. Der bestehende Widerruf per `invitationId` bleibt unverändert atomar und ausschließlich für den Eigentümer möglich. Es gibt keinen Abrufpfad für Schlüsselhüllen.
- **Besitzeroberfläche:** Die bestehende Vertrauenspersonen-Seite enthält nun eine zugängliche, verständliche Einladungsübersicht mit Spalten für Empfänger, Status, Ablauf und Aktion. **Noch keine echte Listenanbindung:** Solange kein freigegebener Server vorhanden ist, zeigt die Tabelle ausdrücklich „keine sichere Serververbindung“, keine erfundenen Einträge; Erstellung/Widerruf bleiben gesperrt. Legacy-Kontakte bleiben getrennt.
- **Tests:** Erweiterte Kompositions-/HTTP-Vertragstests prüfen Whitelisting und Tokenfreiheit; der bestehende echte PostgreSQL-17-Adaptertest prüft Eigentümer-/Erben-Isolation und die Statuswechsel angenommen → widerrufen. Der CI-Lauf muss vor einer positiven Ergebnisbehauptung abgeschlossen sein.
- **Offen:** Auditierter keyset-basierter Seitenwechsel für über 50 historische Einladungen, eigene erlaubte UI-Serveranbindung, verifizierte echte Supabase-Sessions, CSP/XSS, Serverrollen und Migration, sowie rechtlich gesicherte Freigabe. Keine produktive Migration, keine Edge Function und keine Erbenfreigabe.

## 20. Authentifizierter Same-Origin-Einladungstransport, weiterhin deaktiviert (11. November 2026)

- **Nicht deployter und nicht automatisch aktivierter Browsertransport:** `assets/heir-owner-invitations-transport-staging.js` bindet den vorhandenen Eigentümer-Listen-/Widerrufsbaustein ausschließlich an die bereits definierte serverseitige HTTP-Grenze. Er verlangt einen für jeden Aufruf frisch bezogenen Bearer-Token aus einer von der späteren Host-Anwendung bereitzustellenden `getAccessToken`-Funktion; keine Token-Speicherung in DOM, localStorage, URLs oder Modulzustand. Nur exakt `/v1/heirs/invitations/list` und `/revoke` mit den erlaubten Parametern und einer verifizierbaren Tresor-ID werden angenommen. Fetch erzwingt Same-Origin, ohne Cookies, ohne Referrer, ohne Redirects, mit No-Store, 8-Sekunden-Timeout und begrenzter JSON-Antwort. Keine Schlüsselabruf-/Freigaberoute.
- **Benutzerfreundlichkeit:** Die bestehende Eigentümerliste zeigt Lade- und Fehlerzustände; eine abgelehnte Widerrufs-Transaktion wird nicht länger durch einen automatischen erneuten Listenabruf als Erfolg überdeckt. Erst bestätigter Widerruf triggert das Neuladen. Doppelte statische Platzhaltertabelle aus der Besitzerseite entfernt, während die tatsächliche geschlossene Einbindung per `heir-owner-invitations-bootstrap-staging.js` deaktiviert bleibt. Bestehende lokale Kontakte und Tresordaten unverändert.
- **Echter isolierter Chromium-Test:** `tests/security/heir-owner-transport-browser.py` startet eine temporäre localhost-Origin und nutzt reale Browser-`fetch`-Aufrufe, kontrollierte synthetische API-Antworten, frisch bezogene Testsessions, Widerrufsbestätigung, Neuladen, 401 und Weiterleitungsabwehr. Kein Produktivnetzwerk und keine echten Supabase-Tokens. Der zusätzliche Test läuft im bestehenden GitHub-Actions-Gate. Der Status darf erst nach erfolgreich bestätigter CI-Ausführung als bestanden gelten.
- **Restliche Freigabeblockaden:** Produktives Owner-UI ruft bewusst `mount({enabled:false})` auf; der neue Transport ist dort nicht geladen. Kein Netzwerk-Endpunkt, keine freigegebene reale Supabase-Session/Revocation, keine produktive Serverrolle, kein auditierter HTTPS-Ingress/CSP/XSS, keine produktive Migration und keine Erbenfreigabe.

## 21. Anmeldelebenszyklus mit getUser und gesperrtem Eigentümerportal (11. November 2026)

- **Nicht produktiv aktiviert:** `assets/heir-owner-session-staging.js` bindet optional die bestehende Supabase-JS-Authentifizierung an die vorhandenen, bereits geprüften Eigentümer-Listen-/Widerrufsbausteine: `getSession()` dient nur zum Abrufen des aktuellen Bearer-Tokens (keine Autorisierung aus lokalem Sessionobjekt), `getUser(token)` verifiziert die Identität über Supabase Auth vor jedem Aufruf. UID und Token werden nicht dauerhaft im Eigentümermodul gespeichert. Der eigentliche HTTP-Server muss den Token weiterhin selbst durch `auth.getUser(token)` prüfen.
- **Fail closed:** `onAuthStateChange` invalidiert und leert die Eigentümeransicht synchron bei Abmeldung, Kontowechsel oder Token-Erneuerung, verwirft alte Antwortgenerationen und bricht laufende HTTP-`fetch`-Aufrufe ab. Nach erfolgreicher Anmeldung wird die Liste mit erneut überprüfter Identität neu geladen. Ungültige, zu kurz gültige oder abgelaufene Sessions, fehlgeschlagenes `getUser` und HTTP-401/403 sperren die Ansicht. Eine eigene Ablaufzeitüberwachung schließt auch eine untätig geöffnete Liste spätestens fünf Sekunden vor Ende der aktuell verifizierten Access-Token-Gültigkeit; Sessionwechsel setzen den Timer zurück. `unsubscribe()` entfernt den Listener beim Dispose. Ein abgebrochener HTTP-Aufruf ist **kein** Ersatz für serverseitige Widerrufsprüfung.
- **Browsertransport:** `heir-owner-invitations-transport-staging.js` akzeptiert jetzt ein externes AbortSignal und einen `onUnauthorized`-Handler; Same-Origin, eingeschränkte Routen, No-Store und Redirect-Abweisung bleiben erhalten. Keine Master-Keys, Einmalcodes oder Schlüsselabruf-Endpunkte.
- **Keine Aktivierung in der öffentlichen App:** Das vorhandene `heir-owner-invitations-bootstrap-staging.js` verwendet weiterhin `enabled:false`. Der Sessionadapter wird **nicht** von der öffentlichen Besitzerseite geladen oder aufgerufen. Erst nach unabhängig geprüftem produktivem Server, Session-Revocation, CSP/XSS und Betriebsfreigabe darf eine kontrollierte Einbindung erfolgen.
- **Prüfung:** Neuer isolierter echter Chromium-Test `tests/security/heir-owner-session-browser.py` nutzt synthetische Supabase-Auth-Antworten und einen lokal intercepteten HTTP-Dienst. Er prüft gültige Eigentümersession, Abmeldung, Kontowechsel ohne Wiederverwendung alter Tokens, HTTP-401-Fail-Closed, Listener-Entfernung und fehlende Tokenpersistenz in diesem Modul. Die bestehende GitHub Actions CI führt den Test zusammen mit PostgreSQL 17 aus. **Keine** echte Supabase-Auth-E2E-Prüfung.
- **Offen:** Browser-UI-Freigabe, echte widerrufene Supabase-Sessions, sicherer Same-Origin-HTTPS-Ingress, gesonderte Serverrollen und RLS, CSP/XSS, Backups/Recovery und rechtlich unabhängige Erbenfreigabe. Keine produktive Migration, keine Edge Functions, keine Tresor- oder Erbenfreigabe.
