# Supabase-Umstellung: sicherer Integrationsplan

Status: Entwicklungsbranch, **nicht produktiv eingebunden**.

## Bereits vorhanden
- Supabase Auth in der Startseite und den beiden geprüften Werkzeugen.
- Produktive Tabelle `public.user_data` mit RLS und Spalten `user_id`, `tool`, `data`, `updated_at`.
- Gemeinsamer Adapter `shared/helferlein-cloud-store.js`, noch nicht aus HTML geladen.

## Geprüfte lokale Datenquellen
| Werkzeug | Bisheriger lokaler Schlüssel |
|---|---|
| Pflanzenpflege / Gießplan | `pflanzen_pass_v10` |
| Zählerstände erfassen | `energie_tracker_pro_v8` |

Die bestehenden `getData()`/`saveData()`-Funktionen sind synchron und werden in vielen UI-Aktionen verwendet. Ein direktes Ersetzen durch asynchrone Supabase-Aufrufe kann Renderfehler, verlorene Änderungen und versehentliche Cloud-Überschreibungen verursachen.

## Verbindliche Umsetzungsschritte
1. Authentifizierten Benutzer ermitteln und Daten erst danach laden.
2. Benutzerbezogenen lokalen Cache für die synchrone UI bereitstellen; bei Benutzerwechsel den aktiven Cache wechseln und die Oberfläche neu laden.
3. Vorhandene lokale Daten **nicht automatisch** hochladen oder löschen. Migration nur mit expliziter Bestätigung und Vorschau.
4. Mutationen zuerst zuverlässig lokal persistieren; anschließend Cloud-Sync asynchron anstoßen. Synchronisationsfehler sichtbar anzeigen und den lokalen Puffer erhalten.
5. Bei Änderungen auf mehreren Geräten Konflikte sichtbar auflösen; keine automatischen Überschreibungen.
6. Für Offline-Erfassung eine zuvor bestätigte Cloud-Basis voraussetzen; nach Anmeldung erneut synchronisieren.
7. Bei gleichzeitiger Neuanlage eines Cloud-Datensatzes eindeutige Einschränkung auf `(user_id, tool)` vorsehen; Migration vorher auf vorhandene Duplikate prüfen.
8. Backup-/Restore-Bedienelemente erst nach verifizierter Cloud-Migration entfernen. Vorhandene lokale Daten nicht löschen.
9. Für alle weiteren Helferlein-Werkzeuge deren Speicherformate und Datenflüsse separat erfassen.

## Sicherheit
- Nur Browser-Publishable-/Anon-Key, niemals Service-Role-Key.
- RLS für jeden Datensatz anhand von `auth.uid() = user_id`.
- Keine produktiven Testdaten, keine schreibenden Verifikationen auf der Produktivdatenbank.
- Vor Livegang unabhängige Prüfung der Konfliktbehandlung, Auth-Wechsel, Offline-Fälle und Datenmigration.

## Aktuelle Grenze
Der Adapter allein ist noch keine vollständige Integration. Insbesondere die Offline-Basis, parallele Schreibvorgänge und die sichere UI-Anbindung müssen vor Aktivierung weiter ausgearbeitet werden.

## Entwicklungsstand: Opt-in-Oberfläche

In beiden geprüften Werkzeugen sind die Skripte `shared/helferlein-cloud-store.js` und `shared/helferlein-cloud-migration.js` eingebunden. Eine Benutzeraktion kann den Cloud-Status anzeigen oder eine ausdrücklich bestätigte Erstübernahme auslösen. Cloud-Daten werden nur in einen vollständig leeren bisherigen lokalen Schlüssel geladen. Bestehende Daten werden nicht automatisch gelöscht oder überschrieben.

**Wichtig:** Dies ist noch **keine automatische Supabase-Datenhaltung**. Die vorhandenen synchronen `getData()`/`saveData()`-Funktionen verwenden weiterhin die bisherigen lokalen Schlüssel. Änderungen nach der Erstübernahme werden derzeit nicht automatisch in Supabase gespeichert. Bis eine sichere, laufende Synchronisierung implementiert und freigegeben ist, darf diese Funktion nicht als vollständige Cloud-Sicherung beworben werden.

Die opt-in-Übernahme ist für den Entwurfs-PR vorgesehen, nicht für die produktive Freischaltung. Vor einem Merge müssen unter anderem doppelte Cloud-Zeilen, konkurrierende Erstübernahmen, Benutzerwechsel und Datenformate abgesichert werden. Keine produktiven Testdaten anlegen.
