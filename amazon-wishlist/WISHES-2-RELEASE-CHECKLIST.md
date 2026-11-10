# Helferlein Wishes 2.0 – Technische Freigabe-Checkliste

**Stand:** 2026-11-10 · **Branch:** `feature/amazon-wishlist-foundation` · **Status:** Noch nicht freigegeben.

## 1. Automatisierte Tests
- [x] Testfälle für Sammelaktionen, gezieltes Retry, Stopp, Fortsetzung, Fehlerklassifizierung und Fortschritt vorhanden
- [x] Testfälle für Kontowechsel und veraltete parallele Ladeantworten vorhanden
- [x] Testfälle für kombinierte Filter, Sortierung und paginierte Ladefehler vorhanden
- [x] Testfälle für ungültige Pagination und fehlerhafte Serverdaten vorhanden
- [x] 27 Testfälle in isolierter JavaScript-Testausführung erfolgreich geprüft (inklusive simulierter Dashboard-Abläufe)
- [x] Echter Node-Testlauf in isolierter Umgebung: 13/13 zusätzliche Tests bestanden (lokal rekonstruierte Helper-Datei und eigener Testtreiber, **nicht** die vollständige Branch-Testsuite)
- [ ] Vollständigen Node-Testlauf auf einem lokalen Checkout oder CI mit `node --test amazon-wishlist/bulk-helpers.test.mjs amazon-wishlist/bulk-workflows.test.mjs` durchführen
- [x] Neun isolierte Playwright-UI-Testfälle für Modale, Auswahl, Retry, mobile Toolbar, Tastaturbedienung und Statusanzeigen vorbereitet (`wishes-ui.spec.mjs`)
- [x] Echter Chromium-Browserlauf in isolierter Umgebung: 6/6 Prüfungen bestanden (rekonstruierter HTML/CSS-Ausschnitt, **nicht** die vollständige Branch-Webseite)
- [ ] Branch-Playwright-Suite `wishes-ui.spec.mjs` auf einem vollständigen Checkout ausführen
- [x] Zusätzliche simulierte Dashboard-Abläufe (Filter → Bestätigung → Zuordnung → Retry, Abbruch, Kontowechsel) als Logiktests ergänzt
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
- [x] Sammelaktionen, Auswahlfelder und Bestätigungen bei unvollständigen Zuordnungsdaten gesperrt
- [ ] Große Listen mit realistischen Datenmengen im Browser profilieren
- [x] Zugängliche Bezeichnungen für Sammelaktionen und Fortschritt ergänzt; Auswahlumfang präzisiert
- [ ] Mobile Bedienung auf schmalen Displays und mit Screenreader verifizieren

## 4. Freigabe-Grenzen
- [x] Kein Merge, kein Deployment, keine kostenpflichtigen Dienste
- [x] Keine Änderungen an der produktiven Supabase-Datenbank
- [ ] Review des Draft-PR und der Datenbank-Schema-Vorschläge
- [ ] Separate ausdrückliche Freigabe vor jeder produktiven Migration oder Veröffentlichung

**Browser-Testaufruf:** Nach Einrichtung von Playwright im isolierten lokalen Checkout: `npx playwright test amazon-wishlist/wishes-ui.spec.mjs`. Die Tests laden eine skriptfreie HTML-Testansicht und stellen **keine** Verbindung zu Supabase her. Sie sind UI-Vertragstests mit simulierten DOM-Ereignissen, keine vollständigen E2E-Tests. Die zusätzlichen Interaktionsfälle testen isolierte UI-Reaktionen, nicht den produktiven Event-Code. Ein echter Node-Lauf (13/13) und ein echter Chromium-Lauf (6/6) wurden mit lokal rekonstruierten, isolierten Testdateien ausgeführt. Die vorhandenen 27 Branch-Node-Tests und 9 Branch-Playwright-Tests wurden **nicht** als komplette Suite ausgeführt; die lokalen Prüfungen sind kein Ersatz für diese Freigabeschritte.

**Fehlerbehebung:** Veraltete Ladefehler nach Kontowechsel/neu gestartetem Laden überschreiben die aktuelle Statusanzeige nicht mehr. Zusätzliche Auswahl-Handler prüfen den Mitgliedschaftsstatus auch bei programmgesteuerten Ereignissen.

**Bewertung:** Funktionslogik und simulierte Fehlerpfade sind gut abgedeckt. Produktivfreigabe bleibt gesperrt, bis Node-Lauf, Browser-/Integrationstests und Schema-/RLS-Review abgeschlossen sind.

## Reproduzierbarer vollständiger Branch-Testlauf (2026-11-10)
- [x] `amazon-wishlist/package.json` mit festen Befehlen und Playwright-Version 1.56.1 ergänzt
- [x] `amazon-wishlist/playwright.config.mjs` für Chromium, einen Worker, keine Retries und lokale Ausgabe ergänzt
- [x] `amazon-wishlist/run-wishes-tests.sh` als ausführbares Testskript für einen Checkout vorbereitet (mit `bash` starten)
- [x] Lokaler Node-Lauf tatsächlich ausgeführt: **13/13 bestanden**, `node --test real-node.test.mjs` unter `/mnt/data/helferlein-test-run`; dies ist **nicht** die Branch-Suite
- [x] Lokaler Chromium-Lauf tatsächlich ausgeführt: **6/6 bestanden**, `python browser-check.py` unter `/mnt/data/helferlein-test-run`; dies ist **nicht** die Branch-Suite
- [ ] Aktuelle Branch-Dateien vollständig lokal auschecken und `cd amazon-wishlist && bash run-wishes-tests.sh` ausführen
- [ ] In diesem Checkout Browser-Abhängigkeiten installieren: `npm install --ignore-scripts --no-audit --no-fund`; Chromium bei Bedarf mit `npx playwright install chromium` bereitstellen und `bash run-wishes-tests.sh --browser` ausführen
- [ ] Für streng reproduzierbare Paketinstallation ein geprüftes `package-lock.json` erzeugen und versionieren, danach `npm ci` verwenden
- [ ] Browser-Fehlschläge und Screenshots auf Basis des echten Branch-HTML untersuchen; ohne vollständigen Checkout keine Aussage über Bestehen der neun Branch-UI-Tests

**Testgrenzen:** In der Laufzeit war kein Netzwerkzugriff auf GitHub verfügbar; die lokal bereitgestellte ZIP-Datei enthält den Main-Branch und nicht den aktuellen Feature-Branch. Daher wurden keine vollständigen Branch-Testläufe als erfolgreich ausgewiesen. Die vorhandenen lokalen Node-/Chromium-Prüfungen sind lediglich zusätzliche Evidenz.

**Sicherheitsgrenzen:** Keine produktiven Supabase-Zugriffe oder -Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.
