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

## Nachfolgende Änderungen (Entwicklungsstand)

Nach einer **ausdrücklich bestätigten** Erstübernahme wird für den angemeldeten Benutzer die Cloud-Synchronisierung aktiviert. Erfolgreiche synchrone lokale `saveData()`-Aufrufe in Pflanzenpflege und Zählerstände melden den neuen Stand zusätzlich an die Cloud-Warteschlange. Beim Wiederverbinden kann der ausstehende Stand übertragen werden. Die lokale Speicherung bleibt die unmittelbare Schreibquelle der bisherigen Oberfläche; ein fehlgeschlagener Cloud-Aufruf darf sie nicht rückgängig machen.

**Nicht freigeben, bevor gelöst:** Die bisherigen lokalen Datenschlüssel sind nicht benutzerbezogen. Ein Benutzerwechsel am selben Browser kann sonst fremde lokale Daten anzeigen. Deshalb ist der Entwurfsbranch ausdrücklich **nicht mergefähig**, bis der Benutzerwechsel und das Cache-Switching sauber implementiert sind. Auch parallele Cloud-Neuanlagen benötigen eine eindeutige Datenbank-Constraint; kein produktiver Schemaeingriff ohne gesonderte Prüfung. Konflikte müssen sichtbar und ohne Datenverlust auflösbar sein.


## Integrationsstand (November 2026)

Die oben beschriebenen frühen Zwischenstände sind historisch. Aktuell werden die beiden
Werkzeuge **Pflanzenpflege/Gießplan** und **Zählerstände erfassen** mit dem gemeinsamen
Cloud-Adapter und einer Opt-in-Migrationsoberfläche geladen. Nach bestätigter Aktivierung
melden beide Werkzeuge lokale Speicherungen an eine benutzerbezogene Supabase-Warteschlange.
Offline-Änderungen bleiben im Browser gespeichert, bis eine sichere Übertragung möglich ist.
Eine Online-Aktualisierung übernimmt Supabase-Daten nur, wenn der sichtbare lokale Stand
noch der zuvor bekannten Cloud-Kopie entspricht und keine Änderungen ausstehen.

### Bekannte produktionskritische Grenzen

1. Die beiden Oberflächen verwenden weiterhin die **gemeinsam benannten lokalen Schlüssel**.
   Der Kontoschutzdialog sperrt zwar bei erkannter Kontodifferenz die Bedienung, aber
   die Benutzertrennung ist nicht durchgängig. Eine benutzerbezogene Datenzugriffsschicht
   muss vor der Livefreigabe eingeführt werden.
2. Der Datenfluss ist noch **lokal zuerst**, nicht vollständig Supabase-autoritativ.
   Das ist eine Übergangslösung, kein abgeschlossener Online-/Offline-Betrieb.
3. Auf `public.user_data` fehlt eine eindeutige Constraint für `(user_id, tool)`.
   Parallele erstmalige Inserts können Duplikate erzeugen. Der Client stoppt bei
   erkannten Duplikaten, kann deren Entstehung aber ohne Datenbankconstraint nicht verhindern.
4. Nicht alle Helferlein-Werkzeuge sind angebunden. Die übrigen Speicherformate
   müssen vor der Umstellung einzeln erfasst und sicher migriert werden.
5. Eine unabhängige Abnahme der kritischen Pfade steht noch aus. Auf Wunsch des
   Betreibers werden derzeit keine automatischen oder manuellen Tests ausgeführt.

### Vorbereitende, ausschließlich lesende Datenbankabfragen

Diese Abfragen sind **nur als Vorlage** dokumentiert. Sie werden nicht automatisch
auf der Produktivdatenbank ausgeführt.

```sql
-- Vor jeder eindeutigen Einschränkung zunächst vorhandene Duplikate finden.
select user_id, tool, count(*) as rows_per_tool
from public.user_data
group by user_id, tool
having count(*) > 1
order by rows_per_tool desc;

-- Bestehende Index-/Constraint-Definitionen ohne Datenänderung prüfen.
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'user_data';
```

### Schemaänderung nur nach gesonderter Freigabe

Eine eindeutige Einschränkung kann erst nach Analyse und gegebenenfalls manueller,
verlustfreier Auflösung vorhandener Duplikate eingeführt werden. **Nicht ungeprüft ausführen:**

```sql
-- ENTWURF; NICHT AUTOMATISCH AUSFÜHREN.
-- Vorher RLS, vorhandene Duplikate und abhängige Clients prüfen.
create unique index concurrently if not exists user_data_user_tool_unique
on public.user_data (user_id, tool);
```

Der Index schützt nur vor parallelen Duplikaten. Der Client muss zusätzlich
Unique-Violations als Konflikt behandeln und den ausstehenden lokalen Stand behalten.

### Freigabekriterien

- Alle Werkzeuge sind inventarisiert, angebunden und pro Konto isoliert.
- Online-Daten stammen aus Supabase; lokale Änderungen sind nur Offline-Puffer.
- Bestehende Daten sind ohne stille Uploads, Löschungen oder Überschreibungen übernehmbar.
- Gleichzeitige Erst-Inserts und Revisionen sind auf Datenbank- und Client-Seite abgesichert.
- Konflikte können nachvollziehbar und ohne Datenverlust behandelt werden.
- Die technische Abnahme ist ausdrücklich beauftragt und erfolgreich abgeschlossen.
- Merge und Veröffentlichung erfolgen erst nach gesonderter Freigabe.


## Erweiterte Werkzeuganbindung (November 2026, Entwicklungsbranch)

Folgende Werkzeuge besitzen nun die gemeinsame **Opt-in**-Cloud-Brücke für ihre
jeweilige primäre JSON-Datensammlung. Die lokalen Legacy-Schlüssel werden noch
verwendet; die vorgeschaltete Sichtschutz-Sperre ist keine vollständige
benutzerbezogene Datenzugriffsschicht.

| Werkzeug | Primärer lokaler Schlüssel | Sammlung |
| --- | --- | --- |
| Pflanzenpflege | `pflanzen_pass_v10` | `plants` |
| Zählerstände | `energie_tracker_pro_v8` | `readings` |
| Umzugskisten | `mini_homebox_pro` | `boxes` |
| Autokosten | `kfz_tracker_pro_v3` | `cars` |
| Haustier-Gesundheitspass | `haustier_pass_pro_v5` | `pets` |
| Verliehene Gegenstände | `verleih_tracker_pro_v3` | `items` |
| Parkplatzverlauf | `park_history_pro_v3` | `sessions` |

**Noch nicht vollständig angebunden:** Haushaltsbuch (mehrere lokale Datenquellen),
WG-Organisator (mehrere gemeinsame und WG-spezifische Datenquellen),
Backform-Rezepte (bisher ein JSON-Array statt eines Cloud-Objekts) und
Digitaler Nachlass (verschlüsselter Tresor; Schlüssel- und Datenschutzkonzept
muss vor einer Cloud-Übernahme gesondert festgelegt werden).

**Nicht automatisch synchronisiert:** Der laufende Parktimer `park_end_time`
und weitere separat gespeicherte UI-Einstellungen oder Zusatzdatensammlungen.
Die Migration darf keine falsche Aussage über eine vollständige Sicherung treffen.

### Kontoschutz als Zwischenmaßnahme

Die sieben angebundenen Werkzeugseiten aktivieren vor der Ausführung der
Anwendungsskripte eine Sichtschutz-Sperre, sofern ein bisheriger Besitzer für
das Werkzeug gespeichert ist. Der gemeinsame Auth-Guard gibt die Oberfläche
erst nach einer Kontoprüfung frei bzw. zeigt einen blockierenden Kontodialog.
Bei Auth-Ereignissen wird der Sichtschutz erneut gesetzt. Die **vollständige**
Trennung erfordert dennoch benutzerbezogene Legacy-Speicherschlüssel und einen
kontrollierten Wechsel der aktiven Datensammlung; diese Architekturarbeit
ist noch offen.

### Parallele Erst-Inserts

Der Client erkennt PostgreSQL-Fehlercode `23505` und behält den lokalen
Pending-Puffer. Ohne Unique-Constraint auf `(user_id, tool)` bleibt aber
weiterhin ein Rennen möglich, bei dem beide Inserts erfolgreich sind.
Eine produktive Schemaänderung wird erst nach expliziter Genehmigung und
Prüfung bestehender Duplikate durchgeführt.


## Weitere Sicherheitsarbeiten (November 2026)

- Die sieben angebundenen Werkzeuge verweigern lokale Schreibzugriffe, wenn
  bereits eine Kontozuordnung besteht, aber die Cloud-Brücke nicht geladen ist.
- In Umzugskisten, Autokosten, Haustierpass, Verleih und Parkplatzverlauf
  wurden 30 Aufrufstellen so geändert, dass nach fehlgeschlagenem Speichern
  keine nachfolgenden UI-Aktionen als Erfolg ausgeführt werden.
- Die Kontobrücke lässt bei bereits zugeordneten Konten lokale Schreibzugriffe
  erst nach abgeschlossener Kontoverifikation zu; Auth-Ereignisse entziehen
  diese Freigabe sofort bis zur erneuten Prüfung.
- Der Cloud-Adapter übernimmt die neue Serverrevision erst beim finalen
  Acknowledgement; ein nicht bestätigter Schreibvorgang soll den lokalen
  Revisionsstand nicht voreilig erhöhen.

**Wichtig:** Dies ist kein abgeschlossener Livegang. Für die Benutzertrennung
sind weiterhin benutzerbezogene Legacy-Speicherschlüssel erforderlich.
Die vier noch nicht vollständig integrierten Werkzeuge brauchen eigene
Datenmodelle; insbesondere dürfen verschlüsselte Tresordaten nicht ohne
abgenommenes Schlüsselkonzept übertragen werden.
