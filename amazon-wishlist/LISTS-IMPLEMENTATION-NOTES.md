# Wunschlisten 2.0 – Meilenstein 1

## Implementiert im Feature-Branch
- `lists-dashboard.mjs`: Listen-Dashboard, Anlegen, Umbenennen, Archivieren, Reaktivieren, Duplizieren einschließlich Zuordnungen, Löschen, Zuordnung vorhandener Wünsche zu mehreren Listen.
- `index.html`: Formular und responsive Kartenansicht.
- `app.mjs`: Dashboard beim Auth-Wechsel und nach Wunschänderungen aktualisieren.
- `LISTS-SCHEMA-PROPOSAL.sql`: **nur Entwurf**, nicht auf die produktive Datenbank angewandt.

## Aktivierung (später, nur mit ausdrücklicher Freigabe)
1. Schema mit dem tatsächlich vorhandenen Tabellenmodell abgleichen und in einer nichtproduktiven Umgebung prüfen.
2. Datenbankänderung ausdrücklich genehmigen und erst dann ausführen.
3. Bestehende Wünsche in eine Standardliste übernehmen; diese Migration ist noch nicht implementiert.
4. Kurzen Browser-Smoke für Erstellen, Zuordnen, Duplizieren und Kontowechsel durchführen.

## Bekannte Grenzen
- Bis zur Schema-Aktivierung zeigt das Dashboard eine verständliche Meldung statt funktionsfähiger Datenbankaktionen.
- `private` bedeutet aktuell nur: die **Sammlung** ist nicht für andere lesbar. Bestehende Wünsche bleiben über den bisherigen öffentlichen Feed sichtbar. Private Wünsche selbst benötigen später ein separates Berechtigungsmodell.
- `public` ist vorbereitet, aber öffentliche Listen-URLs und Teilen sind noch nicht implementiert.
- Der Wunsch-Editor erstellt weiterhin Wünsche im bisherigen System; die Listen-Zuordnung erfolgt anschließend im Dashboard.
- Das Dashboard lädt bis zu 200 eigene Wünsche für die Zuordnung; Pagination folgt später.
- Kein Merge, kein Deployment, keine Produktivdatenänderung; Tests am neuen Head nicht bestätigt.

## Nächste Entwicklungsrunde
- Listenauswahl im Wunsch-Editor: beim Anlegen eines Wunsches optional sofortige Zuordnung; Fehler der Zuordnung wird separat angezeigt, der gespeicherte Wunsch bleibt erhalten.
- Dashboard-Zähler und responsive Karten-Optik; ausgewählte Liste visuell markiert.
- `DEFAULT-LIST-BACKFILL-PROPOSAL.sql`: ausschließlich vorbereitete, nicht ausgeführte Übernahme vorhandener Wünsche in `Meine Wünsche`.
- Die Standardliste wird erst nach ausdrücklicher Freigabe des Schemas und der Übernahme tatsächlich erstellt; für neue Konten gibt es noch keine automatische Anlage.
- Bestehende öffentliche Wünsche bleiben weiterhin öffentlich, auch wenn ihre Sammlung privat heißt.
- Keine Live-DB-Änderung, kein Merge, kein Deployment. Browser- und CI-Prüfungen nicht bestätigt.

## Listen-Editor und Dashboard-Schnellaktionen
- Bearbeitungsformular für Titel, Beschreibung, Symbol und Farbe mit Speichern/Abbrechen.
- Farbig gestaltete Karten, ausgewählte Karte hervorgehoben, kompakte Kartenaktionen.
- Schnellaktionen für neue Liste, Wunsch hinzufügen und ausgewählte Liste öffnen.
- Zurücksetzen des Editors und der Dashboard-Zähler bei Kontowechsel.
- JavaScript-Syntax des Listen-Dashboard-Moduls geprüft; keine Browser- oder Live-Datenbankprüfung durchgeführt.
- SQL-Entwürfe unverändert und nicht ausgeführt; kein Merge, kein Deployment.
