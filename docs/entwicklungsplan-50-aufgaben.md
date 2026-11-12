# Helferlein – priorisierte 50-Aufgaben-Roadmap

Stand: 2026-11-09. Diese Liste ist eine **Priorisierung**, keine Behauptung, dass alle Punkte bereits umgesetzt oder getestet wurden. Änderungen nur in separaten Branches/Draft-PRs; keine Produktivdatenbank-Änderungen, keine Deployments und kein automatisches Merge.

**Status:** `[ ]` offen · `[x]` durch eigenen PR vorbereitet (noch nicht produktiv). Jede Aufgabe braucht vor Abschluss einen nachprüfbaren Nachweis.

- [x] **01** · P0 · Koordinator · Morgenbericht bei ausgefallenen 06-Uhr-Läufen nachholen — vorbereitet in Draft-PR #176; Review und Merge offen
- [ ] **02** · P0 · Koordinator · Tagesstatistiken trotz 100-Einträge-Grenze erhalten
- [x] **03** · P0 · Koordinator · Manuelle Läufe in Berichten gesondert kennzeichnen — vorbereitet in Draft-PR #176; Review und Merge offen
- [ ] **04** · P0 · Koordinator · Doppelte Morgenberichte bei Wiederholung verhindern
- [ ] **05** · P0 · Koordinator · Checkpoint-Struktur mit automatischen Offline-Tests absichern
- [x] **06** · P0 · Koordinator · GitHub-API-Timeouts begrenzen — vorbereitet in Draft-PR #177; Review und Merge offen
- [ ] **07** · P0 · Koordinator · GitHub-API-Fehler und Rate-Limits eindeutig protokollieren
- [ ] **08** · P0 · Koordinator · Fehlgeschlagene Prüfungen als Warnung im Bericht hervorheben
- [ ] **09** · P0 · Koordinator · Stale-Checkpoint-Erkennung ergänzen
- [ ] **10** · P0 · Koordinator · Bericht bei Zeitumstellung Europe/Berlin verifizieren
- [ ] **11** · P0 · Agent · GitHub-Actions-PR-Berechtigung prüfen und dokumentieren
- [ ] **12** · P0 · Agent · Agent-Vorschlagsformat mit Pflichtfeldern validieren
- [ ] **13** · P0 · Agent · OpenAI-Antworten auf sensible Inhalte prüfen
- [ ] **14** · P0 · Agent · Agent-Läufe mit Kosten- und Tokenlimit dokumentieren
- [ ] **15** · P0 · Agent · Wiederholte identische Agent-Vorschläge erkennen
- [ ] **16** · P0 · Agent · Vorschläge eindeutig auf GitHub-Lauf zurückführen
- [ ] **17** · P0 · Agent · PR-Erstellung bei vorhandenen Branches idempotent machen
- [ ] **18** · P0 · Agent · Sichere Agent-Dateipfad-Whitelist separat testen
- [ ] **19** · P0 · Agent · Agent-Fehler ohne Offenlegung von Secrets melden
- [ ] **20** · P0 · Agent · Menschliche Freigabekriterien für Codeänderungen dokumentieren
- [ ] **21** · P1 · Qualität · Release-Smoke-Test um defekte interne Links ergänzen
- [ ] **22** · P1 · Qualität · Sitemap-Einträge gegen vorhandene Seiten prüfen
- [ ] **23** · P1 · Qualität · Navigation auf nicht erreichbare lokale Ziele prüfen
- [ ] **24** · P1 · Qualität · PWA-Manifest auf ungültige Dateireferenzen prüfen
- [ ] **25** · P1 · Qualität · Barrierefreiheit: Bilder ohne Alternativtext inventarisieren
- [ ] **26** · P1 · Qualität · Barrierefreiheit: Formulare ohne Labels inventarisieren
- [ ] **27** · P1 · Qualität · Barrierefreiheit: Dialoge und Fokusführung überprüfen
- [ ] **28** · P1 · Qualität · Mobile Layouts auf horizontales Scrollen prüfen
- [ ] **29** · P1 · Qualität · Fehlerzustände bei Offline-Betrieb dokumentieren
- [ ] **30** · P1 · Qualität · Browser-Smoke-Prüfungen für Hauptnavigation erweitern
- [ ] **31** · P1 · Haushaltsbuch · CSV-Export auf Sonderzeichen und Zeilenumbrüche prüfen
- [ ] **32** · P1 · Haushaltsbuch · Backup-Import auf ungültige Datumswerte prüfen
- [ ] **33** · P1 · Haushaltsbuch · Doppelte Buchungen mit Regressionstest abdecken
- [ ] **34** · P1 · Haushaltsbuch · PDF-Bericht auf leere Zeiträume prüfen
- [ ] **35** · P1 · Haushaltsbuch · Rundung und Währungsformatierung prüfen
- [ ] **36** · P1 · Wunschliste · Wunschlisten-Berechtigungen nur lesend prüfen
- [ ] **37** · P1 · Wunschliste · Offline-Synchronisationskonflikte dokumentieren
- [ ] **38** · P1 · Wunschliste · Doppelte Wunschlisteneinträge erkennen
- [ ] **39** · P1 · Wunschliste · Fehlerhafte Produktlinks sicher behandeln
- [ ] **40** · P1 · Wunschliste · Import- und Exportformat dokumentieren
- [ ] **41** · P2 · Sicherheit · Tresor-Sperre durch statische Regression absichern
- [ ] **42** · P2 · Sicherheit · Auth- und Sessionfehler in WG-Oberfläche prüfen
- [ ] **43** · P2 · Sicherheit · RLS-Migrationen auf Namenskollisionen prüfen
- [ ] **44** · P2 · Sicherheit · Keine Service-Role-Schlüssel in Frontend-Dateien prüfen
- [ ] **45** · P2 · Sicherheit · Externe Links auf rel=noopener prüfen
- [ ] **46** · P2 · Betrieb · GitHub-Workflow-Berechtigungen inventarisieren
- [ ] **47** · P2 · Betrieb · GitHub-Action-Versionen und Pinning prüfen
- [ ] **48** · P2 · Betrieb · Produktivabnahme-Checkliste mit Verantwortlichen versehen
- [ ] **49** · P2 · Betrieb · Wiederherstellungsanleitung für Backups präzisieren
- [ ] **50** · P2 · Betrieb · Release-Checkliste und Rollback-Schritte dokumentieren

## Arbeitsregeln

- Kleine, isolierte Änderungen bevorzugen; Aufgaben mit Auth/RLS/Tresor nur nach menschlicher Freigabe.
- PR-Nummer und Prüfergebnis beim Fortschritt ergänzen; PR nicht mit erledigter Produktivumsetzung verwechseln.
- Keine echten Nutzerdaten oder Geheimnisse in Issues, PRs oder Logs.
