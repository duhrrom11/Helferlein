# Helferlein – sichere Migration bestehender Tresore

Status: Vorbereitung. **Nicht automatisch ausfuehren.** Firestore-Regeln fuer `vaults` bleiben `allow read, write: if false`.

## Freigabe und aktueller Produktionsbefund (2026-11-08)

Der Projektbetreiber hat die Umsetzung und moeglichst zeitnahe Veroeffentlichung der sicheren Cloud-Anbindung ausdruecklich freigegeben. Das ist eine **Entwicklungsfreigabe**, aber kein Eigentumsnachweis fuer einzelne bestehende Tresore.

Produktiv geprueft: Supabase hat aktuell die Tabellen `user_data`, `wg_spaces` und `wg_members` mit aktivierter RLS. Es ist derzeit **keine Edge Function bereitgestellt**. Die Entwurfs-API `vault-api` ist deshalb noch kein produktiver Speicherweg. Der bestehende Firestore-Zugriff bleibt bis zu einer nachweisbar sicheren Umstellung gesperrt.

**Umsetzungsreihenfolge:** (1) sicheren neuen, benutzergebundenen Cloud-Tresor mit Auth und serverseitiger Autorisierung implementieren; (2) lokale Verschluesselung und Wiederherstellung ohne Datenverlust sicherstellen; (3) vorhandene Tresore erst nach gesonderter Eigentuemerpruefung migrieren; (4) produktive Bereitstellung mit Sicherheitspruefungen, Monitoring und Rollback; (5) die Browseroberflaeche erst dann auf den neuen Speicherweg umstellen. Keine pauschale Freigabe alter Firebase-Regeln.

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
