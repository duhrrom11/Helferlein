# Helferlein – sichere Migration bestehender Tresore

Status: Vorbereitung. **Nicht automatisch ausfuehren.** Firestore-Regeln fuer `vaults` bleiben `allow read, write: if false`.

## Freigabe und aktueller Produktionsbefund (2026-11-08)

Der Projektbetreiber hat die Umsetzung und moeglichst zeitnahe Veroeffentlichung der sicheren Cloud-Anbindung ausdruecklich freigegeben. Das ist eine **Entwicklungsfreigabe**, aber kein Eigentumsnachweis fuer einzelne bestehende Tresore.

Produktiv geprueft: Supabase hat aktuell die Tabellen `user_data`, `wg_spaces` und `wg_members` mit aktivierter RLS. Es ist derzeit **keine Edge Function bereitgestellt**. Die Entwurfs-API `vault-api` ist deshalb noch kein produktiver Speicherweg. Der bestehende Firestore-Zugriff bleibt bis zu einer nachweisbar sicheren Umstellung gesperrt.

**Umsetzungsreihenfolge:** (1) sicheren neuen, benutzergebundenen Cloud-Tresor mit Auth und serverseitiger Autorisierung implementieren; (2) lokale Verschluesselung und Wiederherstellung ohne Datenverlust sicherstellen; (3) vorhandene Tresore erst nach gesonderter Eigentuemerpruefung migrieren; (4) produktive Bereitstellung mit Sicherheitspruefungen, Monitoring und Rollback; (5) die Browseroberflaeche erst dann auf den neuen Speicherweg umstellen. Keine pauschale Freigabe alter Firebase-Regeln.

## Optionale passwortgeschuetzte Cloud-Wiederherstellung (2026-11-08)

Die produktive Tabelle `vault_cloud_snapshots` besitzt nun ein optionales `recovery_key`-Feld. Die Aktion `Cloud-Wiederherstellung mit Passwort vorbereiten` verschluesselt den zufaelligen 256-Bit-Tresorschluessel im Browser mit AES-256-GCM und einem separaten Wiederherstellungspasswort (PBKDF2-SHA256, 600.000 Iterationen, zufaelliges Salt). Hochgeladen wird nur die verschluesselte Schluesselhuelle. Das Passwort und der unverschluesselte Schluessel werden nicht uebertragen. Das Passwort muss stark und separat aufbewahrt werden.

`Tresor aus Supabase wiederherstellen` ist ausschliesslich fuer einen **leeren lokalen Tresor** vorgesehen, liest nur den Datensatz des angemeldeten Kontos, entschluesselt den Schluessel mit dem Passwort und prueft den verschluesselten Inhalt, bevor der lokale Datensatz ersetzt wird. Vorhandene Eintraege werden nicht automatisch ueberschrieben. Die Wiederherstellung betrifft derzeit den verschluesselten Eintragsinhalt; lokal verwaltete Konfigurationsmetadaten (z. B. Personen, Alarm- und Check-in-Einstellungen) sind nicht Bestandteil der Cloud-Kopie und muessen kontrolliert bzw. neu eingerichtet werden. Die Funktion wurde noch nicht mit realen produktiven Benutzerkonten Ende-zu-Ende geprueft; lokale verschluesselte Backups bleiben zwingend empfohlen.

## Lesende Wiederherstellungsprobe

Die Aktion `Cloud-Wiederherstellung sicher pruefen` liest den verschluesselten Datensatz des angemeldeten Kontos und versucht die Entschluesselung mit dem **bereits lokal vorhandenen** Tresorschluessel. Sie kontrolliert die Tresor-ID und die Struktur der Eintragsliste und zeigt nur deren Anzahl an. Sie veraendert keine lokalen Daten und ist keine vollstaendige Migration. Auf einem neuen Geraet ohne lokalen Schluessel kann diese Probe die Daten nicht wiederherstellen. Fuer echte geraeteuebergreifende Wiederherstellung ist ein separat geschuetztes Schluessel-Wiederherstellungskonzept erforderlich, bevor Cloud-Backups als alleinige Datensicherung empfohlen werden.

## Cloud-Sicherungspruefung (2026-11-08)

Die Nachlass-Seite bietet zusaetzlich die Aktion `Supabase-Sicherungsstand pruefen`. Sie liest ausschliesslich den dem angemeldeten Konto zugeordneten Datensatz und vergleicht Tresor-ID, IV und Ciphertext mit dem lokal gespeicherten Stand. Die Pruefung schreibt keine Daten und importiert keine Tresore. Unterschiedliche IV/Ciphertext-Werte beweisen nicht, dass die Klartextinhalte unterschiedlich sind; die Anzeige vergleicht lediglich den exakt gespeicherten verschluesselten Stand. Eine Wiederherstellungsprobe ist damit **nicht** ersetzt.

## Neuer Supabase-Sicherungspfad (2026-11-08)

Produktiv ist die zusaetzliche Tabelle `public.vault_cloud_snapshots` mit RLS und vier eigentuemergebundenen Policies angelegt. Sie speichert nur `owner_user_id`, `vault_id`, `encrypted_data` und `updated_at`. Ein neuer manueller Knopf in der Nachlass-Seite erlaubt eine ausdruecklich bestaetigte, verschluesselte Kopie des lokalen Tresors in das aktuell angemeldete Supabase-Konto. Ein vorhandener, anders benannter Tresor im Konto wird nicht ueberschrieben.

**Grenze:** Dies ist noch keine vollstaendige Cloud-Wiederherstellung oder Migration des alten Firebase-Tresors. Der lokale `masterKeyHex` wird absichtlich nicht hochgeladen. Ohne lokal aufbewahrten Schluessel bzw. verschluesselte lokale Sicherungsdatei ist der Cloud-Datensatz allein nicht entschluesselbar. Die bisherige Firebase-Synchronisierung und Alarmfunktionen sind davon getrennt. Bestehende Firestore-Regeln bleiben gesperrt. Die neue Supabase-Kopie muss vor einer allgemeinen Cloud-Freigabe mit echten Benutzerkonten kontrolliert und ein sicherer Wiederherstellungsweg implementiert werden.

## Voraussetzungen

1. Firestore-Datenbank durch den Projektadministrator gesichert; Wiederherstellbarkeit geprueft.
2. Supabase-Migration `20261107000100_vault_ownership.sql` in einer Testumgebung ausgefuehrt und RLS/Rechte geprueft.
3. Edge Function `vault-api` in einer Testumgebung bereitgestellt; Authentifizierung, Fehlerpfade und Service-Role-Secrets geprueft.
4. Firestore-Zugriff ausschliesslich durch vertrauenswuerdigen Server mit minimalen IAM-Rechten. Niemals Service-Account-Schluessel in GitHub oder im Browser hinterlegen.
5. Audit-Log und Wiederherstellungsplan vorhanden.

## Migration pro bestehendem Tresor

1. Eigentuemerkonto ueber Supabase Auth identifizieren (auth.users.id).
2. Bestehenden Firestore-Tresor durch einen autorisierten Administrator serverseitig auffinden. Keine allgemeine Client-Leseerlaubnis aktivieren.
3. Eigentuemernachweis **unabhaengig** von frei eingebbaren Metadaten und bekannten Erben-Links pruefen. Besitz von vaultId, E-Mail-Adresse oder bereits ausgegebenem #key allein ist **kein** ausreichender Nachweis. Bei Zweifeln manuell klaeren und Zuordnung verweigern.
4. Nach dokumentierter Pruefung die Zuordnung `vault_id -> owner_user_id` mit `verification_method='admin_verified_migration'` durch eine privilegierte, auditierte Serveroperation anlegen. Keine direkte Client-INSERT-Policy.
5. Bestehende Zuordnungen nie stillschweigend ueberschreiben. Konflikte separat untersuchen.
6. Mit Testkonten pruefen: Eigentuemerkonto erkannt; fremdes Konto erhaelt 404; fehlende Anmeldung 401; Fehler 503; **kein** Tresorinhalt wird ausgegeben.
7. Erst nach separater Implementierung und Abnahme der serverseitigen Tresor-API Cloud-Funktionen schrittweise wieder aktivieren.

## Neue Tresore

Neue Tresore duerfen ausschliesslich durch eine authentifizierte Serveroperation erzeugt und im selben kontrollierten Ablauf dem authentifizierten Benutzer zugeordnet werden (`server_verified_creation`). Eine vom Client frei vorgegebene Tresor-ID darf keine fremden Datensaetze uebernehmen.

## Datenschutz der bisherigen Firebase-Synchronisierung

Der aktuelle Browser-Client schreibt bei einer bestaetigten Synchronisierung neben `encryptedData` auch `vaultId`, `ownerName`, `ownerEmail`, `lastCheckIn`, `checkInIntervalDays`, `alarmPersons` und einen serverseitigen Zeitstempel in Firestore. Diese Metadaten sind **nicht** durch die Verschluesselung von `encryptedData` geschuetzt. Die produktiven Firestore-Regeln verweigern derzeit Client-Zugriffe; deshalb ist eine erfolgreiche Synchronisierung nicht vorauszusetzen.

Vor einer neuen Cloud-API: Datenminimierung und Zweckbindung fuer Metadaten festlegen; personenbezogene Alarmkontakte nur bei ausdruecklich erforderlichem Zweck verarbeiten; serverseitige Autorisierung, Loeschung und Aufbewahrungsfristen definieren. Bestehende Firestore-Datensaetze nicht ohne Eigentuemernachweis uebernehmen oder loeschen.

## Offene Sicherheitsanforderungen

- Check-in-Zeitpunkt und Notfallstatus muessen serverseitig gegen Manipulation geschuetzt werden.
- Die Erbenfreigabe muss **vor** Ausgabe von Schluessel oder entschluesselbaren Daten serverseitig durchgesetzt werden.
- Bereits verteilte Links mit Schluesseln koennen nicht rueckwirkend geheim gemacht werden; ein neues Schluessel-/Freigabekonzept ist erforderlich.
- Supabase-Edge-Function-Deployment, CORS, Secrets, Ratenbegrenzung, Monitoring, Tests und Datenschutz sind noch offen.
- Bestehende Firestore-Daten koennen wegen der frueheren offenen Regeln manipuliert worden sein; Plausibilitaet und Integritaet vor Migration pruefen.

## Produktiv-Freigabekriterien

Die bestehende Nachlass-Seite darf nur als **lokaler Tresor mit nicht garantierter Cloud-Sicherung** beschrieben werden, solange die Firebase-Schreibregeln gesperrt sind und keine abgenommene serverseitige API existiert. Ein erfolgreicher lokaler Speichervorgang ist kein Beleg fuer Cloud-Speicherung.

Eine spaetere Cloud-Freigabe erfordert nachweisbar: authentifizierte und unabhaengig verifizierte Eigentuemerschaft, strikte Mandantentrennung, keine Uebernahme fremder Tresore, datensparsame Metadaten, Wiederherstellungsproben mit kontrollierten Testkonten ausserhalb der Produktivdaten, dokumentierten Rollback und Sicherheitsabnahme. Ohne diese Nachweise **keine Migration, keine neuen Cloud-Schreibrechte und keine automatische Zuordnung bestehender Tresore**.

## Verbotene Abkuerzungen

- Niemals `allow read, write: if true` reaktivieren.
- Niemals Eigentuemerdaten anhand `ownerEmail`, `vaultId` oder Erben-Link automatisch zuweisen.
- Niemals Service-Role- oder Firebase-Admin-Schluessel in statische GitHub-Pages-Dateien schreiben.
- Niemals den aktuellen Client-Check-in als Sicherheitsnachweis akzeptieren.
