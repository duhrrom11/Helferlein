# Helferlein Wishes 2.0 – Technische Freigabe-Checkliste

**Stand:** 2026-11-10 · **Branch:** `feature/amazon-wishlist-foundation` · **Status:** Noch nicht freigegeben.

## 1. Automatisierte Tests
- [x] Testfälle für Sammelaktionen, gezieltes Retry, Stopp, Fortsetzung, Fehlerklassifizierung und Fortschritt vorhanden
- [x] Testfälle für Kontowechsel und veraltete parallele Ladeantworten vorhanden
- [x] Testfälle für kombinierte Filter, Sortierung und paginierte Ladefehler vorhanden
- [x] Testfälle für ungültige Pagination und fehlerhafte Serverdaten vorhanden
- [x] 24 Testfälle in isolierter JavaScript-Testausführung geprüft
- [ ] Vollständigen Node-Testlauf auf einem lokalen Checkout oder CI mit `node --test amazon-wishlist/bulk-helpers.test.mjs amazon-wishlist/bulk-workflows.test.mjs` durchführen
- [x] Isolierte Playwright-UI-Tests für Modale, mobile Toolbar, Tastaturbedienung und Statusanzeigen vorbereitet (`wishes-ui.spec.mjs`)
- [ ] Playwright-Tests tatsächlich im Browser ausführen (Browserpaket und Browser-Binaries lokal/CI erforderlich)
- [ ] Echte End-to-End-Tests mit simuliertem Supabase-Client und aktiver Dashboard-Logik ergänzen

## 2. Integrations- und Datenbanksicherheit
- [ ] Vorgeschlagene Tabellen und RLS-Regeln getrennt prüfen und ausdrücklich freigeben; keine automatische Migration
- [ ] Mit separater Testumgebung/Testdaten echte Supabase-Fehlerantworten und Pagination prüfen
- [ ] Kontowechsel während ausstehender Server-Schreiboperation im Browser prüfen
- [ ] Doppelte Zuordnungen, Rechtefehler und Wiederaufnahme nach Netzunterbrechung prüfen
- [ ] Sicherstellen, dass bestätigte Schreiboperationen nicht als atomar oder rückgängig machbar dargestellt werden

## 3. Performance und UX
- [x] Mitgliedschaftsdaten werden pro vollständigem Laden zwischengespeichert
- [x] Stabile Sortierung für paginierte Listenzuordnungen
- [x] Sammelaktionen bei unvollständigen Zuordnungsdaten gesperrt
- [ ] Große Listen mit realistischen Datenmengen im Browser profilieren
- [x] Zugängliche Bezeichnungen für Sammelaktionen und Fortschritt ergänzt; Auswahlumfang präzisiert
- [ ] Mobile Bedienung auf schmalen Displays und mit Screenreader verifizieren

## 4. Freigabe-Grenzen
- [x] Kein Merge, kein Deployment, keine kostenpflichtigen Dienste
- [x] Keine Änderungen an der produktiven Supabase-Datenbank
- [ ] Review des Draft-PR und der Datenbank-Schema-Vorschläge
- [ ] Separate ausdrückliche Freigabe vor jeder produktiven Migration oder Veröffentlichung

**Browser-Testaufruf:** Nach Einrichtung von Playwright im isolierten lokalen Checkout: `npx playwright test amazon-wishlist/wishes-ui.spec.mjs`. Die Tests laden eine skriptfreie HTML-Testansicht und stellen **keine** Verbindung zu Supabase her. Sie sind UI-Vertragstests, keine vollständigen E2E-Tests. Keine Paketinstallation oder Browserausführung in dieser Runde.

**Bewertung:** Funktionslogik und simulierte Fehlerpfade sind gut abgedeckt. Produktivfreigabe bleibt gesperrt, bis Node-Lauf, Browser-/Integrationstests und Schema-/RLS-Review abgeschlossen sind.
