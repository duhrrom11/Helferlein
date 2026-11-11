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
