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

## Dependency-Lockfile und erneute lokale Prüfungen (2026-11-10)

- [x] Playwright-Version im `package.json` exakt auf `1.56.1` gesetzt
- [x] Browser-Konfiguration mit festen Timeouts, einem Worker, reduzierter Bewegung sowie Trace/Screenshot nur bei Fehlschlag stabilisiert
- [x] Lokale isolierte Node-Tests **erneut tatsächlich ausgeführt:** 13 bestanden, 0 fehlgeschlagen (`node --test real-node.test.mjs`, 130,7 ms)
- [x] Lokale isolierte Chromium-Prüfungen **erneut tatsächlich ausgeführt:** 6 bestanden, darunter 320/375/768 px, Auswahl, Escape und Retry (`python browser-check.py`)
- [ ] **Verifiziertes `package-lock.json` fehlt.** `npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund` wurde lokal versucht und scheiterte mit `ENOTCACHED` für `@playwright/test`; GitHub-Checkout/Registry sind in dieser Laufzeit nicht über DNS erreichbar. **Kein Lockfile mit erfundenen Integritäts-Hashes erstellen.**
- [ ] Auf einem Rechner mit Registry-Zugang im vollständigen Feature-Checkout: `cd amazon-wishlist && npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, danach `npm ci --ignore-scripts --no-audit --no-fund`, `npx playwright install chromium` und `bash run-wishes-tests.sh --browser`. Das generierte Lockfile prüfen und committen.
- [ ] Die **echten** Branch-Dateien (`bulk-helpers.test.mjs`, `bulk-workflows.test.mjs`, `wishes-ui.spec.mjs`) in einem vollständigen Checkout mit Node und Playwright ausführen. Bis dahin keine Freigabe behaupten.

**Wichtige Abgrenzung:** Der erfolgreiche lokale Lauf verwendet weiterhin die isolierten Testdateien aus `/mnt/data/helferlein-test-run` und ist kein vollständiger Branch-Testlauf. Der Lockfile-Schritt ist technisch blockiert, nicht erledigt.

## Erneute Verfügbarkeits- und Branch-Prüfung (2026-11-10)

- [x] Echte Dateien des Feature-Branches über die GitHub-Verbindung abgerufen: `bulk-helpers.mjs`, `list-features.mjs`, beide Node-Testdateien und `wishes-ui.spec.mjs`
- [x] Alle **27 originalen Branch-Logiktestfälle** in einem isolierten JavaScript-Runner ausgeführt: **27 bestanden, 0 fehlgeschlagen**. Dies ist ausdrücklich **kein** Node-`--test`-Lauf.
- [x] Lokale Laufzeit erneut geprüft: Node `v22.16.0`, npm `10.9.2`
- [x] Lokalen GitHub-Checkout versucht: `git ls-remote` scheitert weiterhin mit `Could not resolve host: github.com`
- [x] Lokale npm-Abhängigkeit geprüft: `@playwright/test` ist nicht installiert; Python-Playwright ist vorhanden, ersetzt aber das Node-Testpaket nicht
- [x] Lockfile-Generierung erneut versucht: `npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund` scheitert mit `ENOTCACHED` für `@playwright/test`. **Kein Lockfile erstellt.**
- [ ] Originale Branch-Dateien mit `node --test` im vollständigen Checkout ausführen
- [ ] Alle neun Browserfälle mit dem exakt gepinnten Playwright-Paket und Chromium ausführen
- [ ] Verifiziertes `package-lock.json` nach erfolgreicher npm-Auflösung erstellen, prüfen und committen

**Ergebnis:** Keine neu nachgewiesenen Funktionsfehler in den 27 isoliert ausgeführten Logiktests. Die vollständige Node-/Browser-Freigabe bleibt ausstehend; fehlende Netzwerk- und Paketverfügbarkeit sind die konkreten Blocker. Es wurden keine produktiven Datenbankänderungen, Merges oder Deployments durchgeführt.

## Wiederholter Ausführungs- und Abhängigkeitscheck (2026-11-10)

- [x] Tatsächlicher isolierter Node-Testlauf mit `node --test real-node.test.mjs`: **13 bestanden, 0 fehlgeschlagen, 126,7645 ms**
- [x] Tatsächlicher isolierter Chromium-Testlauf mit `python browser-check.py`: **6 bestanden** (320/375/768 px, Auswahl und Zurücksetzen, Escape, Tastatur-Retry)
- [x] Lokale Versionen geprüft: Node `v22.16.0`, npm `10.9.2`
- [x] GitHub-Checkout erneut versucht: `git ls-remote https://github.com/duhrrom11/Helferlein.git HEAD` → `Could not resolve host: github.com`
- [x] npm-Registry erneut geprüft: `npm view @playwright/test@1.56.1 dist.integrity --fetch-retries=0 --fetch-timeout=8000` → `EAI_AGAIN registry.npmjs.org`
- [ ] Vollständige Node-Branch-Suite ausführen; lokaler Checkout ist nicht verfügbar
- [ ] Neun originale Branch-Playwright-Tests ausführen; Node-Paket `@playwright/test` ist nicht installiert
- [ ] Verifiziertes `package-lock.json` erzeugen; keine geprüften Registry-Metadaten/Integritäts-Hashes verfügbar

**Freigabeentscheidung:** Weiterhin **nicht freigegeben**. Kein nachgewiesener Fehler in den erneut ausgeführten isolierten Tests, deshalb keine unbegründete Produktivcodeänderung. Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Infrastruktur-Retry und konkrete Testkorrekturen (2026-11-10)

- [x] `git ls-remote https://github.com/duhrrom11/Helferlein.git HEAD` erneut in der lokalen Laufzeit ausgeführt: **fehlgeschlagen**, `Could not resolve host: github.com`
- [x] `npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund` erneut ausgeführt: **fehlgeschlagen**, `ENOTCACHED` für `@playwright/test`; **kein verifiziertes Lockfile erstellt**
- [x] Originale Branch-UI-Testdatei untersucht: Die Fixture-Montage hob bisher nur einzelne `hidden`-Attribute auf, nicht versteckte Vorfahren; dies kann zu falschen Unsichtbarkeits-Fehlern führen. Fixture-Montage korrigiert und fehlende Fixture-Elemente explizit als Fehler markiert.
- [x] Mobile Browserassertion erweitert: Prüft neben horizontalem Überlauf auch Buttons ohne sichtbare Größe.
- [x] Retry-Assertion auf die eindeutige Status-Element-ID statt eine möglicherweise mehrdeutige `role=status`-Suche umgestellt.
- [ ] Vollständige Branch-Node-Suite mit `node --test` ausführen; GitHub-Checkout weiterhin nicht verfügbar
- [ ] Alle neun originalen Playwright-Fälle ausführen; npm-Paket und vollständiger lokaler Branch weiterhin nicht verfügbar
- [ ] Echtes npm-Lockfile erst nach erfolgreicher Registry-Auflösung erzeugen und verifizieren

**Bewertung:** Konkrete Testrobustheitsprobleme behoben, aber die aktualisierten Browserfälle konnten in dieser Runde nicht ausgeführt werden. Keine Behauptung eines erfolgreichen vollständigen Browser-/Node-Branch-Laufs. Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Ladezustand und Testinfrastruktur – erneute Prüfung (2026-11-10)

- [x] Lokale Laufzeit erneut geprüft: Node `v22.16.0`, npm `10.9.2`, Chromium `/usr/bin/chromium`, Python-Playwright vorhanden
- [x] `git ls-remote https://github.com/duhrrom11/Helferlein.git HEAD` tatsächlich ausgeführt: **fehlgeschlagen**, DNS `Could not resolve host: github.com`
- [x] `npm view @playwright/test@1.56.1 version --fetch-retries=0 --fetch-timeout=4000` tatsächlich ausgeführt: **fehlgeschlagen**, `EAI_AGAIN registry.npmjs.org`
- [x] Konkreten Dashboard-Fehler behoben: `load()` deaktiviert Bulk-Steuerung sofort, wenn Mitgliedschaftsdaten nicht mehr aktuell sind
- [x] Konkreten Dashboard-Fehler behoben: Promise-Rejection beim initialen parallelen Listen-/Wünsche-Laden setzt nun einen sichtbaren Fehlerstatus; veraltete Generationen ändern den Status nicht
- [x] Aktualisierte `lists-dashboard.mjs` in isolierter JavaScript-Syntaxprüfung erfolgreich geprüft
- [ ] Verifiziertes npm-`package-lock.json` erstellen; Registry nicht erreichbar, daher keine geprüften Integritätsdaten
- [ ] Vollständige Node-Branch-Suite ausführen; vollständiger Checkout weiterhin nicht lokal verfügbar
- [ ] Alle neun Playwright-Branch-Tests mit `@playwright/test` ausführen; Paket fehlt und Registry nicht erreichbar
- [ ] Neue Fehlerbehebungen in einem vollständigen isolierten Dashboard-Integrationstest gegen einen Mock-Client bestätigen

**Freigabe:** Weiterhin **gesperrt**. In dieser Runde wurde **kein vollständiger Node- oder Playwright-Branch-Testlauf** behauptet. Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Isolierte Regressionen für Dashboard-Reloads (2026-11-10)

- [x] Reine Guards `bulkControlsEnabled` und `currentDashboardLoad` in `bulk-helpers.mjs` extrahiert und in `lists-dashboard.mjs` eingebunden
- [x] Regressionstest: Bulk-Aktionen bei fehlendem Mitgliedschaftssnapshot oder laufender Aktion gesperrt
- [x] Regressionstest: Fehler einer veralteten Generation oder eines anderen Benutzerkontos dürfen keinen aktuellen Ladefehler veröffentlichen
- [x] Regressionstest: Ablehnung des aktuellen initialen Ladevorgangs veröffentlicht einen Fehler; Ablehnung eines veralteten Ladevorgangs nicht
- [x] **30/30 aktuelle Branch-Logiktests** in isoliertem JavaScript-Runner tatsächlich ausgeführt und bestanden; keine Node-`--test`-Behauptung
- [x] Lokalen GitHub-Checkout erneut versucht; `git ls-remote` weiterhin durch DNS (`Could not resolve host: github.com`) blockiert
- [ ] Vollständige Branch-Node-Tests mit `node --test` ausführen
- [ ] Neun Playwright-Browserfälle mit installiertem `@playwright/test` ausführen
- [ ] Verifiziertes npm-Lockfile nach verfügbarer Registry erzeugen und prüfen

**Freigabestatus:** Nicht freigegeben. Die drei neuen Tests prüfen isolierte Guards und simulierte Fehlerbehandlung; die Integration der Guards in der echten Dashboard-Oberfläche muss zusätzlich im Browser getestet werden. Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.
