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
