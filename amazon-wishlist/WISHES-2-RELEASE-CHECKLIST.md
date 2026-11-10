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

## Mock-Supabase-Dashboard-Integration (2026-11-10)

- [x] Initialen parallelen Dashboard-Datenabruf als injizierbare Funktion `fetchDashboardBase(db,userId)` aus `lists-dashboard.mjs` nach `bulk-helpers.mjs` extrahiert; unveränderte Leseabfragen
- [x] Mock-Supabase-Client mit verkettbaren `from/select/eq/order/range`-Methoden und Promise-kompatibler Query erstellt
- [x] Integrationstest: Listen/Wünsche werden für den richtigen `user_id` gelesen, korrekte Pagination und **null Schreibvorgänge**
- [x] Integrationstest: abgewiesener Mock-Read propagiert Fehler, Bulk-Steuerung bleibt gesperrt
- [x] Integrationstest: verzögerter Read nach Kontowechsel darf keinen veralteten Snapshot veröffentlichen
- [x] Integrationstest: während Reload und bis zur expliziten Freigabe der Mitgliedschaft bleiben Bulk-Steuerungen gesperrt
- [x] **34/34 aktuelle Branch-Testfälle** tatsächlich in einem isolierten JavaScript-Runner bestanden (30 bestehende + 4 neue)
- [ ] Vollständigen `node --test`-Lauf auf lokalem Branch-Checkout durchführen; GitHub-DNS weiterhin blockiert
- [ ] Alle neun Playwright-UI-Tests ausführen; Node-`@playwright/test` und vollständiger Checkout weiterhin nicht verfügbar
- [ ] Echtes npm-Lockfile nach Registry-Zugriff mit überprüfbaren Integrity-Hashes erzeugen

**Abgrenzung:** Dies ist ein echter Integrationstest des injizierten Dashboard-Leseadapters mit Mock-Supabase-Client, **kein** DOM-/Browser-End-to-End-Test von `mountListsDashboard`. Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Paginierte Mitgliedschaften, Teilfehler und Retry (2026-11-10)

- [x] Paginierte, rein lesende Mitgliedschaftsabfrage als `fetchDashboardMembership(db,userId,{pageSize,isCurrent})` extrahiert und in das Dashboard eingebunden
- [x] Mock-Supabase-Integrationstest: zwei Seiten mit korrekten `range`-Grenzen, `user_id`-Filter und **null Schreibvorgängen**
- [x] Integrationstest: Fehlerobjekt auf Seite zwei bricht ab, ohne unvollständige Mitgliedschaftsdaten zu veröffentlichen
- [x] Integrationstest: Promise-Rejection auf Seite zwei; danach erfolgreicher **expliziter** Retry mit vollständigen Seiten
- [x] Integrationstest: Kontowechsel/ungültiger Ladevorgang stoppt Pagination und liefert `null` statt veralteter Daten
- [x] **38/38 aktuelle Branch-Testfälle** im isolierten JavaScript-Runner tatsächlich ausgeführt und bestanden (34 bestehende + 4 neue)
- [ ] Vollständiger nativer Node-`--test`-Lauf auf Branch-Checkout
- [ ] Neun Playwright-Browserfälle mit installiertem `@playwright/test`
- [ ] Verifiziertes `package-lock.json` nach erfolgreichem npm-Registry-Zugriff

**Abgrenzung:** Getestet wurde der produktiv verwendete, injizierte Leseadapter mit einem Mock-Supabase-Client; nicht die vollständige Dashboard-DOM-Integration. Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste. Freigabe weiterhin gesperrt.

## Konsistenz bei überlappenden Reloads und Kontowechseln (2026-11-10)

- [x] Konkrete Dashboard-Schwachstelle behoben: `retryItemsLoad` überschreibt nach fehlgeschlagenem alten Reload nicht mehr den durch `load` verwalteten Fehlerstatus
- [x] Konkrete Dashboard-Schwachstelle behoben: Vor dem Commit der vollständig paginierten Mitgliedschaftsdaten wird die aktuelle Benutzer-/Generationskennung erneut geprüft
- [x] Regressionstest: älterer verzögerter Reload kann neueren Mitgliedschaftsstand nicht überschreiben
- [x] Regressionstest: Kontowechsel nach dem letzten Mitgliedschaftsabruf verhindert Veröffentlichung eines veralteten Snapshots
- [x] Regressionstest: Teilfehler und anschließender expliziter Retry geben Bulk-Aktionen erst nach vollständiger erfolgreicher Mitgliedschaft frei
- [x] **41/41 aktuelle Branch-Logiktests** im isolierten JavaScript-Runner tatsächlich ausgeführt, 0 Fehler
- [ ] Vollständige native Node-`--test`-Suite im Feature-Checkout ausführen
- [ ] Neun Playwright-Browsertests mit installierten npm-Abhängigkeiten ausführen
- [ ] Verifiziertes npm-Lockfile mit echten Registry-Integritätsdaten erstellen

**Grenzen:** Die Tests verwenden Mock-Clients und einen isolierten JavaScript-Runner, keinen vollständigen DOM-/Browser-Test des Dashboards. Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste. Freigabe weiterhin gesperrt.

## Vollständige Zustandsbereinigung und Listenwechsel (2026-11-10)

- [x] Nachgewiesene Schwachstelle behoben: Ein Reload ließ zuvor alte Mitgliedschafts-/Auswahlzustände und Wunschkarten bestehen, obwohl `membershipReady=false` war. `invalidateMembershipState()` bereinigt nun Zuordnungen, Zähler, Auswahl, Bulk-Ergebnis/-Bestätigung und Wunschkarten bereits beim Start
- [x] Bei Listenwechsel während laufender Mitgliedschaftsabfrage werden alte Wunschkarten und die alte `assignedIds`-Auswahl zurückgesetzt
- [x] Reine Funktion `membershipForSelectedList` gibt nur bei abgeschlossenem Mitgliedschaftssnapshot Listenzuordnungen zurück
- [x] Drei neue Regressionstests: Listenwechsel während Reload, fehlgeschlagene zweite Mitgliedschaftsseite und erfolgreiche Aktualisierung für eine andere Liste
- [x] **44/44 Branch-Logiktests** im isolierten JavaScript-Runner tatsächlich ausgeführt, 0 Fehler
- [ ] Vollständige native Node-`--test`-Suite auf lokalem Feature-Checkout
- [ ] Neun Playwright-Browserfälle und echte DOM-Interaktion mit Mock-Supabase
- [ ] Verifiziertes npm-`package-lock.json` aus erreichbarer Registry

**Abgrenzung:** Die drei neuen Tests prüfen die tatsächlich verwendete reine Listenzuordnungslogik mit simulierten Mitgliedschaftsantworten. Die vollständige Dashboard-DOM-Zustandsbereinigung wurde durch Quellcodeprüfung und JavaScript-Syntaxprüfung, aber noch nicht durch Browser-End-to-End-Tests verifiziert. Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste. Freigabe weiterhin gesperrt.

## DOM-Reload-Regression und isolierter Chromium-Lauf (2026-11-10)

- [x] Nachgewiesenen Fehler behoben: Ein bereits vorhandener Wunschkarten-Checkbox-Handler prüfte bei `onchange` nur `bulkBusy`, nicht `membershipReady`. Jetzt ignoriert er Auswahlereignisse während eines Reloads.
- [x] Isolierten Playwright-DOM-Vertragstest in `wishes-ui.spec.mjs` ergänzt: veraltete Wunschkarten/Selektion/Ergebnis/Bestätigung zurücksetzen, Bulk-Aktionen sperren, Fehlermeldung anzeigen, keine Mock-Schreibvorgänge
- [x] **8/8 DOM-Prüfungen tatsächlich mit lokalem Python-Playwright und Chromium ausgeführt**: Karten entfernt, Auswahl geleert, Ergebnis verborgen, Dialog geschlossen, Hinzufügen/Entfernen deaktiviert, Fehler sichtbar, null Schreibvorgänge
- [ ] Den neuen Playwright-Branch-Test mit Node-`@playwright/test` tatsächlich ausführen
- [ ] Echten Dashboard-DOM-Integrationstest mit geladenem `mountListsDashboard` und Mock-Supabase-Client durchführen (der ausgeführte Test simuliert die Zustandsbereinigung, nicht die vollständige App)
- [ ] Vollständige native Node-Suite und verifiziertes npm-Lockfile nach Wiederherstellung der Infrastruktur

**Freigabe weiterhin gesperrt.** Kein produktiver Supabase-Zugriff, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Echter Dashboard-Browser-Integrationstest mit Mock-Supabase (2026-11-10)

- [x] Neue Playwright-Spezifikation `dashboard-browser.integration.spec.mjs` im Feature-Branch angelegt. Sie lädt das echte `index.html` und die echten ES-Module `lists-dashboard.mjs`, `bulk-helpers.mjs`, `list-features.mjs` über lokal abgefangene Browser-Requests.
- [x] Der Test ruft **`mountListsDashboard` tatsächlich im Browser-Testcode** auf und injiziert einen rein lesenden Supabase-Query-Mock mit kontrollierten Listen, Wünschen und Mitgliedschaften. Jeder Schreibaufruf ist verboten und wird gezählt.
- [x] Drei Szenarien als ausführbare Tests implementiert: fehlgeschlagener Mitgliedschafts-Reload nach Bulk-Auswahl; Wechsel von Liste A zu Liste B; angehaltener Mitgliedschafts-Reload mit gesperrter Bulk-Auswahl bis zur Freigabe.
- [ ] **Diese drei neuen Playwright-Tests wurden noch nicht ausgeführt.** Das lokale Container-Checkout enthält den Feature-Branch nicht; GitHub-DNS ist nicht erreichbar, und Node-`@playwright/test` ist nicht installiert. Ein erfolgreicher Browserlauf darf nicht behauptet werden.
- [ ] Browserlauf auf Feature-Branch-Checkout nach `npm ci` ausführen; eventuelle Fixture- und DOM-Selektorprobleme anhand tatsächlicher Fehlermeldungen beheben.
- [ ] Vollständige native Node-Suite und verifiziertes npm-Lockfile nach Wiederherstellung der Infrastruktur.

**Grenzen:** Kein produktiver Supabase-Zugriff, kein Merge, kein Deployment, keine kostenpflichtigen Dienste. Freigabe weiterhin gesperrt.

## Autopilot-Großschritt: Browser-Testinfrastruktur stabilisiert (2026-11-10)

- [x] Auf Nutzerwunsch **Vercel-Plugin in ChatGPT deinstalliert** (Bestätigung `uninstalled`). Vercel künftig nicht für Helferlein verwenden. Eventuelle externe GitHub/Vercel-Installationen sind davon nicht automatisch entfernt.
- [x] Browser-Fixture-Fehler behoben: zuvor doppelt maskierte RegExp-Sequenzen verhinderten das zuverlässige Entfernen von `<script>` und `<link>`; jetzt korrekte reguläre Ausdrücke.
- [x] Listenwechsel-Test auf tatsächlich vorhandene `Öffnen`-Schaltfläche in `.list-card` umgestellt.
- [x] `playwright.config.mjs` umfasst jetzt `wishes-ui.spec.mjs` und `dashboard-browser.integration.spec.mjs` statt nur der ersten Suite.
- [x] Echte Dashboard-Browser-Suite von drei auf **fünf** Szenarien erweitert: Reload-Fehler, Listenwechsel, angehaltener Reload, Retry nach Mitgliedschaftsfehler, Kontowechsel während verzögerter Abfrage.
- [x] **44/44 isolierte Branch-Logiktests** erneut tatsächlich ausgeführt und bestanden; Browser-Suite auf fünf Testfälle und Konfiguration/Fixture-RegExp statisch geprüft.
- [ ] **Fünf neue Dashboard-Playwright-Browserfälle tatsächlich ausführen**; weiterhin kein vollständiger lokaler Feature-Branch-Checkout mit installiertem `@playwright/test`. Keine unbestätigten Browser-Erfolge melden.
- [ ] Vollständige native Node-Test-Suite und verifiziertes Lockfile.

**Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste. Freigabe weiterhin gesperrt.**

## CodeQL-Sicherheitsbefunde und Browser-Isolation (2026-11-10)

- [x] CodeQL 94/95 in `dashboard-browser.integration.spec.mjs` und dieselbe Ursache in `wishes-ui.spec.mjs` behoben: Regex-basierte Script-/Link-Entfernung vollständig entfernt.
- [x] Gemeinsame `isolated-browser-fixture.mjs` mit restriktiver Content Security Policy, verweigerten Netzwerkzugriffen und expliziter ES-Modul-Allowlist eingerichtet; keine produktiven Supabase-Anfragen.
- [x] Browser-Sicherheitstests für ungewöhnliche Script-End-Tags, gemischte Groß-/Kleinschreibung, Eventhandler, `javascript:`-Links und unerlaubte externe Skripte hinzugefügt.
- [x] **Zwei CSP-Ausführungsvarianten tatsächlich mit lokalem Chromium geprüft** (CSP über äquivalentes Meta-Tag in `page.set_content`, jeweils vier blockierte Skript-/Event-Vektoren). Beide bestanden.
- [ ] Die neuen GitHub-Branch-Playwright-Spezifikationen selbst sind noch **nicht** erfolgreich gelaufen: Lokale Browsernavigation zu synthetischen Hosts wird durch `ERR_BLOCKED_BY_ADMINISTRATOR` blockiert. Der lokale CSP-Meta-Test ist **kein** Ersatz für den CSP-HTTP-Header-Integrationstest.
- [ ] CodeQL-Reanalyse abwarten; die Warnungen sind erst nach erfolgreicher Analyse als geschlossen zu betrachten.
- [ ] Vollständige Playwright-/Node-Suite auf geeignetem Checkout ausführen; Lockfile verifizieren.

**Freigabe gesperrt.** Keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste; Vercel bleibt getrennt.

## Produktfunktionen statt Testausbau – großer Autopilot-Schritt (2026-11-10)

Auf Nutzerwunsch künftig **primär sichtbare Funktionen, Bedienbarkeit und reale Fehlerkorrekturen** umsetzen; nur unumgängliche Sicherheits-/Datenintegritätsprüfungen. Keine zusätzlichen umfangreichen Test-Suites ohne konkreten Anlass.

- [x] Sammelauswahl „sichtbare Wünsche“ auf tatsächlich angezeigte Wunschkarten (`visibleLimit`) begrenzt, statt alle gefilterten, aber noch nicht angezeigten Treffer auszuwählen.
- [x] Kategorie-Sammelauswahl auf angezeigte Treffer begrenzt und Rückmeldung präzisiert.
- [x] Beim Listenwechsel sichtbare Kartenanzahl auf 100 zurückgesetzt.
- [x] Archivierte Listen sperren Sammelaktionen, Checkboxen und auch veraltete Auswahlereignisse.
- [x] Fortschrittsanzeige bei maximal 100 % begrenzt.
- [x] Minimalprüfung: Dashboard-JavaScript syntaktisch kompiliert; fünf konkrete Quellcodebedingungen geprüft. **Keine Browser- oder Integrationstests in diesem Schritt ausgeführt.**
- [ ] Endgültige Produktfreigabe weiterhin offen; keine Produktionsfreigabe ohne nötige Endabnahme.

**Grenzen:** Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Produktentwicklung: Verschieben und Alltagserleichterungen (2026-11-10)

- [x] Einzelne bereits zugeordnete Wünsche direkt von ihrer Wunschkarte in eine andere aktive Liste verschieben: Zielliste auswählen, bestätigen, danach Zielliste öffnen.
- [x] Verschieben erhält den Wunsch selbst; zunächst wird die Zielzuordnung angelegt, anschließend die Quellzuordnung entfernt. Bei Fehler im zweiten Schritt bleibt die neue Zielzuordnung erhalten und eine Warnung erklärt den teilweise abgeschlossenen Vorgang. **Nicht atomar**; bei Kontowechsel oder konkurrierendem Reload nach der ersten Änderung ist manuelle Prüfung nötig.
- [x] Direkte Schaltfläche „Zugeordnete Wünsche“ in der Listenübersicht für nicht archivierte Listen mit Zuordnungen.
- [x] Bei leeren Suchergebnissen Wunschfilter per Schaltfläche zurücksetzen.
- [x] Archivieren erfordert eine Bestätigung; Reaktivieren bleibt direkt möglich.
- [x] Minimale technische Prüfung: Dashboard-ES-Modul nach Entfernen der Import-/Export-Zeilen mit JavaScript-Parser erfolgreich geprüft.
- [ ] Produktseitige Abnahme der Verschiebefunktion mit realistischen Berechtigungen und Fehlerfällen vor Freigabe nötig; **kein** produktiver Datenbanktest durchgeführt.

Keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment, keine kostenpflichtigen Dienste. Freigabe weiterhin gesperrt.

## Produktfunktionen: Mehrfachverschieben, Listenorganisation und Mobilbedienung (2026-11-10)

- [x] Mehrfachverschieben: Zielauswahl und „Ausgewählte verschieben“ in der Sammelwerkzeugleiste; nur bereits zur aktuellen aktiven Liste zugeordnete Wünsche werden berücksichtigt.
- [x] Bestätigung vor Änderungen, sequenzielle Zielzuordnung vor Quellentfernung, Fortschrittsanzeige und Stoppen nach laufendem Wunsch. Bereits in der Zielliste vorhandene Wünsche werden dort nicht doppelt eingefügt.
- [x] Teilfehler werden in der Statusmeldung kenntlich gemacht; Wunschdatensätze selbst werden nicht gelöscht. **Wichtig: keine atomare Transaktion**; bei Quell-Löschfehler oder unterbrochenem Kontext können Zuordnungen in beiden Listen bestehen bleiben.
- [x] Mobilansicht: breite Bedienelemente für Einzel- und Mehrfachverschieben, bessere Zeilenumbrüche und Touch-Ziele für Listenaktionen.
- [x] Listen nach Anzahl zugeordneter Wünsche auf- oder absteigend sortieren.
- [x] Minimalprüfung: JavaScript-Syntax bei beiden Dashboard-Änderungen erfolgreich geprüft; keine umfassenden Tests oder produktiven Datenbankzugriffe.
- [ ] Vor Freigabe: realen Ablauf von Mehrfachverschieben einschließlich Teilfehler und Kontowechsel manuell abnehmen; bei Bedarf serverseitig atomare Operation in einem gesondert freizugebenden Datenbankschritt entwickeln.

**Keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment, keine kostenpflichtigen Dienste. Freigabe weiterhin gesperrt.**

## Produktentwicklung: Wunschdetails, Schnellaktionen und Mobilansicht (2026-11-10)

- [x] Wunschdetails zeigen alle zugeordneten Listen als anklickbare Direktzugriffe; beim Öffnen einer Liste wird der Wunsch über die Titelsuche hervorgehoben/gefiltert.
- [x] Aus Wunschdetails direkt zur zugeordneten Liste springen und Wünsche für Sammelaktionen auswählen bzw. abwählen.
- [x] Listenfilter per eigener Schaltfläche vollständig zurücksetzen (Suchbegriff, Listenansicht, Sortierung).
- [x] Detaildialog mobil optimiert: begrenzte Viewportgröße, scrollbar, breitere Touch-Schaltflächen.
- [x] Funktionsfehler behoben: Einzelzuordnung über Checkbox auf archivierten Listen jetzt sowohl im deaktivierten Zustand als auch im Eventhandler blockiert.
- [x] Unumgängliche Minimalprüfung: aktualisiertes Dashboard-JavaScript syntaktisch geprüft.
- [ ] Browser-/Nutzerabnahme der neuen Schnellaktionen und Detailansicht vor Freigabe offen. Die Suche nach Titel kann bei identischen Titeln mehrere Treffer zeigen.
- [ ] Weiterhin kein vollständiger Produktions-Freigabenachweis.

**Keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: Übersicht, Schnellfilter und direkte Wunscherfassung (2026-11-10)

- [x] Kontext der geöffneten Liste über den Wunschkarten: Listenname, Zuordnungsanzahl und Archivstatus.
- [x] Ein-Klick-Schnellfilter: alle Wünsche, dieser Liste zugeordnete Wünsche, global nicht zugeordnete Wünsche und Favoriten; aktive Filter über `aria-pressed` erkennbar.
- [x] Direkte Rücknavigation zur Listenübersicht ohne langes Scrollen.
- [x] „Wunsch zu dieser Liste“ öffnet die bestehende Wunscherfassung und wählt die aktuelle aktive Liste vor; bei archivierten Listen oder noch nicht geladenen Zuordnungen deaktiviert.
- [x] Mobile Schnellfilter in zweispaltiger Anordnung, größere Touchflächen und responsive Kontextaktionen.
- [x] Minimalprüfung: geänderte Dashboard-JavaScript-Dateien syntaktisch geprüft; keine umfangreichen neuen Tests.
- [ ] Browserabnahme der neuen Navigations- und Filteraktionen vor Freigabe.
- [ ] Produktfreigabe weiterhin gesperrt.

Keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Produktentwicklung: übersichtliche Wunschkarten und zuverlässige Navigation (2026-11-10)

- [x] Beim Wechsel der geöffneten Liste alte Such-/Prioritäts-/Kategorie-/Markierungs-/Zuordnungsfilter und Sortierung zurücksetzen; so werden Wünsche nicht durch Filter einer vorherigen Liste scheinbar versteckt.
- [x] Wunschkarten besitzen eine stabile `data-wish-id`-Kennung. Der Sprung aus der Wunschdetailansicht fokussiert und scrollt zur **konkreten** Wunschkarte, nicht nur zu einem möglicherweise mehrfach vorkommenden Titel.
- [x] Lange Wunsch-Notizen standardmäßig auf drei Zeilen begrenzen, mit zugänglicher Schaltfläche zum vollständigen Anzeigen und Einklappen.
- [x] Mobile Wunschkarten: bessere Wortumbrüche, große Touchflächen für Notizen und Markierungen; sichtbarer Tastaturfokus beim Sprung.
- [x] Unumgängliche Minimalprüfung: Dashboard-JavaScript syntaktisch kompiliert; sieben referenzierte HTML-IDs vorhanden; die zentralen Implementierungsanker statisch geprüft.
- [ ] Endabnahme im echten Browser weiterhin offen; kein produktiver Datenbankzugriff.
- [ ] Freigabe weiterhin gesperrt.

**Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: Listenorganisation, Mobilbedienung, Sammelaktion (2026-11-10)

- [x] Listenübersicht um „Zuletzt geöffnet“ erweitert; zuletzt geöffnete Listen erscheinen zuerst, nicht besuchte dahinter.
- [x] Bei leerem Such-/Filterergebnis direkte Wiederherstellung der Listenansicht; Listen-Karten mit aussagekräftiger Zugänglichkeitsbeschriftung.
- [x] Aktive Listenkarte visuell deutlicher; mobile Listenaktionen als zweispaltiges Raster mit großen Touchflächen.
- [x] Mehrfachverschieben nur aktiv, wenn tatsächlich mindestens ein ausgewählter Wunsch der aktuellen Liste zugeordnet ist. Nicht zugeordnete ausgewählte Wünsche werden übersprungen und in der Ergebniszusammenfassung genannt.
- [x] Wunschdetail-Zuordnungen nur anzeigen, wenn die Mitgliedschaftsdaten vollständig geladen sind.
- [x] Minimalprüfung: Dashboard-JavaScript-Syntax und vier konkrete Implementierungsbedingungen erfolgreich geprüft; keine neuen Test-Suites.
- [ ] Browserabnahme der Listenansicht und Sammelaktionen bleibt vor Produktfreigabe offen.
- [ ] Mehrfachverschieben ist weiterhin nicht atomar; bei Teilfehlern müssen doppelte Zuordnungen überprüft werden.
- [ ] Freigabe weiterhin gesperrt.

**Keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: Kompaktansicht und sichere Sammelaktion (2026-11-10)

- [x] Wunschkarten können zwischen Standard- und Kompaktansicht umgeschaltet werden; bestehende Filter und Auswahl bleiben erhalten.
- [x] Kompaktansicht zeigt Wünsche platzsparend; auf kleinen Bildschirmen einspaltige Bedienung mit großen Schaltflächen.
- [x] Mehrfachverschieben weist schon vor der Bestätigung auf ausgewählte, aber nicht zur Ausgangsliste zugeordnete Wünsche hin.
- [x] Nach Kontowechsel verhindert der Abschluss einer alten Mehrfachverschiebung die nachträgliche Aktualisierung der neuen Kontooberfläche.
- [x] Unumgängliche Minimalprüfung: Dashboard-JavaScript syntaktisch geprüft, neue Ansichtsschalter und Zustandslogik statisch geprüft.
- [ ] Browserabnahme der Kompaktansicht und Mehrfachverschiebung vor Freigabe.
- [ ] Mehrfachverschieben bleibt nicht atomar; bei Teilfehlern doppelte Zuordnungen prüfen.
- [ ] Freigabe weiterhin gesperrt.

**Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: Direktwechsel und Wunschkarten-Schnellaktionen (2026-11-10)

- [x] Direkter Listenwechsel oberhalb der Wunschkarten, inklusive Kennzeichnung archivierter Listen und Sperre während Sammelaktionen.
- [x] Beim Öffnen einer Liste standardmäßig die tatsächlich zugeordneten Wünsche anzeigen; globaler Blick bleibt über Schnellfilter „Alle“ erreichbar.
- [x] Wunschkarten zeigen die Anzahl der Listen, denen der Wunsch zugeordnet ist.
- [x] Schnellaktion „Titel kopieren“ mit verständlicher Fehlermeldung, wenn Zwischenablage nicht verfügbar oder nicht erlaubt ist.
- [x] Mobile Bedienelemente: responsiver Listenwechsel und größere Wunschkarten-Aktionsflächen.
- [x] Unumgängliche Minimalprüfung: JavaScript-Syntax und zentrale HTML-/Funktionsanker statisch geprüft.
- [ ] Browserabnahme der neuen Listenwechsel- und Kopierfunktion weiterhin offen.
- [ ] Produktfreigabe weiterhin gesperrt.

**Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: Schnellaktionen und Listenwechsel (2026-11-10)

- [x] Oberhalb der Wunschkarten dauerhaft erreichbare Schaltfläche zum Zurücksetzen aller Wunschfilter auf die Ansicht der aktuellen Liste.
- [x] Sichtbare Wünsche (maximal aktuell geladene/angezeigte Karten) per Klick gesammelt auswählen oder abwählen; deaktiviert bei archivierter Liste, laufender Sammelaktion oder leerer Ansicht.
- [x] Direkter Listenwechsel sortiert Favoriten voran, zeigt Wunschanzahl und Archivstatus.
- [x] Listenwechsel während laufender Sammelaktionen gesperrt, damit keine Kontextänderung durch den neuen Auswahlbereich erfolgt.
- [x] Responsive Schnellaktionen für mobile Geräte.
- [x] Minimalprüfung: JavaScript-Syntax, Bedienelemente und neue Aktionsanker geprüft.
- [ ] Browserabnahme und Prüfung der Sammelauswahl in echten Sitzungen offen.
- [ ] Produktfreigabe weiterhin gesperrt.

**Keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: genaue Wunsch-Navigation und Auswahlansicht (2026-11-10)

- [x] Sprung aus Wunschdetails zur konkreten Wunsch-ID statt Titel-Suche; identische Wunschtitel führen nicht mehr zur falschen Karte.
- [x] Beim Sprung zu einem Wunsch, der hinter dem anfänglichen Anzeigelimit liegt, die angezeigte Ergebnismenge passend erweitern.
- [x] Sammelauswahl aus Wunschdetails nur für in der aktuellen aktiven Listenansicht sichtbare und zulässige Wünsche.
- [x] Umschaltbare Ansicht „Nur Auswahl“ für schnellere Kontrolle ausgewählter Wunschkarten, mit mobilem Layout.
- [x] Auswahlansicht beim Listenwechsel und Zurücksetzen des Dashboards deaktivieren.
- [x] Minimalprüfung: JavaScript-Syntax und Implementierungsanker für Navigation, Auswahl und Ansicht geprüft.
- [ ] Browserabnahme mit doppelten Wunschtiteln, mehr als 100 Wünschen und Sammelauswahl offen.
- [ ] Freigabe weiterhin gesperrt.

**Keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: Sammelauswahl und Schnellfilter (2026-11-10)

- [x] Neue dauerhaft erreichbare Aktion „Auswahl aufheben“ direkt über Wunschkarten; stellt nach dem Leeren die reguläre Ansicht wieder her.
- [x] Leere Ansicht „Nur Auswahl“ bietet einen passenden Weg zurück zu allen Wünschen.
- [x] Ungültige/stale Checkbox-Aktionen werden optisch zurückgesetzt statt einen falschen Auswahlzustand anzuzeigen.
- [x] Wunsch-Schnellfilter setzen widersprüchliche Such-, Prioritäts- und Kategoriebedingungen zurück; verlassen außerdem die Auswahlansicht.
- [x] „Wunschfilter zurücksetzen“ verlässt ebenfalls die Auswahlansicht; „Nur Auswahl“ wird ohne ausgewählte Wünsche deaktiviert.
- [x] Mobile Schnellaktionen responsiv angeordnet.
- [x] Unumgängliche Minimalprüfung: JavaScript-Syntax und relevante UI-/Funktionsanker erfolgreich.
- [ ] Browserabnahme von Auswahlansicht, Schnellfiltern und Sammelaktionen offen.
- [ ] Produktfreigabe weiterhin gesperrt.

**Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: zugeordnete Wünsche gesammelt auswählen (2026-11-10)

- [x] Neue Schnellaktion „Zugeordnete auswählen“ markiert alle geladenen, tatsächlich der aktuellen Liste zugeordneten Wünsche für Sammelaktionen.
- [x] Neue Aktion ersetzt eine möglicherweise alte Auswahl vollständig und öffnet die Ansicht „Nur Auswahl“ zur Kontrolle.
- [x] Anzahl der zugeordneten Wünsche im Aktionslabel sichtbar.
- [x] Aktion bei archivierten Listen, fehlenden Zuordnungsdaten oder laufender Sammelaktion gesperrt.
- [x] Abgewählte Wunschkarten verschwinden in „Nur Auswahl“ sofort aus der Darstellung.
- [x] Responsive Bedienelemente mit größeren Touch-Zielen und Tastaturfokus.
- [x] Minimalprüfung: JavaScript-Syntax und Funktionsanker erfolgreich geprüft.
- [ ] Browserabnahme bei großen Listen und realen Sammelaktionen offen.
- [ ] Produktfreigabe weiterhin gesperrt.

**Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: Auswahl ohne Liste und Fehlerrückmeldung (2026-11-10)

- [x] Neue Schnellaktion „Ohne Liste auswählen“ für alle geladenen, global nicht zugeordneten Wünsche; bereitet Zuordnung zur geöffneten Liste per Sammelaktion vor.
- [x] Anzahl der Wünsche ohne Liste im Aktionslabel; deaktiviert, wenn keine geeigneten Wünsche vorhanden sind, Liste archiviert ist oder eine Sammelaktion läuft.
- [x] Auswahlaktionen für zugeordnete und nicht zugeordnete Wünsche setzen widersprüchliche Filter zurück und zeigen die Auswahl vollständig an.
- [x] Sammelverschiebung meldet ausdrücklich, wenn eine Zielzuordnung gespeichert wurde, die Quellzuordnung aber nicht entfernt werden konnte.
- [x] Fehlerrückmeldung bei veraltetem Benutzerkontext zusätzlich geschützt.
- [x] Mobile Touch-Ziele der Schnellaktionen verbessert.
- [x] Minimalprüfung: JavaScript-Syntax und zentrale Funktionsanker geprüft.
- [ ] Browserabnahme für „Ohne Liste auswählen“, Sammelzuordnung und Teilfehler beim Verschieben offen.
- [ ] Produktfreigabe weiterhin gesperrt.

**Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Produktentwicklung: schnellere Wunschkarten und sichere Navigation (2026-11-10)

- [x] Listenmitgliedschaften für Wunschkarten pro Renderdurchlauf vorab zählen, statt jede Liste für jede Karte erneut zu prüfen.
- [x] Beim vollständigen Abwählen sichtbarer Karten die Ansicht „Nur Auswahl“ automatisch verlassen (Schnellaktion und Sammel-Checkbox).
- [x] Neue mobil erreichbare Schnellaktion „Nur Listenwünsche zeigen“ stellt die Ansicht der zugeordneten Wünsche wieder her, ohne Sammelmarkierungen zu löschen.
- [x] Einzelverschiebung zeigt nach einem Kontowechsel oder Listenwechsel keine veraltete Erfolgsmeldung und springt nicht mehr unerwartet in eine andere Liste.
- [x] Minimalprüfung: JavaScript-Syntax und relevante Funktionsanker erfolgreich.
- [ ] Browserabnahme für große Wunschlisten, Auswahlansicht und Einzelverschiebung offen.
- [ ] Produktfreigabe weiterhin gesperrt.

**Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Weitere Produktverbesserungen: sichere Listenwechsel und Sammelaktionen (2026-11-10)

- [x] Bestehenden Feature-Branch und PR #166 verifiziert; Änderungen ausschließlich dort vorgenommen.
- [x] Listenoperationen Archivieren, Löschen und Duplizieren gegen laufende Sammelaktionen und veraltete Kontokontexte abgesichert; asynchrone Folgeschritte aktualisieren kein fremdes Konto.
- [x] Einzelverschieben zeigt nach erfolgreicher Zuordnung keine unerwartete Navigation in eine andere Liste mehr.
- [x] Sammelverschieben stoppt nach einem Stoppwunsch vor der Quellentfernung und meldet die dadurch mögliche doppelte Zuordnung; bestätigte Hinzufügen-/Entfernen-Aktionen prüfen vor dem Schreiben die aktuelle Zugehörigkeit erneut.
- [x] Wunschdetail-Sprung hebt widersprüchliche Filter und Auswahlansicht auf, sodass die gewünschte Karte auch bei zuvor aktiven Filtern erreichbar ist. Archivierte Ziele werden nicht als aktive Sprungoptionen angezeigt.
- [x] Wunschkarten erhalten eine direkte Aktion „Notiz & Kategorie“; leere Auswahlansicht erklärt den Zustand.
- [x] Filter-/Ansichtswechsel werden während Sammelaktionen eingeschränkt; neue Filter verlassen die alte Auswahlansicht. Bestätigungsdialoge weisen auf zweistufiges, nicht-atomares Verschieben hin.
- [ ] Nachweis eines erfolgreichen Syntaxchecks und Browser-/CI-Tests für diesen neuesten Head steht aus. Bestehende GitHub-Workflows können neue Commits automatisch prüfen; ihr Erfolg wird hier ausdrücklich nicht behauptet.
- [ ] Bei partiellen Verschiebevorgängen weiterhin beide Listen prüfen. Ohne freigegebene serverseitige Transaktion ist ein vollständiger atomarer Wechsel nicht möglich.
- [ ] RLS-Negativtests, echte Browserabnahme, rechtliche Pflichtangaben und Abuse-Schutz weiterhin offen. Keine Freigabe, kein Merge, kein Deployment.

**Keine Vercel-Nutzung, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.**

## Autopilot-Paket: Sammelaktionen konsistent abschließen (2026-11-10)

- [x] Kritischen Ablauf korrigiert: Der allgemeine Lade-Schutz gegen parallele Sammelaktionen verhinderte auch das notwendige interne Neuladen **nach** der Sammelaktion. Interne Abschluss-Ladevorgänge dürfen jetzt mit `load({afterBulk:true})` stattfinden; normale manuelle Aktualisierungen bleiben während der Aktion gesperrt.
- [x] Beide Abschlusswege (Hinzufügen/Entfernen und Mehrfachverschieben) nutzen den internen Neuladepfad, sodass die Mitgliedschaftsansicht nach Änderungen nicht absichtlich veraltet bleibt.
- [x] Späte Abschlussmeldungen und Ergebnisdarstellungen zusätzlich auf Benutzer-, Listen- und Laufkontext begrenzt.
- [x] Wird eine Liste archiviert, wechselt der Ladevorgang zur nächsten aktiven Liste statt die archivierte Liste als aktive Arbeitsliste zu behandeln.
- [x] Stopp beim Mehrfachverschieben greift vor dem nächsten Wunsch; der bereits begonnene zweistufige Verschiebevorgang wird nach erfolgreicher Zielzuordnung nicht mehr absichtlich zwischen Einfügen und Entfernen unterbrochen.
- [ ] Noch keine verifizierte lokale Node-/Browser-Abnahme für den neuen Branch-Stand; gezielte Regressionstests mit kontrollierten Mock-Daten und realem Browser vor Freigabe erforderlich.
- [ ] Zweistufiges Verschieben bleibt bei Netzwerkfehlern nicht atomar; doppelte Mitgliedschaften sind weiterhin möglich. Serverseitige Transaktion benötigt gesonderte Architektur-/Produktiv-DB-Freigabe.
- [ ] Freigabe bleibt gesperrt; kein Merge, kein Deployment, keine Vercel-Nutzung, keine produktiven Supabase-Eingriffe.

## Autopilot: Wunschkarten, sichere Listenbearbeitung und Kontextwechsel (2026-11-10)

- [x] Doppelte, funktionsgleiche Detailschaltflächen auf Wunschkarten zusammengeführt: ein direkter Zugang zu Details, Notiz und Kategorie.
- [x] Wunschdetail-Sprung überspringt archivierte Listen und zeigt einen verständlichen Hinweis, falls keine aktive Ziel-Liste vorhanden ist.
- [x] Veraltete Fehler- und Fortschrittsmeldungen bei Einzelzuordnung und Mehrfachverschiebung auf den gültigen Konto-/Listen-/Ladekontext begrenzt.
- [x] „Ohne Liste“, Filter-Zurücksetzen, Listenfilter, Kompaktansicht und Favoritenwechsel gegen parallele Sammelaktionen abgesichert; Auswahlansicht wird bei Filter-Reset verlassen.
- [x] Bearbeiten und Erstellen von Listen gegen parallele Sammelaktionen und verspätete Ergebnisse nach Kontowechsel abgesichert; archivierte Listen müssen vor Gestaltung reaktiviert werden.
- [x] Einzel- und Mehrfachverschieben prüfen nach dem Bestätigungsdialog erneut den aktuellen Bedienkontext.
- [ ] Gezielte Syntax-, Browser- und Regressionstests des aktuellen HEAD stehen weiterhin aus; Implementierungsänderungen sind committet, aber nicht als erfolgreich browsergetestet gekennzeichnet.
- [ ] Sammelverschieben bleibt ohne Datenbanktransaktion bei Netzwerkfehlern nicht atomar; die zwei Listen müssen bei Teilfehlern kontrolliert werden.
- [ ] Produktfreigabe bleibt gesperrt: keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: Einzelverschieben, archivierte Navigation und Sammelstatus (2026-11-10)

- [x] Fehler in der Erfolgsmeldung beim Einzelverschieben korrigiert: Ein regulärer interner Reload erhöht die Ladegeneration und hatte dadurch die bisherige `current()`-Prüfung für die Erfolgsmeldung ungültig gemacht.
- [x] Einzelverschieben validiert nach Bestätigung zusätzlich Konto, Ladegeneration, aktuelle Quellzuordnung und aktives Ziel.
- [x] Schnellwechsel und aktiver Arbeitsbereich zeigen nur aktive Listen; archivierte Listen bleiben in der allgemeinen Listenübersicht reaktivierbar.
- [x] Fortschrittsanzeige bei abgeschlossenen Hinzufügen-/Entfernen-Sammelaktionen wird wieder geschlossen.
- [x] Leerer Zustand für global noch nicht zugeordnete Wünsche erklärt nun, wenn bereits alle Wünsche mindestens einer Liste zugeordnet sind.
- [ ] Gezielte Browser-/Node-Regressionstests und RLS-Negativtests weiterhin vor Freigabe nötig; diese Änderungen wurden nicht als end-to-end getestet markiert.
- [ ] Mehrfachverschieben bleibt ohne serverseitige Transaktion bei Netzwerk- oder Kontextfehlern potenziell partiell. Kein automatischer Rollback.
- [ ] Freigabe nicht erteilt; kein Merge, Deployment, Vercel-Aufruf, produktiver Supabase-Eingriff oder kostenpflichtiger Dienst.

## Autopilot: vollständige Duplikate, Kontoisolation und mobile Ladezustände (2026-11-10)

- [x] Beim Wechsel des angemeldeten Kontos wird die bisher ausgewählte Liste vor der neuen Auswahl verworfen; die Liste des vorherigen Kontos wird nicht als aktiver Kontext übernommen.
- [x] Laufende Sammelaktionen prüfen zusätzlich die Lade-Generation und veröffentlichen keinen Fortschritt aus einem veralteten Reload-Kontext.
- [x] Listen-Duplikate verwenden die bereits vollständig paginiert geladene Zuordnungsübersicht statt eines unpaginierten Datenbankabrufs, der bei großen Listen nur einen Teil der Wünsche kopieren konnte.
- [x] Duplizierung schreibt Zuordnungen in Paketen zu maximal 100 und informiert bei Teilfehlern über die bereits kopierte Anzahl; die Originalwünsche bleiben erhalten.
- [x] Duplizierung bestätigt die Anzahl der zu kopierenden Zuordnungen und prüft vor Beginn und zwischen den Paketen den Benutzer-/Ladekontext.
- [x] Mobile/kompakte Listenansicht: „Mehr laden“ wird bei fehlender Liste, ausstehender Zuordnung oder Neuladen ausgeblendet; der Listen-Editor wird ohne aktive Listen deaktiviert.
- [ ] Browser- und Node-Syntax-/Regressionstests weiterhin vor Freigabe erforderlich. Die GitHub-Inhaltsprüfung ist keine Laufzeitprüfung.
- [ ] Nicht-atomare mehrstufige Operationen (Duplizieren/Verschieben) können bei Netzwerkfehlern Teilergebnisse hinterlassen; keine automatische Rückabwicklung.
- [ ] Freigabe bleibt gesperrt. Kein Vercel, kein Merge, kein Deployment, keine produktiven Supabase-Änderungen und keine kostenpflichtigen Dienste.

## Autopilot: Archivnavigation, Sammelaktionen und Teilergebnisse (2026-11-10)

- [x] Archivierte Listen werden in der Übersicht als reaktivierungsbedürftig gekennzeichnet; der Öffnen-Knopf führt nicht mehr in einen unbrauchbaren Arbeitsbereich.
- [x] Schnellnavigation, Favoritenfilter und Filter-Reset respektieren die Sperre während laufender Sammelaktionen; „Zugeordnete Wünsche“ beendet eine alte Nur-Auswahl-Ansicht.
- [x] Mehrfachverschieben prüft nach Bestätigung erneut alle Quellzuordnungen und das Vorhandensein der geladenen Wünsche.
- [x] Ein Kontextwechsel nach erfolgreicher Zielzuordnung beim Verschieben wird mit explizitem Hinweis auf eine möglicherweise doppelte Zuordnung gemeldet (nur im weiterhin gültigen Benutzerkontext).
- [x] Ergebnisaktionen „Nicht bearbeitete auswählen“ und „Ergebnis schließen“ sind während laufender Sammelaktionen geschützt.
- [x] Bei nur teilweise erfolgreichem Duplizieren wird die Listenübersicht aktualisiert, damit die unvollständige Kopie sichtbar und prüfbar ist.
- [x] Archivieren und Löschen prüfen nach dem Bestätigungsdialog zusätzlich den geladenen Kontokontext.
- [ ] Minimaler statischer GitHub-Inhaltsabgleich durchgeführt; keine Laufzeit-/Browser-/Syntaxprüfung als erfolgreich bestätigt.
- [ ] Mehrstufiges Verschieben und Duplizieren bleiben ohne serverseitige Transaktion nicht atomar. Fehlerfälle vor Freigabe gezielt prüfen.
- [ ] Kein Merge, kein Deployment, keine Vercel-Aufrufe, keine produktiven Supabase-Änderungen, keine kostenpflichtigen Dienste. Freigabe weiterhin gesperrt.

## Autopilot: konkurrierende Wunschaktionen und barrierearme Karten (2026-11-10)

- [x] Einzelverschieben und direkte Listenzuordnung verwenden eine kontobezogene Sperre pro Wunsch; zwei gleichzeitige Änderungen am selben Wunsch werden abgewiesen.
- [x] Sperren werden auch bei Fehlern durch `finally` freigegeben; andere Wünsche bleiben unabhängig bearbeitbar.
- [x] Sammelzuordnung und Mehrfachverschieben beginnen nicht, solange ein betroffener Wunsch gerade einzeln geändert wird; nach Bestätigung wird erneut geprüft.
- [x] „Filter zurücksetzen“ aus einem leeren Wunsch-Ergebnis respektiert laufende Sammelaktionen.
- [x] Wunschkarten erhalten eindeutige zugängliche Beschriftungen für Auswahl, Listenzuordnung, Verschieben und Notizaufklappen; dies hilft besonders bei schmalen mobilen Karten und Screenreadern.
- [x] Minimale Syntaxprüfung des aktuellen Dashboard-Moduls mittels JavaScript-Parser (ohne Importzeilen) erfolgreich; GitHub-Inhaltsabgleich für Sperren und Beschriftungen erfolgreich.
- [ ] Keine Browser-/End-to-End- oder produktive Datenbankprüfung ausgeführt. Mehrstufige Operationen bleiben ohne serverseitige Transaktion potenziell partiell.
- [ ] Release bleibt gesperrt. Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: konsistente Einzel-/Sammeländerungen und Kontowechsel (2026-11-10)

- [x] Sammelzuordnung und Mehrfachverschieben warten jetzt auf **alle** laufenden Einzeländerungen (auch an nicht ausgewählten Wünschen), damit deren spätere Reloads die Sammelaktion nicht ungültig machen.
- [x] Ein Wechsel des angemeldeten Kontos leert den alten Listenarbeitsbereich bereits **vor** dem Laden neuer Kontodaten, statt alte Karten bis zur ersten Antwort sichtbar zu lassen.
- [x] Auf schmalen Wunschkarten ist die Ziellistenauswahl während einer Sammelaktion deaktiviert; der Filter-Reset im Leerzustand hat einen eindeutigeren zugänglichen Namen.
- [x] Minimale JavaScript-Parserprüfung des Dashboard-Quelltexts (Imports ausgeklammert) erfolgreich; GitHub-Inhaltsprüfung der neuen Sperren und Kontolöschung erfolgreich.
- [ ] Kein echter Browser-/End-to-End-Test und kein produktiver Supabase-Test. Vor Freigabe besonders Kontowechsel während einer laufenden Anfrage, Abbruch und nicht-atomare Verschiebungen manuell prüfen.
- [ ] Freigabe bleibt gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: robuste Karten, begrenztes Rendering und Listeneditor (2026-11-10)

- [x] Auswahl- und Zuordnungscheckboxen auf Wunschkarten prüfen vor Änderungen den angemeldeten Kontokontext, die aktive Liste und das Vorhandensein des Wunsches; veraltete Karten lösen keine Schreibaktion mehr aus.
- [x] Filter-Reset im leeren Wunschbereich wird bei fehlenden Listenzuordnungen oder inaktivem Arbeitsbereich abgefangen.
- [x] „Alle zugeordneten“ bzw. „Alle ohne Liste“ auswählen behält die vollständige Sammelauswahl, rendert auf mobilen Geräten aber zunächst höchstens 100 Karten statt potenziell Tausender DOM-Elemente.
- [x] Der Wunschzähler nennt zusätzlich die Gesamtzahl ausgewählter Wünsche, auch wenn nur ein Ausschnitt sichtbar ist.
- [x] „Gestalten“ öffnet die Listenbearbeitung, ohne heimlich die aktive Wunschliste zu wechseln und dabei Auswahl-/Zuordnungskontext zu vermischen.
- [x] Öffnen und Speichern des Listeneditors prüfen zusätzlich den aktuellen Benutzer-/Listenstatus.
- [x] Minimale JavaScript-Parserprüfung des Dashboard-Quelltexts ohne Importzeilen erfolgreich; gezielte GitHub-Inhaltsprüfung der Änderungen erfolgreich.
- [ ] Browser-/Mobilgeräte-/End-to-End-Tests bleiben offen. Kein produktiver Supabase-Test ausgeführt.
- [ ] Freigabe weiterhin gesperrt. Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: Detailkontext, eindeutige Zuordnungen und Listenmutationen (2026-11-10)

- [x] Wunschdetails, lokale Markierungen und Kategorien reagieren nicht mehr auf veraltete Karten oder Benutzerkonten; Sprung in andere Listen prüft ebenfalls den geladenen Benutzerkontext.
- [x] Die Dashboard-Zuordnungsübersicht übernimmt nur bekannte Wünsche und Listen; Listen-Zähler basieren auf eindeutigen Wunsch-IDs statt möglicherweise mehrfach gelieferten Zuordnungszeilen.
- [x] Duplizieren, Archivieren und Löschen starten nicht parallel zu noch laufenden Einzeländerungen an Wünschen; nach Bestätigung werden Benutzer- und Listenstatus erneut geprüft.
- [x] JavaScript-Syntaxprüfung des aktuellen Dashboard-Moduls (ohne Imports) erfolgreich und GitHub-Inhaltsprüfung der neuen Schutzbedingungen erfolgreich.
- [ ] Keine Browser-/Mobilgeräte-/End-to-End- oder produktiven Supabase-Tests durchgeführt. Nicht-atomare Mehrschrittoperationen bleiben als Risiko offen.
- [ ] Freigabe weiterhin gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: mobile Leerzustände, lokale Markierungen und Einzelverschieben (2026-11-10)

- [x] Der Leerzustand „In keiner Liste“ meldet nur dann „Alle Wünsche zugeordnet“, wenn tatsächlich kein unzugeordneter Wunsch existiert; bei einschränkenden Such-/Kategorie-/Prioritätsfiltern erscheint stattdessen ein Filterhinweis.
- [x] Lokale Wunschmarkierungen und Kategorieänderungen sind während laufender Sammelaktionen gesperrt; die Markierungsbuttons spiegeln die Sperre sichtbar wider.
- [x] Einzelverschieben unterscheidet nach erfolgreichem Datenbankschreiben einen nachfolgenden Reload-Fehler vom eigentlichen Verschiebefehler. Bei fehlgeschlagenem Entfernen aus der Quellliste überschreibt ein fehlgeschlagener Reload den Teilfehlerhinweis nicht mehr.
- [x] Minimale JavaScript-Parserprüfung des aktuellen Dashboard-Quelltexts (Imports ausgenommen) und gezielte GitHub-Inhaltsprüfung erfolgreich.
- [ ] Browser-, Mobilgeräte- und Regressionstests bleiben offen. Mehrschrittoperationen sind nicht atomar und können teilweise abgeschlossene Zuordnungen hinterlassen.
- [ ] Freigabe bleibt gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: Navigation bei Ladezuständen und verlässliche Listenaktionen (2026-11-10)

- [x] Listenöffnung aus Übersicht, Favoriten und zuletzt verwendeten Listen wird bei nicht vollständig geladenen Zuordnungen oder falschem Kontokontext abgewiesen; veraltete Karten können den Arbeitsbereich nicht umschalten.
- [x] Der Wiederaufnahme-Einstieg aus der Sammelaktionshistorie erkennt archivierte oder nicht mehr vorhandene Ziellisten und fordert zur Prüfung auf.
- [x] Listendesign und Listenanlage starten nicht, während noch Einzeländerungen an Wünschen laufen; die Designbearbeitung benötigt einen vollständig geladenen Listenarbeitsbereich.
- [x] Duplizierung meldet eine erfolgreich gespeicherte Kopie auch dann als erfolgreich, wenn erst das anschließende Neuladen fehlschlägt. Bei Teilfehlern bleibt die Anzahl bereits kopierter Zuordnungen sichtbar.
- [x] Minimale JavaScript-Parserprüfung des Dashboard-Moduls (ohne Imports) und gezielte GitHub-Inhaltskontrolle erfolgreich.
- [ ] Browser-, Mobilgeräte- und End-to-End-Tests bleiben offen. Die Duplizierung bleibt eine nicht-atomare Mehrschrittoperation.
- [ ] Freigabe bleibt gesperrt. Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: mobile Wunschkarten während laufender Einzeländerungen (2026-11-10)

- [x] Navigation zwischen Listen und Sprung aus Wunschdetails warten, bis laufende Einzeländerungen abgeschlossen sind. Dadurch wird eine mehrstufige Verschiebung nicht durch einen vorzeitigen Listenwechsel unterbrochen.
- [x] Direkte Wunschzuordnung unterscheidet einen erfolgreichen Datenbankschreibvorgang von einem anschließenden Reload-Fehler und zeigt die nötige Aktualisierung an.
- [x] Auswahl-, Zuordnungs- und Markierungsfelder betroffener Wunschkarten werden während der Einzeländerung sichtbar deaktiviert; andere Karten bleiben bedienbar.
- [x] Minimale JavaScript-Parserprüfung des Dashboard-Moduls (ohne Imports) und gezielte Inhaltsprüfung erfolgreich.
- [ ] Browser-, Mobilgeräte- und End-to-End-Tests weiterhin offen; keine produktiven Supabase-Tests.
- [ ] Freigabe gesperrt. Kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: Reload-Rennen, mobile Kartenaktionen und Listenfeedback (2026-11-10)

- [x] Manuelles Aktualisieren wird während laufender Einzelwunschschreibvorgänge abgefangen, damit der Lade-Generationswechsel die zweite Phase einer Verschiebung nicht unterbricht. Das interne Neuladen nach einem abgeschlossenen Einzelvorgang bleibt erlaubt.
- [x] Die mobile Ziellistenauswahl und Verschieben-Schaltfläche sind für den gerade bearbeiteten Wunsch sichtbar deaktiviert.
- [x] Favoritenaktionen aus alten Listenkarten prüfen Benutzer- und Listenstatus. „Zugeordnete Wünsche“ ändert die Filter nur nach tatsächlich erfolgreichem Listenwechsel.
- [x] Erstellen und Gestalten von Listen melden nach erfolgreichem Datenbankschreiben einen separaten Reload-Fehler, statt die Speicherung fälschlich als fehlgeschlagen auszugeben.
- [x] Minimale JavaScript-Parserprüfung des Dashboard-Moduls ohne Imports und gezielte Quelltextprüfung erfolgreich.
- [ ] Browser-/Mobilgeräte-/End-to-End-Tests und Überprüfung der mehrstufigen Verschiebungen bleiben offen; keine produktiven Supabase-Tests.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: Auswahlkonsistenz und skalierbare Zuordnungszählung (2026-11-10)

- [x] Bereits gerenderte Auswahl-Checkboxen prüfen beim Klick erneut die Sperre des betroffenen Wunsches; während einer Einzeländerung lässt sich derselbe Wunsch nicht versehentlich in eine Sammelauswahl übernehmen.
- [x] Mobiler Listen-Schnellwechsel wird während laufender Einzeländerungen oder unvollständiger Mitgliedschaftsdaten sichtbar deaktiviert.
- [x] Hinzufügen, Entfernen und Verschieben als Sammelaktion sind während Einzeländerungen bereits in der Werkzeugleiste deaktiviert. Auch die Vorbereitung und das Öffnen des Bestätigungsdialogs prüfen die Sperre erneut.
- [x] Listen- und Gesamtzuordnungszähler werden direkt aus den bereits validierten eindeutigen Mitgliedschaftsmengen berechnet, statt alle Mitgliedschaftszeilen erneut mit wiederholter Listensuche zu durchlaufen.
- [x] Minimale JavaScript-Syntaxprüfung des Dashboard-Moduls (ohne Imports) und gezielte Quelltextkontrolle erfolgreich.
- [ ] Browser-/Mobilgeräte-/End-to-End-Tests offen; keine produktiven Supabase-Tests ausgeführt.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: veraltete Wunschkarten und Sammelbestätigungen (2026-11-10)

- [x] Kartenaktionen für Sammelauswahl, direkte Listenzuordnung und Einzelverschieben prüfen zusätzlich die beim Rendern gültige Lade-Generation. Veraltete Karten können nach einer Neuladung keine neuen Schreibvorgänge starten.
- [x] Auswahlwerkzeuge für sichtbare, zugeordnete und listenlose Wünsche sowie das Sammelaktions-Ziel werden während laufender Einzeländerungen sichtbar gesperrt.
- [x] Sammelbestätigungen speichern die Lade-Generation beim Vorbereiten und verwerfen die Bestätigung, wenn die Daten inzwischen neu geladen wurden. Nutzer müssen die Aktion dann neu prüfen.
- [x] Minimale JavaScript-Syntaxprüfung des Dashboard-Moduls ohne Imports und gezielte Quelltextprüfung erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests bleiben offen; keine produktiven Supabase-Tests durchgeführt.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: Einzeländerungen serialisieren und mobile Kartenaktionen absichern (2026-11-10)

- [x] Einzelverschieben und direkte Zuordnungsänderungen starten nicht mehr parallel zu irgendeiner anderen laufenden Einzeländerung. Damit kann das interne Neuladen einer Änderung nicht die noch offene zweite Schreibphase einer anderen Änderung ungültig machen.
- [x] Detail- und Markierungsaktionen auf alten Wunschkarten prüfen die beim Rendern gültige Lade-Generation und den Listenkontext, bevor sie lokale Daten verändern.
- [x] Sammelauswahl aus Wunschdetails, Kategorieauswahl und verbleibenden Ergebnissen wird während laufender Einzeländerungen erneut blockiert.
- [x] Die mobile Notiz-Aufklappschaltfläche aktualisiert neben dem sichtbaren Text auch ihren zugänglichen Namen und aria-expanded.
- [x] Minimale JavaScript-Parserprüfung des Dashboard-Moduls ohne Imports und gezielte Quelltextkontrolle erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests bleiben offen; keine produktiven Supabase-Tests ausgeführt.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment, keine kostenpflichtigen Dienste.

## Autopilot: bestätigte Sammelverschiebungen und aktuelle Listenaktionen (2026-11-10)

- [x] Die Sammelverschiebung merkt sich die Daten-Generation vor dem Bestätigungsdialog und prüft danach die unveränderte Generation sowie aktive Quell- und Zielliste. Veraltete Bestätigungen lösen keine Schreibvorgänge aus.
- [x] „Nicht bearbeitete Wünsche auswählen“ prüft die aktuell geladenen Wunsch-IDs und den für Hinzufügen bzw. Entfernen tatsächlich noch passenden Mitgliedschaftszustand; ungültige oder bereits erledigte Ziele werden nicht erneut ausgewählt.
- [x] Sammelauswahl leeren ist während einer Einzeländerung gesperrt, damit laufende Bearbeitung und Auswahlstatus nicht gegeneinander arbeiten.
- [x] Archivieren/Reaktivieren und Löschen prüfen nach der Bestätigung die ursprüngliche Daten-Generation und vollständige Zuordnungsdaten; veraltete Dialoge können keine Listenmutation auslösen.
- [x] Minimale JavaScript-Parserprüfung des Dashboard-Moduls ohne Imports und gezielte GitHub-Inhaltsprüfung erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests bleiben offen; mehrstufige Verschiebungen sind weiterhin nicht atomar.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: Listenkontext, Karten-Navigation und bestätigte Listenänderungen (2026-11-10)

- [x] Neue Listen lassen sich nur anlegen, wenn der angemeldete Benutzer mit dem vollständig geladenen Arbeitsbereich übereinstimmt und alle Zuordnungen bereitstehen.
- [x] Der Editor nimmt keine verborgenen oder bereits geschlossenen Listenbearbeitungsformulare mehr an.
- [x] Favoriten und Listen-Schnellaktionen aus alten Listenkarten prüfen die Lade-Generation und verwerfen veraltete Aktionen nach einem Reload.
- [x] Archivieren/Reaktivieren und Löschen unterscheiden erfolgreich gespeicherte Datenbankänderungen von nachgelagerten Ladefehlern und fordern bei Bedarf eine erneute Aktualisierung an.
- [x] Minimale JavaScript-Parserprüfung ohne Imports und gezielte Quelltextkontrolle erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Supabase-Tests.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: einheitliche Sperren für mobile Karten und Sammelauswahl (2026-11-10)

- [x] Karten-Checkboxen für Sammelauswahl und direkte Mitgliedschaft sowie mobile Ziellistenauswahl und Verschieben werden bei jeder laufenden Einzeländerung sichtbar deaktiviert; veraltete Events prüfen dieselbe globale Sperre erneut.
- [x] Die Schnellaktionen „Zugeordnete auswählen“, „Ohne Liste auswählen“, „Sichtbare auswählen“ und der globale sichtbare Auswahl-Schalter blockieren nun auch im Event-Handler während Einzeländerungen.
- [x] Die Sammelwerkzeugleiste sperrt „Auswahl leeren“ und Kategorieauswahl konsistent während laufender Einzeländerungen.
- [x] Lokale Marker und Kategorien prüfen dieselbe Sperre; Marker-Kartenaktionen und Detail-Sammelauswahl zeigen den gesperrten Zustand an.
- [x] Minimale JavaScript-Parserprüfung des Dashboard-Moduls ohne Imports und gezielte Quelltextkontrolle erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests bleiben offen. Laufende Operationen müssen vor Freigabe praktisch geprüft werden.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: mobile Entsperrung nach Schreibvorgängen und veraltete Listenaktionen (2026-11-10)

- [x] Mobile Schnellfilter, Filter-Zurücksetzen, „Nur Auswahl“ und das Leeren der Sammelauswahl werden während laufender Einzeländerungen nicht mehr umgeschaltet.
- [x] Gestaltung, Archivieren, Reaktivieren, Duplizieren und Löschen aus Listenkarten prüfen die Lade-Generation bereits vor dem Öffnen des jeweiligen Bestätigungsdialogs oder Editors.
- [x] Nach Abschluss einer Einzelverschiebung oder direkten Zuordnungsänderung werden aktuelle Wunschkarten erneut gerendert, nachdem die Einzeländerungs-Sperre aufgehoben wurde. Dadurch bleiben die frisch geladenen Karten nicht versehentlich deaktiviert.
- [x] Minimale JavaScript-Syntaxprüfung ohne Imports und gezielte Quelltextkontrolle erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests bleiben offen; insbesondere Entsperrung nach Erfolg und Ladefehler praktisch prüfen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: mobile Filterzustände und Detaildialog bei Neuladungen (2026-11-10)

- [x] Mobile Auswahl- und Filtersteuerung zeigt während Einzeländerungen konsistent deaktivierte Bedienelemente: Auswahl leeren, „Nur Auswahl“, Zugeordnete anzeigen und Zuordnungsfilter.
- [x] Mobile Listen-Schnellwahl, Filter für listenlose Wünsche und Nachladen weiterer Karten prüfen aktive Einzeländerungen auch beim Auslösen erneut.
- [x] Wunschdetails werden beim Invalidieren der Mitgliedschaftsdaten geschlossen und die bisherige Detail-ID zurückgesetzt. So können Detailaktionen nach Neuladen nicht auf veraltete Daten zugreifen.
- [x] Wunschdetails lassen sich während Einzel- und Sammelschreibvorgängen nicht neu öffnen; der Karten-Button zeigt den gesperrten Zustand.
- [x] Minimale JavaScript-Syntaxprüfung ohne Imports und gezielte Quelltextkontrolle erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests bleiben offen; Detaildialog-Verhalten nach Neuladung praktisch prüfen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: skalierbare mobile Auswahl und konsistente Navigation (2026-11-10)

- [x] Auswahlzahlen und Aktivierungszustände für zugeordnete und listenlose Wünsche verwenden die bereits validierten Mitgliedschafts-Sets statt zusätzliche vollständige Wunschlisten-Scans beim Kartenrendern.
- [x] Navigation aus Wunschdetails und der Schnellzugang „Neuer Wunsch in dieser Liste“ prüfen Benutzer, aktuelle Daten und laufende Einzel- oder Sammeländerungen erneut vor dem Wechsel.
- [x] Listenfilter, Favoriten-Schaltflächen und Listenübersichts-Schnellaktionen ändern während laufender Einzelzuordnungen keinen UI-Zustand.
- [x] Ergebnisübersicht und Verlauf von Sammelaktionen lassen sich während laufender Einzeländerungen nicht versehentlich verwerfen.
- [x] Minimale JavaScript-Parserprüfung ohne Imports und gezielte Quelltextkontrolle erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests bleiben offen; die Laufzeitverbesserung ist nicht per Benchmark gemessen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: exklusive Listen-Duplizierung und mobile Leerzustände (2026-11-10)

- [x] Mobile Zahlen und Leerzustände für Wünsche ohne Liste verwenden die validierte eindeutige Zuordnungsmenge; Filter-Zurücksetzen ist während laufender Einzeländerungen gesperrt.
- [x] Listen-Duplizierung setzt eine exklusive Sperre vor dem ersten Schreibvorgang und löst sie in finally; gewöhnliches Neuladen, Einzelverschiebungen, Sammelzuordnungen und Sammelverschiebungen werden während des Kopierens abgefangen.
- [x] Kopieren der Listenzuordnungen erfolgt weiterhin in begrenzten 100er-Paketen. Teilfehler unterscheiden zwischen einer nicht erstellten Liste und einer bereits angelegten, möglicherweise unvollständigen Kopie.
- [x] Listengestaltung, Neuanlage, Archivierung und Löschung werden während laufender Duplizierung nicht gestartet.
- [x] Minimale JavaScript-Parserprüfung ohne Imports und gezielte Quelltextkontrolle erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests bleiben offen. Duplizieren ist nicht transaktional; bei Teilfehlern Kopie manuell prüfen. Ein Konto-/Sitzungswechsel während eines Netzwerkaufrufs kann einen bereits gestarteten Schreibvorgang nicht zurücknehmen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Autopilot: Duplizierungssperre nach Bestätigungen und bei mobiler Navigation (2026-11-10)

- [x] Archivieren/Reaktivieren und Löschen prüfen die exklusive Kopiersperre erneut nach dem Bestätigungsdialog; eine inzwischen gestartete Duplizierung verhindert den destruktiven Schreibvorgang.
- [x] Favoritenänderungen aus Listenkarten werden während laufender Kopiervorgänge abgefangen.
- [x] Sprünge aus Wunschdetails und mobile Schnellfilter respektieren die Duplizierungssperre, damit sie keinen veralteten Listen- oder Auswahlkontext erzeugen.
- [x] Minimale JavaScript-Parserprüfung und gezielte Prüfung der beiden Bestätigungswege erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen. Weitere UI-Einstiegspunkte und Kontowechsel während Netzwerkoperationen müssen vor Freigabe geprüft werden.
- [ ] Keine produktiven Supabase-Änderungen, kein Vercel, kein Merge, kein Deployment; Freigabe bleibt gesperrt.

## Autopilot: Listenkopie sperrt direkte Wunschänderungen und mobile Karten (2026-11-10)

- [x] Direkte Zuordnungs-Checkboxen prüfen die aktive Listenkopie vor dem Datenbankschreibvorgang; Einzelverschiebungen prüfen sie nach Bestätigung erneut.
- [x] Sammelzuordnungen und Sammelverschiebungen prüfen die Kopiersperre auch vor Vorbereitung beziehungsweise nach der Bestätigung.
- [x] Wunschmarker und das Öffnen von Detaildialogen respektieren die Kopiersperre; Kategorie-Speichern war bereits gesperrt.
- [x] Mobile Karten zeigen für Auswahl-, Zuordnungs- und Verschiebeelemente während einer Listenkopie einen deaktivierten Zustand, sobald die Karten neu gerendert werden.
- [x] Minimale JavaScript-Syntaxprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen. Bestehende Karten werden bei Beginn einer Kopie nicht zwangsläufig neu gerendert; Ereignis-Guards verhindern die betroffenen Schreibvorgänge dennoch.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: sofortige mobile Kopiersperre und verbleibende Schreibpfade (2026-11-10)

- [x] Der direkte Checkbox-Schreibpfad für Listenzuordnungen prüft die aktive Duplizierung unmittelbar vor der Änderung.
- [x] Kategorie-Sammelauswahl, Detail-Sammelauswahl und Detailsprung berücksichtigen die exklusive Kopiersperre.
- [x] Die Sammelaktionsleiste behandelt eine aktive Listenkopie als gesperrten Zustand; Auswahl leeren, Verlauf löschen, Filter zurücksetzen und die Anzeige listenloser Wünsche respektieren die Sperre.
- [x] Zu Beginn einer Listen-Duplizierung werden mobile Wunschkarten sofort neu gerendert und deaktivierte Steuerelemente angezeigt; nach Abschluss werden sie wieder aktualisiert.
- [x] Listenfilter und Favoriten-Schnellnavigation verändern den Listenarbeitsbereich während des Kopierens nicht.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine transaktionale Duplizierung und kein produktiver Datenbanktest.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: mobile Auswahl-Handler und robuste Kopiersperre (2026-11-10)

- [x] Schnellwahl „Zugeordnete“, „Ohne Liste“, „Sichtbare“, „Nur Auswahl“ und Kategorieauswahl sowie „Mehr laden“ respektieren eine laufende Listen-Duplizierung auch in den Ereignis-Handlern.
- [x] Sammelaktions-Verlauf, Restmengenauswahl und Ergebnis-Schließen können während der Duplizierung nicht verändert werden.
- [x] Eine blockierte „Sichtbare auswählen“-Checkbox wird aus dem tatsächlichen Auswahlzustand wiederhergestellt, statt eine optisch falsche Auswahl anzuzeigen.
- [x] Schnellfilter „Zugeordnete“ und Zurücksetzen der Wunschfilter respektieren ebenfalls die Kopiersperre.
- [x] Das sofortige Neurendern mobiler Karten bei Kopierstart liegt innerhalb von try/finally; selbst bei einem Darstellungsfehler wird die Kopiersperre wieder freigegeben.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Mehrstufige Kopien sind nicht transaktional.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: Kopierfortschritt und mobile Kontextstabilität (2026-11-10)

- [x] Der mobile Listen-Schnellwechsel und die Neuwunsch-Schaltfläche im aktiven Listenkontext sind während Kopiervorgängen und konkurrierenden Wunschänderungen deaktiviert.
- [x] Die Kartenansicht-Umschaltung und das Sammelaktions-Ziellistenfeld ändern während gesperrter Zustände keinen aktiven Arbeitskontext.
- [x] Ergebnisaktionen für fehlgeschlagene oder noch offene Sammeländerungen sind während einer Listenkopie deaktiviert.
- [x] Listen-Duplizierung meldet den Fortschritt nach jedem begrenzten Kopierpaket; bei Abschluss oder Fehler gelten weiterhin die bestehenden Ergebnis- und Teilfehlerhinweise.
- [x] Nach Abschluss einer Listenkopie werden mobile Karten nur im ursprünglich geladenen Benutzer-Arbeitsbereich erneut gerendert.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Kopien sind nicht atomar.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: mobile Eingabesperren und Kopierkontext (2026-11-10)

- [x] Der mobile Listen-Schnellwechsel stellt bei gesperrter Änderung den tatsächlich aktiven Listeneintrag wieder her.
- [x] Filter-Eingaben, das Leeren der Sammelauswahl und die Neuwunsch-Aktion aus dem Listenbereich prüfen die exklusive Kopiersperre auch in ihren Ereignis-Handlern.
- [x] Die Sammelauswahl aus dem Wunschdetail sowie Detail-Sprung und Markierungsaktionen respektieren laufende Kopier- und Schreibvorgänge.
- [x] Listen-Duplizierung prüft nach Bestätigung den aktuellen Archivstatus der Quellliste; während der Kopie wird der ursprüngliche geladene Benutzerkontext geprüft.
- [x] Nach erfolgreichem Neuladen bleibt die Erfolgsmeldung erhalten, obwohl die Dashboard-Generation erwartungsgemäß weitergezählt wurde.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Kopiervorgänge bleiben nicht transaktional.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: Kopierfehler, mobile Checkboxen und veraltete Detaildialoge (2026-11-10)

- [x] Fehler nach einem bereits fortgeschrittenen Listen-Reload verlieren die Meldung zu teilweise kopierten Zuordnungen nicht allein durch eine neue Dashboard-Generation; fremde Benutzerkontexte werden weiterhin ausgeschlossen.
- [x] Blockierte mobile Sammelauswahl-Checkboxen stellen ihren Zustand aus `bulkIds` wieder her, statt blind zu invertieren.
- [x] Blockierte oder fehlgeschlagene direkte Zuordnungs-Checkboxen stellen den Zustand aus `assignedIds` wieder her, statt einen möglicherweise bereits veralteten Wert umzuschalten.
- [x] Beim Beginn der exklusiven Listenkopie werden offene Wunschdetails geschlossen, damit veraltete Detailaktionen nicht im Vordergrund bleiben.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; kein produktiver Datenbanktest. Nicht transaktionale Teilkopien bleiben ein Freigaberisiko.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: Quellzuordnung und mobile Listennavigation vor Schreibvorgängen prüfen (2026-11-10)

- [x] Der Listenkarten-Kurzbefehl „Zugeordnete Wünsche“ verlangt einen aktuellen Benutzer-Arbeitsbereich, vollständige Zuordnungen und keine laufenden Kopier-, Sammel- oder Einzeländerungen.
- [x] Die Schnellnavigation zur aktiven Liste und der mobile Zurück-Befehl respektieren laufende Änderungen.
- [x] Vor einer bestätigten Einzelverschiebung werden die aktive Quellliste, Zielliste und das Vorhandensein des Wunsches erneut geprüft.
- [x] Fehlermeldungen bei teilweise abgeschlossenen Einzelverschiebungen unterscheiden bereits bestehende Zielzuordnungen von neu angelegten Zielzuordnungen.
- [x] Vor dem Start einer bestätigten Listenkopie werden geladener Benutzerkontext und vollständige, unveränderte Quellzuordnungen erneut geprüft.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Kopiervorgänge bleiben nicht transaktional.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: mobile Doppelaktionen und dauerhafte Verschiebungsrückmeldungen (2026-11-10)

- [x] Wiederverwendbare Karten-Schaltflächen ignorieren erneute Aktivierung, solange ihre Aktion läuft; abgetrennte Schaltflächen werden nach asynchronen Vorgängen nicht erneut aktiviert.
- [x] Vor bestätigtem Löschen einer Liste werden geladener Benutzerkontext und unveränderter Archivstatus erneut geprüft.
- [x] Warnungen über eine teilweise abgeschlossene Einzelverschiebung bleiben auch nach einem anschließenden Neuladen sichtbar.
- [x] Die Ergebniszusammenfassung einer Sammelverschiebung bleibt bei fehlgeschlagenem Dashboard-Reload im ursprünglichen Benutzer- und Listenkontext sichtbar.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Zweistufige Verschiebungen und Kopien sind weiterhin nicht transaktional.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: Verlauf, mobile Leerdatenzustände und Nachladen (2026-11-10)

- [x] Wiederaufnahme aus dem Sammelaktions-Verlauf prüft Kopier-, Sammel- und Einzelaktionssperren sowie aktuelle Mitgliedschaftsdaten und den ursprünglichen Benutzer-Arbeitsbereich, bevor sie die Zielliste öffnet oder eine neue Bestätigung vorbereitet.
- [x] Bei fehlender aktiver Liste, unvollständiger Mitgliedschaft oder fremdem Benutzer-Arbeitsbereich sind alle mobilen Auswahl- und Neuwunsch-Schaltflächen deaktiviert.
- [x] Die „Mehr laden“-Schaltfläche wird nach erfolgreichem Mitgliedschafts-Reload wieder korrekt aktiviert, sofern weitere Treffer vorhanden sind; laufende Änderungen sperren sie weiterhin.
- [x] Das Zurücksetzen von Listenfiltern im leeren Suchergebnis respektiert Kopier- und Schreibsperren sowie den geladenen Benutzerkontext.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Kopiervorgänge und Verschiebungen bleiben nicht transaktional.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: Benutzerkontext für Sammelaktionen und mobile Filter (2026-11-10)

- [x] Das Löschen einer Liste prüft den geladenen Benutzer bereits vor dem Bestätigungsdialog und lehnt veraltete Listenkarten ab.
- [x] Sammelaktions-Ergebnisfelder und erneute Bestätigungen werden auf den geladenen Benutzerkontext begrenzt; Wiederholungs- und Fortsetzungsaktionen sind bei laufenden Änderungen deaktiviert.
- [x] Vor dem Ausführen bestätigter Sammelaktionen werden Dashboard-Generation und geladener Benutzerkontext gemeinsam erneut geprüft; Sammelverschiebungen prüfen den geladenen Benutzer bereits beim Einstieg.
- [x] Mobile Wunschfilter sind während Kopier-, Sammel- und Einzeländerungen sichtbar deaktiviert und werden nach Wiederherstellung der Mitgliedschaftsdaten erneut aktiviert.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Nicht transaktionale Kopier- und Verschiebungsvorgänge bleiben ein Freigaberisiko.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: exklusive Listen-Schreibsperre (2026-11-10)

- [x] Gemeinsame `listMutationBusy`-Sperre eingeführt: Archivieren, Reaktivieren, Löschen, Erstellen und Gestalten einer Liste serialisieren ihre asynchronen Schreib- und Reload-Phasen.
- [x] Normale Dashboard-Reloads, Kartenaktionen und Sammelaktionen respektieren laufende Listen-Schreibvorgänge; der jeweils eigene abgeschlossene Schreibvorgang kann kontrolliert mit `load({afterBulk:true})` neu laden.
- [x] Exklusive Listenkopien werden nicht gleichzeitig mit anderen Listenmutationen gestartet.
- [x] Mobile Wunschfilter, Schnellnavigation und Sammelaktions-Ergebnissteuerung berücksichtigen die zusätzliche Sperre und werden nach dem Abschluss wieder aktualisiert.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Die clientseitige Sperre ersetzt keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktprüfung.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: mobile Sperr- und Freigabezustände bei Listenänderungen (2026-11-10)

- [x] Direkte Zuordnungs-Checkboxen auf mobilen Wunschkarten sind während einer exklusiven Listenmutation sichtbar deaktiviert.
- [x] Beginnende Archivierungs-, Lösch-, Erstellungs- und Designänderungen aktualisieren die mobilen Wunschkarten und Sammelaktions-Bedienelemente unmittelbar nach Erwerb der Schreibsperre.
- [x] Die anfängliche Kartenaktualisierung findet innerhalb des `try/finally`-Bereichs statt, damit eine Ausnahme die exklusive Schreibsperre nicht dauerhaft bestehen lässt.
- [x] Bereits angezeigte Sammelaktionsergebnisse synchronisieren die Verfügbarkeit von Wiederholen/Fortsetzen nach dem Freigeben der Schreibsperre erneut.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Sperren ersetzen keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktkontrollen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: vollständige mobile Sperren und Sammelaktions-Bestätigungen (2026-11-10)

- [x] Weitere mobile Kartenaktionen und Auswahlsteuerungen (Einzelverschiebung, Zielauswahl, Details, Mehr laden und Auswahlfilter) zeigen die exklusive Listen-Schreibsperre unmittelbar an.
- [x] Eine bereits vorbereitete Sammelaktion kann während einer Listenänderung nicht mehr über den Bestätigungsdialog gestartet werden; Wiederholen aus der Ergebnisübersicht prüft zusätzlich Benutzer und Listenkontext.
- [x] Detaildialog-Auswahl und Sprungaktionen lehnen konkurrierende Listenänderungen ab.
- [x] Verlauf-Löschen und „Ohne Liste“-Schnellzugriffe berücksichtigen Schreibsperren und den geladenen Benutzerkontext.
- [x] Listen-Suche, Listenansicht und Sortierung sind während laufender Änderungen sichtbar deaktiviert und werden nach der mobilen Aktualisierung wieder freigegeben.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Sperren ersetzen keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktkontrollen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: Besitzerkontext bei laufenden Sammelaktionen und mobiler Auswahl (2026-11-10)

- [x] Bestätigte Sammelaktionen prüfen zusätzlich den tatsächlich geladenen Besitzer beim Start, während jeder Schreibiteration und vor der Übernahme von Ergebnissen in Verlauf und Ergebnisübersicht.
- [x] Mobile Schnellaktionen für zugeordnete und unzugeordnete Wünsche prüfen den aktuellen Benutzer gegen den geladenen Arbeitsbereich.
- [x] „Mehr laden“, sichtbare Auswahl und Kategorieauswahl werden nach Kontowechsel oder bei fehlender aktiver Liste nicht mehr auf alten Daten ausgeführt.
- [x] Mobile Filter- und Auswahlrücksetzungen sind an einen geladenen, gültigen Listenarbeitsbereich gebunden.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Besitzerprüfungen ersetzen keine serverseitigen Berechtigungen oder Transaktionen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: mobile Restlücken und Besitzerwechsel bei Verschiebungen (2026-11-10)

- [x] Mobile Sammelauswahl-Checkboxen und lokale Markierungsschaltflächen sind während exklusiver Listenänderungen sichtbar gesperrt.
- [x] Schnellwechsel und Neuer-Wunsch-Zugriff aus der Listenansicht berücksichtigen Listen-Schreibsperre und geladenen Besitzer.
- [x] Sammelverschiebungen prüfen den geladenen Besitzer nach Bestätigung und vor dem Entfernen aus der Ursprungsliste; bei Kontextwechsel bleibt die mögliche Zielzuordnung bestehen und wird als Teilzustand behandelt.
- [x] Einzelne Wunschzuordnungen übernehmen keine verspäteten Antworten aus einem anderen geladenen Benutzerarbeitsbereich; veraltete Kartenverschiebungen werden abgewiesen.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Mehrgeräte-Konkurrenz und nicht transaktionale Verschiebungen bleiben Freigaberisiken.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: Besitzergebundene Verschiebungen und Listenfilter (2026-11-10)

- [x] Einzelverschiebungen prüfen vor und nach Bestätigung den geladenen Besitzer und stoppen zwischen Ziel- und Quellzuordnung bei veraltetem Kontext.
- [x] Sammelverschiebungen und Sammelzuordnungen zeigen abschließende Meldungen und aktivieren Bedienelemente nur noch im passenden geladenen Benutzerarbeitsbereich.
- [x] Listenfilter, Favoriten-Schnellzugriffe und Sammelverschiebungs-Zielauswahl verarbeiten keine Eingaben aus einem veralteten Benutzerarbeitsbereich.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Mehrgeräte-Konkurrenz und nicht transaktionale Verschiebungen bleiben Freigaberisiken.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: sichere Wiederaufnahme und veraltete Sammelergebnisse (2026-11-10)

- [x] Wiederaufnahme aus der Sammelergebnisübersicht erfordert passenden angemeldeten und geladenen Besitzer, aktive Ursprungsliste, geladene Mitgliedschaften und freie Mutationssperren.
- [x] Verlauf-Löschen und Schließen der Ergebnisübersicht lehnen veraltete Besitzerarbeitsbereiche ab.
- [x] Einzelverschiebungen schreiben keine verspäteten Statusmeldungen in einen fremden Arbeitsbereich und aktivieren keine abgehängten Kartensteuerungen.
- [x] Die mobile Sammelaktionsleiste wird bei veraltetem Besitzer oder nicht geladenen Zuordnungen sichtbar deaktiviert.
- [x] Ergebnisse aus veralteten Besitzerarbeitsbereichen werden nicht als aktuelles `lastBulkResult` übernommen.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Sperren ersetzen keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktkontrollen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: veraltete Sammelaktionsfortschritte und mobile Navigation (2026-11-10)

- [x] Sammelaktions-Fortschrittsmeldungen werden nur bei passendem angemeldetem und geladenem Besitzer aktualisiert; der direkte Sammelaktionsstart prüft den geladenen Besitzer.
- [x] Vorbereitete Sammelaufträge ohne gültige Zielauswahl werden nicht geöffnet.
- [x] Abgehängte Verlaufseinträge können keine Wiederholung auslösen, wenn sie nicht mehr Teil des aktuellen Sammelaktionsverlaufs sind.
- [x] Mobile Zurück-Navigation und Karten-/Kompaktansicht erfordern einen geladenen, aktuellen Besitzerarbeitsbereich.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Sperren ersetzen keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktkontrollen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: abgehängte mobile Kartensteuerungen (2026-11-10)

- [x] Verspätete Erfolgsmeldungen einzelner Wunschzuordnungen prüfen angemeldeten und geladenen Besitzer.
- [x] Abgehängte Mitgliedschafts-Checkboxen werden nicht verarbeitet oder nach asynchronen Änderungen wieder aktiviert.
- [x] Abgehängte Sammelauswahl-Checkboxen und Wunschmarkierungen können den aktuellen Zustand nicht verändern.
- [x] Listenfavoriten und einzelne mobile Verschiebeaktionen prüfen, ob ihre ursprünglichen Bedienelemente noch mit dem aktuellen Dokument verbunden sind.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Sperren ersetzen keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktkontrollen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: mobile Kartenansicht und Favoriten-Navigation (2026-11-10)

- [x] Favoriten-Schnellzugriffe validieren die aktuelle Listengeneration, aktive Liste, Favoritenstatus, geladenen Besitzer und bestehende Mutationssperren.
- [x] Abgehängte Listenkarten können nicht mehr die aktuelle Liste öffnen.
- [x] Mobile Notizen werden nur auf verbundenen Wunschkarten des aktuellen Arbeitsbereichs ein- und ausgeklappt.
- [x] Wunschdetails und Titelkopieren prüfen den aktuellen geladenen Benutzer und die verbundene Karte.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Sperren ersetzen keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktkontrollen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: Sammelbestätigung, mobile Sperranzeige und Listenkarten (2026-11-10)

- [x] Blockierte und ungültige Sammelbestätigungen zeigen verständliche Hinweise, statt ohne Rückmeldung abzubrechen.
- [x] Die Anzeige für Wünsche ohne Liste und die Sammelaktionshistorie werden beim Rendern mobiler Wunschkarten mit den aktuellen Mutationssperren synchronisiert.
- [x] Warnungen nach erfolgreicher Archivierung oder Löschung mit anschließend fehlgeschlagenem Neuladen erscheinen nur im geladenen Besitzerarbeitsbereich.
- [x] Abgehängte Listenkarten können weder den Gestaltungseditor noch die Ansicht zugeordneter Wünsche öffnen.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Sperren ersetzen keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktkontrollen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: sichere mobile Schnellnavigation und Besitzerzustände (2026-11-10)

- [x] Abgehängte und veraltete „Zuletzt geöffnet“-Schnellzugriffe prüfen Rendergeneration, geladenen Besitzer, aktive Liste und aktuellen Verlauf.
- [x] Mobile Listenauswahl, Neuen-Wunsch-Aktion und Schnellfilter sind bei veraltetem Besitzer oder unvollständigen Mitgliedschaften deaktiviert bzw. wirkungslos.
- [x] „Wünsche ohne Liste“ und Sammelaktionsverlauf zeigen ihre Sperre bei veraltetem Besitzer sichtbar an.
- [x] Minimale JavaScript-Parserprüfung und gezielte Quelltextkontrollen erfolgreich.
- [ ] Browser-, Mobilgeräte-, Integrations- und End-to-End-Tests offen; keine produktiven Datenbankänderungen oder Testdaten. Clientseitige Sperren ersetzen keine serverseitigen Transaktionen oder Mehrgeräte-Konfliktkontrollen.
- [ ] Freigabe gesperrt; kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: mobile Amazon-Produktlinks (2026-11-10)

- [x] Mobile Amazon-Produktlinks von `m.amazon.de` werden als offizieller Marketplace erkannt und auf den bestehenden kanonischen Produktpfad abgebildet.
- [x] Fremde Trackingparameter werden bei geteilten Amazon.de-Links nicht übernommen.
- [x] Regressionstests für mobile, klassische und Smile-Hosts sowie ähnlich aussehende Fremddomains ergänzt.
- [ ] CI-/Node-Testlauf für die neuen Änderungen noch nicht bestätigt; Browser- und Mobilgeräteabnahme weiterhin offen.
- [ ] Freigabe weiterhin gesperrt: kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment. Mehrgeräte-Konflikte und nicht transaktionale Verschiebungen bleiben gesonderte Risiken.

## Autopilot: URL-Eingabehärtung (2026-11-10)

- [x] Produktlink-Parser lehnt eingebettete ASCII-Steuerzeichen, Leerzeichen und nicht eindeutige Eingaben vor der URL-Normalisierung ab.
- [x] Gewöhnliche Amazon-Produktlinks mit Tracking-Query oder Fragment bleiben kompatibel; die ASIN-Erkennung bleibt auf zugelassene Hosts und Produktpfade beschränkt.
- [x] Gezielte Regressionstests für fehlerhafte Eingaben und gültige Produktlinks ergänzt.
- [ ] GitHub-Actions-Ergebnis und Browser-/Mobilgeräteabnahme dieser Änderung noch nicht bestätigt; keine Behauptung eines erfolgreichen CI-Laufs.
- [ ] Freigabe gesperrt: kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment. Clientseitige Maßnahmen ersetzen keine serverseitige Zugriffskontrolle.

## Autopilot: Produktpfad-Verankerung (2026-11-10)

- [x] Amazon-Produktpfade müssen am Anfang des URL-Pfads stehen; verschachtelte `/redirect/dp/ASIN`-ähnliche Pfade werden nicht mehr als Produkt akzeptiert.
- [x] Gültige Root-Pfade `/dp/ASIN`, `/gp/product/ASIN` und `/gp/aw/d/ASIN` bleiben kompatibel.
- [x] Regressionstests für verschachtelte Pfade, falsche ASIN-Suffixe und erlaubte Root-Pfade ergänzt.
- [x] Isolierte Node.js-RegEx-Prüfung der relevanten gültigen und ungültigen Pfadfälle erfolgreich.
- [ ] Vollständiger Node-Testlauf, Browser-/Mobilgeräte-Tests und CI-Status dieser Commits noch nicht bestätigt.
- [ ] Freigabe gesperrt: kein Vercel, keine produktiven Supabase-Änderungen, kein Merge, kein Deployment.

## Autopilot: CI-Ausbau und produktiver Sicherheitscheck (2026-11-10)

- [x] CI-Syntaxprüfung auf `lists-dashboard.mjs`, `list-features.mjs` und `bulk-helpers.mjs` erweitert; bestehende Node-Test-Suite bleibt im Workflow.
- [x] Vorübergehend irrtümlich referenziertes, nicht vorhandenes `bulk-workflows.mjs` aus der CI-Konfiguration wieder entfernt.
- [x] Produktives Supabase-Projekt `Helferlein` (nicht `Helferlein-Test`) eindeutig identifiziert und Security Advisor lesend geprüft.
- [ ] Supabase-Sicherheitswarnung: `auth_leaked_password_protection` ist deaktiviert. Vor Freigabe prüfen und über Auth-Einstellungen aktivieren; siehe https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- [ ] Kein produktives Schema geändert: Für die aktuellen Parser-/CI-Änderungen ist keine Migration erforderlich.
- [ ] Vollständige CI-, Browser- und Mobilgeräteabnahme sowie überprüfte Deployment-Konfiguration weiterhin offen. Merge/Deployment sind vom Nutzer grundsätzlich autorisiert, werden aber erst nach bestätigter Freigabereife durchgeführt.

## Autopilot: CI-Gate geprüft und Parser-Regression behoben (2026-11-10)

- [x] Mehrfach-Präfix-Fehler im Amazon-Hostparser behoben: exakt ein erlaubtes Präfix `www.`, `smile.` oder `m.` wird entfernt. `www.m.amazon.de` bleibt verboten; `m.amazon.de` funktioniert.
- [x] `npm run test:node` auf alle `*.test.mjs` umgestellt, damit neue Tests nicht stillschweigend fehlen.
- [x] GitHub Actions tatsächlich abgefragt: Run 42824434530 für Commit `87bb1706` ist **failure**; Syntaxprüfungen waren in vorherigem Run erfolgreich, `node --test amazon-wishlist/*.test.mjs` schlug fehl.
- [ ] Fehlerursache der vollständigen Node-Test-Suite aus CI-Logs ermitteln und beheben. Ohne grünen CI-Run keine Freigabe.
- [ ] Browser-/Mobilgeräte-Tests und Deployment-Konfiguration weiter prüfen. Nutzer hat Merge, produktive Supabase-Änderungen und Deployment autorisiert; **nicht durchgeführt**, da Qualitäts-Gates rot sind.
- [ ] Keine Datenbankmigration für diese reinen Frontend-/CI-Änderungen nötig.

## Autopilot: CI-Fehlerbehebung und Merge-Gate (2026-11-10)

- [x] Fehlgeschlagenen CI-Lauf 42824708355 bis zum Einzeltest `amazon-links.test.mjs` eingegrenzt.
- [x] URL-Parser prüft ASCII-Steuerzeichen jetzt **vor** `trim()`, damit nachgestellte Newlines/Tabs nicht verschwinden und ungültige URLs nicht versehentlich akzeptiert werden.
- [x] GitHub Actions Lauf 42824778203 auf Commit `355d92da` ist **success** (inklusive Node-Tests und Syntaxprüfungen).
- [x] CI gibt individuelle Test-Suite-Ergebnisse aus und führt anschließend einen verpflichtenden vollständigen Node-Testlauf durch.
- [x] CI des Workflow-Commits `c0619732` separat bestätigt: GitHub Actions Lauf 42824800184 **success**.
- [ ] Pull Request #166 ist aktuell `mergeable=false` / `mergeable_state=dirty`: Konflikte mit `main` müssen vor einem Merge aufgelöst und erneut getestet werden.
- [ ] Browser-/Mobilgeräteabnahme und Deployment-Ziel/Build-Konfiguration vor Produktionsfreigabe prüfen. Kein Merge, kein Deployment, keine produktive Datenbankmigration durchgeführt.

## Autopilot: PR #166 Konfliktanalyse und Browser-CI (2026-11-10)

- [x] Konfliktstatus per GitHub-API geprüft: PR #166 war `mergeable=false`, `mergeable_state=dirty`.
- [x] Nicht zum Wishes-Feature gehörende Root-Änderungen in `index.html`, `tests/b3-startseite.spec.cjs` und `tests/launch-30.spec.cjs` an aktuelles `main` angeglichen (drei separate Commits).
- [x] Ursache der verbleibenden Merge-Risiken identifiziert: `main` enthält bereits 12 `amazon-wishlist/`-Dateien; davon weichen acht von der Feature-Version ab, u. a. `app.mjs` (main 27.745 Bytes, Feature 23.656 Bytes) und `wishlist-utils.mjs` (main 11.316 Bytes, Feature 4.248 Bytes). Ein blindes Überschreiben würde aktuelle main-Funktionalität möglicherweise entfernen.
- [x] Separate GitHub-Actions-Browser-Job für isolierte Playwright-Chromium-Tests eingerichtet; `npm run test:ci` ergänzt.
- [ ] Browser-CI-Ergebnis bestätigen und ggf. Fehler beheben.
- [ ] Die acht überlappenden Wishes-Dateien **inhaltlich zusammenführen**, bestehende main-Funktionen und Tests bewahren; erst danach PR-Merge erneut prüfen.
- [ ] Produktiver Merge/Deployment weiterhin zurückgestellt, bis PR konfliktfrei, CI einschließlich Browser grün und Migrations-/Deployment-Schritte geprüft sind. Keine produktiven Supabase-Änderungen für dieses Paket.

### Browser-CI-Nachbesserung (2026-11-10)

- [x] Browser-CI-Lauf 42825105181 analysiert: Node-`checks` erfolgreich, Browser-Job beim Schritt `Install Chromium` fehlgeschlagen.
- [x] Browser-Job auf offizielles versionsgebundenes Image `mcr.microsoft.com/playwright:v1.56.1-noble` umgestellt, passend zur Paketversion; fehleranfällige Host-Chromium-Installation entfernt.
- [ ] Ergebnis des neuen Container-Browser-CI-Laufs 42825183364 bestätigen, bevor Browser-Gate als bestanden markiert wird.
- [ ] Merge-Konflikte in den acht Wishes-Dateien weiterhin offen; kein automatisches Überschreiben der weiterentwickelten main-Dateien.

## Autopilot: Konfliktfreier Abgleich mit aktuellem main (2026-11-10)

- [x] Historische Konflikte in PR #166 per **echtem Zwei-Eltern-Merge-Commit** `db4ddf2d` auf dem Feature-Branch aufgelöst. Der Commit basiert auf aktuellem `main` `cd9606eb` und bewahrt die produktive main-Version aller acht abweichenden Dateien außer `amazon-links.mjs` und dessen Tests.
- [x] Sicherheitsverbesserungen aus dem Feature-Branch in `amazon-links.mjs` und `amazon-links.test.mjs` übernommen; aktuelle produktive `app.mjs`, `index.html`, `wishlist-utils.mjs`, `security-source.test.mjs` und `README.md` bleiben unverändert.
- [x] Nur zusätzliche Feature-Dateien, Workflow und Parser-Regressionen auf dem aktuellen main-Baum ergänzt. SQL-Dateien bleiben Vorschläge und wurden **nicht** ausgeführt.
- [x] GitHub meldete für PR #166 nach dem Abgleich `mergeable=true`; `mergeable_state=unstable` bedeutet noch nicht freigabefertig.
- [ ] GitHub Actions für Merge-Commit `db4ddf2d` einschließlich Chromium-Browser-Job abschließen und prüfen.
- [ ] Übernommene zusätzliche Listen-Dashboard-Module auf Integration mit der bewahrten produktiven App prüfen; bloßes Vorhandensein der Dateien bedeutet noch keine aktivierte Funktion.
- [ ] Vor Merge/Deployment alle erforderlichen Checks, Browserfunktion und Supabase-Schema-/RLS-Voraussetzungen verifizieren. Kein Produktiv-Deployment oder Schemaeingriff durchgeführt.

### Merge-Abgleich: CI-Nachprüfung (2026-11-10)

- [x] Merge-Commit `db4ddf2d` beseitigt die Git-Merge-Konflikte; GitHub meldet `mergeable=true`.
- [x] Die sechs einzeln ausgeführten Node-Test-Suites im Workflow 42825450158 sind jeweils erfolgreich, der zusätzliche parallele Gesamt-Testlauf schlug jedoch fehl. Gesamt-Testlauf und `test:node` deshalb auf sequenzielle Ausführung (`--test-concurrency=1`) umgestellt.
- [x] Release-Smoke-Workflow 42825450344 war erfolgreich.
- [ ] Den neuen **sequenziellen** Gesamt-Testlauf nach Commit `a20ee7b` bestätigen; vorherige Einzelsuite-Erfolge reichen nicht für Freigabe.
- [ ] Browser-Job des Playwright-Containers abschließen und verifizieren; bislang kein erfolgreiches Browser-Gate bestätigt.
- [ ] Zusätzlich ist Workflow `Vault Sync Queue Tests` (42825448865) mit `Run isolated queue tests` fehlgeschlagen. Vor Merge klären, ob der Fehler aus dem Abgleich stammt oder bereits auf main existiert.
- [ ] Kein PR-Merge oder Deployment, solange CI-Gates fehlschlagen oder laufen; SQL-Vorschläge nicht produktiv angewendet.

## Autopilot: konkrete CI-Logdiagnose und Produktionsintegration (2026-11-10)

- [x] Echte GitHub-Actions-Joblogs gelesen: Browser-Job 42825492054 hatte 18 Fehlschläge mit `TypeError: Invalid URL` in `isolated-browser-fixture.mjs:12`. Ursache: Playwright `Request.url` ist eine Methode, kein Property.
- [x] Browser-Fixture auf `route.request().url()` korrigiert; isolierten Request-Mock entsprechend aktualisiert (Commits `0d7d539d`, `ae9a730e`).
- [x] Echte Node-Gesamttest-Logs gelesen: zwei Fehlschläge `document is not defined` in Share-Link-Tests. `copyShareLink` verwendet jetzt sichere optionale `globalThis`-Zugriffe und meldet fehlende DOM-Fallbacks kontrolliert (Commit `b44f8226`).
- [x] Vault-Sync-Fehler anhand echter Logs auf `crypto is not defined` in VM-Testkontexten eingegrenzt; die zwei Test-Fixtures erhalten `node:crypto.webcrypto` (Commit `aae52c39`).
- [x] Produktive `app.mjs` und `index.html` geprüft: keine Imports oder Verweise auf `lists-dashboard.mjs`, `list-features.mjs`, `bulk-helpers.mjs`; die neuen Module sind **nicht** in die Live-App eingebunden. Vor Aktivierung sind Schema, RLS, Nutzerführung und E2E-Tests erforderlich.
- [x] Aktueller Release-Smoke-Workflow 42826238090 auf `b44f8226` war erfolgreich; Node-Job 42826228226 war ebenfalls erfolgreich.
- [ ] Aktuelle Browser- und Vault-Sync-CI nach den Korrekturen abschließend prüfen; bei verbleibenden Fehlern weiter nachbessern.
- [ ] Keine ungetestete Listen-Dashboard-Integration oder produktive SQL-Migration; PR-Merge/Deployment erst nach vollständiger Freigabe.

### Browser-Integration nach realen CI-Logs (2026-11-10)

- [x] CI-Lauf 42826228226: alle Node-`checks` erfolgreich; Browser-Job scheiterte mit `Missing UI fixture: #listsDashboard` und `Cannot set properties of null (setting 'onclick')`. Das war eine Regression durch Bewahren der produktiven main-HTML ohne das zuvor nur auf dem Feature-Branch vorhandene Dashboard-DOM.
- [x] Vorheriges Dashboard-HTML als **separate Test-Fixture** `dashboard-test-fixture.html` konserviert; isolierte Playwright-Tests nutzen diese Fixture, nicht die produktive `index.html`. Die Live-App bleibt unverändert.
- [x] Vault-Sync-Queue-Workflow 42826304878 und 42826363540 nach dem VM-Crypto-Fix erfolgreich.
- [x] Release-Smoke-Workflow 42826315582 erfolgreich.
- [ ] Browser-CI nach Fixture-Änderung auf Commit `6a0af80f` prüfen; erst dann Browser-Gate als grün markieren.
- [ ] Separate Dashboard-Fixture beweist nur isoliertes Verhalten; Live-Aktivierung verlangt Schema/RLS- und echte App-Integrationstests.

## Autopilot: letzte drei Chromium-Fehler und produktive RLS-Inventur (2026-11-10)

- [x] CI-Lauf 42826456111 auf `fb724047`: Node-`checks` **success**, Browser **15 passed / 3 failed**. Echte Joblogs identifizieren zwei veraltete Checkbox-Namen (`Alle gefilterten Wünsche auswählen` statt `Angezeigte Wünsche auswählen`) und einen Mobile-Geometry-Test, der auch bewusst unsichtbare Buttons als Layoutfehler zählte.
- [x] Playwright-Assertions an tatsächlich sichtbare Accessible Names und Layout-Geometrie angepasst; unsichtbare Buttons werden nicht mehr als überlaufende sichtbare Controls gewertet (Commit `c28e9fef`).
- [x] Vault-Sync 42827149875 **success**; Release-Smoke 42827149986 **success** auf `c28e9fef`.
- [x] Produktionsprojekt `avapuibsidubuzxjtyld` **nur lesend** geprüft: vier vorhandene Tabellen `wishlist_profiles`, `wishlist_products`, `wishlist_wishes`, `wishlist_follows`, alle mit RLS; 13 Policies mit öffentlichen SELECTs und eigentümergebundenen Schreibrechten. Keine Tabellen für Listen/Mitgliedschaften vorhanden, deshalb **keine Aktivierung des neuen Listen-Dashboards**.
- [x] Security Advisor meldet weiterhin `auth_leaked_password_protection` (Leaked Password Protection Disabled): https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- [ ] Vollständigen Chromium- und Node-Status nach `c28e9fef` bestätigen, bevor Merge freigegeben wird.
- [ ] Produktive Listen-Schema-Migration mit detaillierter RLS- und Rollback-Prüfung separat planen; keine Testdaten, keine DDL ausgeführt.

### Weitere Browser-CI-Regressionen (2026-11-10)

- [x] Chromium-Lauf 42827134198: Node-Gate grün; Browser 16/18 Tests bestanden. Fehler 1: zwei gleich benannte `Auswahl aufheben`-Buttons verursachen Playwright-Strict-Mode-Fehler. Der Test verwendet jetzt den eindeutigen `#bulkClear`-Selektor (Commit `2a65b2d2`).
- [x] Fehler 2: fünf Bulk-Toolbar-Buttons überschreiten auf 320px den Viewport. CSS der **isolierten** Dashboard-Testoberfläche mit `min-width:0`, `max-width:100%` und `overflow-wrap:anywhere` korrigiert (Commit `79480d8b`). Die produktive Oberfläche bleibt unverändert.
- [ ] Chromium-Lauf nach beiden Änderungen abschließen und verifizieren.
- [ ] Die getestete mobile CSS-Korrektur bei späterer produktiver Dashboard-Integration übernehmen, nicht stillschweigend als bereits produktiv deklarieren.

### Browser-CI jetzt grün (2026-11-10)

- [x] Geometrie-Protokoll aus Lauf 42827468719: Bei 320px Viewport hatte die Toolbar selbst nur 262px Breite, die Buttons wurden aber in neue **horizontale Spalten** bei x=288, 536 und 784 umgebrochen. Ursache: `flex-direction:column` zusammen mit geerbtem `flex-wrap:wrap` und `max-height:40dvh`.
- [x] Mobile Toolbar im isolierten Dashboard mit `flex-wrap:nowrap` korrigiert (Commit `fb41fe2e`).
- [x] **Amazon wishlist checks vollständig grün:** GitHub-Actions-Läufe **42827644320** und **42827653961** auf Commit `fb41fe2e`: sowohl Node-`checks` als auch Playwright-Chromium-`browser` erfolgreich.
- [x] Release-Smoke **42827653946** erfolgreich; Vault-Sync nach Crypto-Fix mehrfach erfolgreich.
- [ ] Merge/Deployment weiterhin gesperrt, solange Listen-Dashboard nicht in die produktive App integriert und das dafür erforderliche Listen-/Mitgliedschaftsschema inklusive RLS nicht freigegeben und validiert ist. Die grünen Browser-Tests verwenden ausdrücklich eine isolierte Dashboard-Test-Fixture.

## Autopilot: echte Dashboard-Integration und Schema-Härtung (2026-11-10)

- [x] Produktives `index.html` mit Dashboard-Abschnitt, vollständigen Bedienelementen, responsivem CSS und Listen-Auswahlfeld ergänzt (Commit `cb71e5c8`). Die acht vorhandenen Export-/Backup-Elemente aus main bleiben erhalten; insgesamt 174 eindeutige HTML-IDs, keine Duplikate.
- [x] `app.mjs` importiert und initialisiert `mountListsDashboard(db,()=>user)`, lädt Dashboard bei Auth-Änderung und nach Wunschänderungen, bietet eine optionale Listenzuordnung bei der Neuanlage und meldet Teilfehler ohne den erfolgreich angelegten Wunsch zu verschweigen (Commit `26f45bff`).
- [x] Listen-SQL-Vorschlag gehärtet: zusammengesetzter Fremdschlüssel `(wish_id,user_id)` verhindert auch unabhängig von RLS die Zuordnung fremder Wünsche; dafür eindeutiger Schlüssel `wishlist_wishes(id,user_id)` (Commit `30e21ca5`).
- [x] Echter produktiver HTML-DOM wird in neuer isolierter Chromium-Integrationsprüfung verwendet; Export-/Backup-Bedienelemente und schreibfreier Dashboard-Start werden geprüft (Commit `8af2fb34`).
- [x] Statische Regression für die tatsächliche App-Verkabelung und Erhaltung der Backup-/Exportfunktionen ergänzt (Commit `31285b27`).
- [x] Responsive Chromium-Prüfung für das **echte** Produktions-HTML bei 320px ergänzt (Commit `391371a1`).
- [x] Supabase-Produktivschema lesend inventarisiert: `wishlist_lists` und `wishlist_list_items` existieren noch nicht; vorhandene Wishes-Tabellen haben RLS. Dokumentation: https://supabase.com/docs/guides/database/postgres/row-level-security
- [ ] Finale Node-/Chromium-CI auf dem neuesten Commit vollständig abwarten. Vorher keine produktive Migration oder Freigabe.
- [ ] Schema-Migration erst nach grünen Tests mit RLS-/FK-Nachprüfung ausführen. Default-List-Backfill **nicht** automatisch anwenden; bestehende Daten sollen nicht ungeprüft verändert werden.
- [ ] Anschließend PR #166 auf Konflikte, Schutzregeln und tatsächliche Deployment-Zielkonfiguration prüfen. Erst nach bestandenem Produktionsgate mergen/deployen.

### Produktive Listenmigration ausgeführt und geprüft (2026-11-10)

- [x] Neue Chromium- und Node-Integrationsprüfungen auf Commit `391371a1`: Actions-Läufe **42828716110** und **42828725354** vollständig **success**. Release-Smoke und Vault-Sync ebenfalls **success**.
- [x] Erster Migrationsversuch wurde **atomar zurückgerollt**, weil die bestehende Spalte `wishlist_wishes.id` tatsächlich `bigint` und nicht `uuid` ist. Prüfung danach bestätigte, dass beide neuen Tabellen fehlten; keine Teildaten oder Testdaten angelegt.
- [x] `wishlist_list_items.wish_id` auf `bigint` korrigiert (Commit `fd613625`).
- [x] **Produktive Supabase-Migration `wishes_lists_owner_scoped_rls` erfolgreich angewendet** auf Projekt `avapuibsidubuzxjtyld`. Beide neuen Tabellen existieren, RLS ist aktiv (`wishlist_lists`: 4 Policies; `wishlist_list_items`: 3 Policies).
- [x] Zusammengesetzte Fremdschlüssel `(list_id,user_id)` und `(wish_id,user_id)` gegen tatsächliche Produktionsdatenbank verifiziert. Beide Tabellen sind leer (0/0), keine Testdaten oder Backfill-Daten erzeugt.
- [x] Supabase Security Advisor nach Migration geprüft: nur bestehende Warnung zur deaktivierten Leaked-Password-Protection; keine neue RLS-Warnung.
- [ ] Finale GitHub-Actions-Läufe nach dem SQL-Fix und der Dokumentation bestätigen, PR-Mergefähigkeit prüfen, tatsächliche Deployment-Konfiguration verifizieren.
- [ ] Default-List-Backfill nicht automatisch ausführen. Für das leere Listen-Schema besteht kein Bedarf, bestehende Wünsche ungeprüft umzuverteilen.

### Release-Gate nach produktiver Migration (2026-11-10)

- [x] Statischer Node-Sicherheitstest `lists-schema.test.mjs` schützt die reale `bigint`-ID, beide Eigentümer-Fremdschlüssel und die RLS-Policy-Vorgaben (Commit `617e58a4`).
- [x] GitHub PR #166 ist laut API `mergeable=true`, aber `mergeable_state=unstable` solange aktuelle Checks ausstehen.
- [x] GitHub Pages als Veröffentlichungsziel aus `.github/workflows/live-site-http.yml` identifiziert: `https://duhrrom11.github.io/Helferlein`. Der bestehende Live-HTTP-Check prüft noch nicht die Wishes-Route.
- [ ] Authentifizierte End-to-End-Prüfung gegen echte RLS-Rollen (ohne Testdaten in Produktion), einschließlich Benutzerwechsel, Neuanlage und Zuordnung, steht noch aus. Isolierte Browser-Tests sind keine vollständige Produktionsabnahme.
- [ ] Keine Freigabe des PR-Merges und kein GitHub-Pages-Deployment, bis alle neuen Checks grün und die Auth-/Deployment-Gates bestätigt sind.

### Kritische Berechtigungsprüfung und Korrektur (2026-11-10)

- [x] Zusätzliche **Live-Grant-Inventur** zeigte nach Schemaerstellung über geerbte Standardberechtigungen überraschend `anon`-Zugriffe einschließlich `TRUNCATE` auf beiden neuen Tabellen. `TRUNCATE` wird **nicht** durch RLS geschützt und musste vor Freigabe entzogen werden.
- [x] Produktive Sicherheitsmigration `wishes_lists_restrict_table_grants` erfolgreich ausgeführt: `REVOKE ALL` für `PUBLIC`, `anon`, `authenticated`, anschließend nur benötigte `authenticated`-Berechtigungen gezielt vergeben.
- [x] Verifiziert: `anon` hat auf beiden Tabellen **keine** Rechte mehr; `authenticated` hat auf `wishlist_lists` ausschließlich `SELECT,INSERT,UPDATE,DELETE` und auf `wishlist_list_items` ausschließlich `SELECT,INSERT,DELETE`. Insbesondere kein `TRUNCATE`, `REFERENCES` oder `TRIGGER`.
- [x] SQL-Vorschlag und Regressionstest entsprechend gehärtet (Commits `2be756f0`, `9e02c900`).
- [ ] Nach allen Sicherheitsänderungen erneut vollständige CI-Prüfung; kein Merge/Deployment bei offenen Checks.

## Autopilot: Freigabeprüfung nach ce034387 (2026-11-10)

- [x] **Alle vier** CI-Läufe für `ce034387` grün: Wishlist `42829155988` und `42829165759` (Node + Chromium), Vault-Sync `42829165784`, Release-Smoke `42829165761`. Keine CI-Fehler.
- [x] Produktive RLS-Policies live abgefragt: `wishlist_lists` hat 4 Owner-Policies, `wishlist_list_items` 3 Owner-Policies; INSERT-Membership verlangt Besitz **beider** Objekte; Listen-UPDATE erzwingt `USING` und `WITH CHECK`.
- [x] Produktions-Rollen mit `BEGIN READ ONLY; SET LOCAL ROLE` **ohne Testdaten** geprüft: `anon` darf weder Listen lesen noch Memberships anlegen oder truncaten; `authenticated` darf Listen lesen, aber weder truncaten noch Memberships updaten. Bestehende Listen-/Membership-Tabellen sind leer.
- [x] Supabase Security Advisor erneut ausgeführt: keine RLS-Warnung; **bestehende** Warnung `auth_leaked_password_protection` weiterhin offen (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- [x] Echter Produktions-HTML-Chromiumtest prüft jetzt auch, dass Logout private Listen und Listenauswahl entfernt (Commit `a5e9c4be`).
- [x] GitHub-Pages-Live-HTTP-Workflow um Wishlist-HTML und die beiden produktiven JavaScript-Modulrouten ergänzt (Commit `b9d6fd68`). Veröffentlichung ist dadurch nach Merge beobachtbar.
- [x] PR #166 per GitHub API geprüft: `mergeable=true`, kein Draft. Zuletzt `mergeable_state=unstable` während neuer CI-Läufe.
- [ ] Neueste Node-/Chromium-/Vault-/Smoke-CI **nach diesen Commits** vollständig grün bestätigen; dann Merge-Gate erneut prüfen.
- [ ] Echtes Auth-/Wunsch-Anlegen-/Listen-Zuordnen-End-to-End mit vorhandenen berechtigten Konten noch nicht ausgeführt. Die SQL-Rollentests sind read-only und ersetzen keine reale Benutzeraktion.
- [ ] Deployment erst nach Merge und bestandenem GitHub-Pages-Live-HTTP-Check als erfolgreich melden. Vorher keine Veröffentlichung behaupten.

### Zusätzlicher Hosting-Befund

- [x] Repository-Metadaten `GET /repos/duhrrom11/Helferlein`: `has_pages=true`, **aber** offizielles `homepage`-Feld verweist auf `https://helferlein-ochre.vercel.app`. GitHub Pages ist damit nicht zweifelsfrei das einzige oder primäre Produktionsziel.
- [ ] **Vor Deployment** Vercel-Projekt/Build/Branch/Domain prüfen und Live-Routen auf **beiden** Hostingzielen validieren; aus `has_pages=true` folgt nicht, dass Vercel dieselben Dateien veröffentlicht. Eine Vercel-Bereitstellung wurde hier nicht ausgelöst oder verifiziert.

## Autopilot-Freigabestand nach Commit 75308c61 (2026-11-10)

- [x] **Alle 4 Workflows auf genau `75308c61` erfolgreich:** Wishlist `42829637634` und `42829646420` mit jeweils **checks + browser success**, Vault-Sync `42829646624`, Release-Smoke `42829646368`.
- [x] Produktions-Supabase erneut **read-only** unter `authenticated` geprüft: SELECT auf Listen erlaubt, TRUNCATE nicht erlaubt, ohne JWT keine sichtbaren Listen. Security Advisor: nur bekannte Warnung zur deaktivierten Leaked-Password-Protection, keine neue RLS-Warnung.
- [x] PR #166 war bei erneuter API-Prüfung noch offen, ohne Draft und mit Head `75308c61`; GitHub berechnete Mergeability temporär als `unknown`. Frühere Abfrage zeigte `mergeable=true`.
- [ ] Authentifizierter Browser-E2E mit echten Konten und tatsächlichen Listenmutationen wurde **nicht** ausgeführt: Die vorhandenen Chromium-Tests verwenden Mock-/Fixture-DB und prüfen kein reales Benutzer-JWT. Ohne Testdaten oder Zugriff auf ein vorhandenes geeignetes Konto ist dieser Gate nicht nachgewiesen.
- [ ] Hosting: GitHub Pages `https://duhrrom11.github.io/Helferlein` und als Repository-Homepage angegebenes Vercel `https://helferlein-ochre.vercel.app` konnten bei dieser Prüfung **nicht live über HTTPS abgerufen** werden. Das bestehende `Live GitHub Pages HTTP check`-Workflow ist zeitgesteuert bzw. deployment-getriggert und war kein Beleg einer frischen Veröffentlichung.
- [ ] Merge/Deployment **bewusst zurückgestellt**: Es fehlen authentifizierte Live-E2E- und Hosting-Nachweise. Grüne CI allein rechtfertigt keine Behauptung einer produktiven Freigabe.

## Autopilot: Live-Hosting-Gates und read-only JWT-Rollenprüfung (2026-11-10)

- [x] Auf `533136a1`: Release-Smoke `42830372286`, Vault-Sync `42830372540`, Wishlist `42830361541` und `42830372185` **success**; beide Wishlist-Läufe einschließlich Chromium-Browser.
- [x] PR #166 ist bei GitHub wieder `mergeable=true`; `mergeable_state=unstable` erfordert weiterhin Prüfung der neuen CI.
- [x] Neuer **separater Vercel-HTTPS-Gate** in `.github/workflows/live-site-http.yml`: prüft bei `workflow_dispatch` und wöchentlich vier Wishes-Routen samt HTML-/Modul-Merkmalen, unabhängig vom GitHub-Pages-Gate (Commit `7cb7844f`). Ein grüner GitHub-Pages-Check ersetzt keinen Vercel-Nachweis.
- [x] Read-only Supabase-SQL mit einer **bereits vorhandenen** `auth.users`-Identität: `SET LOCAL ROLE authenticated` und `request.jwt.claim.sub`; `auth.uid()` ist gesetzt, SELECT-Berechtigung aktiv, kein TRUNCATE, beide Listen-Tabellen weiterhin leer. `BEGIN READ ONLY` / `ROLLBACK`, keine Daten verändert.
- [ ] Diese Rollenprüfung simuliert den JWT-Claim in SQL; sie ist **kein** tatsächlicher Login mit Passwort/Session im Browser und beweist keine realen Listen-Mutationen.
- [ ] Vercel- und GitHub-Pages-Live-HTTPS-Gates erst nach echter Ausführung als bestanden deklarieren; bei aktueller Ausführung vor Deployment kann der erwartete neue Dashboard-Code fehlen.
- [ ] Merge und Deployment bleiben bis zur Bestätigung dieser Freigabevoraussetzungen gesperrt; keine Testdaten erzeugen.

### Tatsächliche Live-HTTP-Probe aus GitHub Actions (2026-11-10)

- [x] Eigenständigen Pre-Release-Workflow `.github/workflows/live-host-reachability.yml` auf Feature-Push eingerichtet (Commit `3925ad57`), ohne GitHub-Pages- und Vercel-Status zu vermischen.
- [x] **Echte HTTPS-Ergebnisse aus Runner-Logs** des Laufs `42830663858`: GitHub Pages `/` **200 OK**, GitHub Pages `/amazon-wishlist/index.html` **200 OK**; Vercel `/` **404**, Vercel `/amazon-wishlist/index.html` **404**. Workflow korrekt **failure**, nicht grüngefärbt.
- [ ] **Vercel-Hosting-Blocker**: Die im GitHub-Repository hinterlegte Homepage `https://helferlein-ochre.vercel.app` liefert tatsächlich 404. Vor Merge/Deployment Vercel-Ziel klären bzw. einen nachweislich funktionierenden Veröffentlichungsweg bestimmen. Bestehende GitHub-Pages-Erreichbarkeit beweist noch nicht, dass der neue Dashboard-Stand aus dem Feature-Branch veröffentlicht ist.
- [ ] Authentifizierte SQL-Rollenprüfung mit vorhandenem `auth.users`-Konto ohne Datenerzeugung bestanden; vollständiger echter Browser-Login mit JWT und produktiven Listenaktionen bleibt offen.
- [ ] PR #166 nicht mergen, solange der Pre-Release-Live-Hosting-Gate fehlschlägt und die authentifizierte Browserabnahme fehlt.

### CI-Testabdeckung korrigiert (2026-11-10)

- [x] **Kritische Lücke entdeckt:** `production-dashboard.integration.spec.mjs` war zwar committed, wurde aber wegen der expliziten `testMatch`-Liste in `playwright.config.mjs` **nie von Playwright ausgeführt**. Frühere grüne Browserläufe sind daher kein Nachweis dieser Produktions-HTML-Tests.
- [x] `production-dashboard.integration.spec.mjs` in `testMatch` aufgenommen (Commit `9febd2b7`). Erst ein danach vollständig grüner Chromium-Lauf bestätigt die neuen Tests einschließlich Logout und 320px-Layout.
- [ ] Auf reale Chromium-Testergebnisse nach der Änderung warten; bei Fehlern tatsächliche Joblogs auswerten und beheben.

- [x] Dauerhafte Node-Regression ergänzt, die eine versehentliche Entfernung der produktiven Chromium-Suite aus `playwright.config.mjs` verhindert (Commit `1e047e57`).
- [ ] Letzte CI auf diesem Commit einschließlich **tatsächlich ausgeführter** Produktions-HTML-Chromium-Tests bestätigen; keine Freigabe aus früheren unvollständigen Browserläufen ableiten.

## Hosting-Entscheidung: ausschließlich GitHub Pages (2026-11-10)

- [x] **Explizite Betreiberentscheidung:** Vercel wird nicht mehr verwendet. Ein Vercel-404 ist deshalb **kein Release-Blocker** mehr; es wird kein Vercel-Deployment angestrebt.
- [x] Pre-Release-HTTPS-Workflow `.github/workflows/live-host-reachability.yml` auf **GitHub Pages als einziges Hostingziel** umgestellt (Commit `ab1da67c`). Bestehende Start- und Wishes-Route müssen weiterhin real über HTTPS erreichbar sein.
- [x] Veralteten `vercel-wishes`-Job aus `.github/workflows/live-site-http.yml` entfernt (Commit `bb1d2ba3`). Der GitHub-Pages-Live-Check prüft weiterhin nach Deployment die produktiven Wishes-HTML- und JavaScript-Dateien.
- [ ] GitHub-Repository-Homepage-Metadaten zeigen möglicherweise noch die veraltete Vercel-Adresse. Bei nächster administrativer Repository-Einstellung auf `https://duhrrom11.github.io/Helferlein/` aktualisieren.
- [ ] Freigabe erfordert weiterhin vollständige CI auf dem aktuellen Commit, tatsächlich ausgeführte Chromium-Produktions-HTML-Tests, Sicherheitsprüfung und nach Merge erfolgreiche GitHub-Pages-Veröffentlichungsprüfung. Die Hostingentscheidung ersetzt diese Nachweise nicht.

## Autopilot: abschließende Freigabeprüfung nach b6e4936b (2026-11-10)

- [x] **Alle 10 GitHub-Checks auf `b6e4936b` grün**, einschließlich zweier Chromium-Browserjobs, Node, Vault, Release-Smoke, GitHub-Pages-Reachability sowie CodeQL (JavaScript/TypeScript und Actions). PR #166 war konfliktfrei.
- [x] Produktive Supabase-RLS erneut unter `BEGIN READ ONLY`, `SET LOCAL ROLE authenticated` und einem JWT-Claim eines **vorhandenen** Kontos geprüft: SELECT und notwendige INSERT-Grants vorhanden, TRUNCATE und Membership-UPDATE verweigert, beide Listen-Tabellen weiterhin leer. Keine Testdaten, keine Schreibzugriffe.
- [x] Wiederverwendbare schreibgeschützte SQL-Auditvorlage `PRODUCTION-RLS-READONLY-AUDIT.sql` hinzugefügt (Commit `fbdb60b2`). **Wichtig:** JWT-Claim-Simulation ist kein echter Supabase-Login und testet keine Schreib-Policies.
- [x] GitHub Pages ist das **einzige** freigegebene Hostingziel. Erreichbarkeitstest auf `b6e4936b` erfolgreich; Vercel wird nicht mehr verwendet.
- [ ] **Echter authentifizierter Browser-End-to-End-Test mit bestehendem Konto und vollständigem Listen-Lebenszyklus ist weiterhin nicht nachgewiesen.** Ohne Benutzerzugriff/Session und ohne neue Testdaten ist er nicht ersetzbar. Dieser Gate darf nicht als bestanden markiert werden.
- [ ] Neue CI auf dem aktuellen Commit vollständig abwarten. Merge und GitHub-Pages-Deployment bleiben bis zur nachgewiesenen authentifizierten Integration gesperrt; grüner CI-Status allein genügt nicht.

## Autopilot: sichere Auth-Integration und echtes Session-Smoke-Gate (2026-11-10)

- [x] Auf `1e1ec277` waren Node/Chromium, Vault-Sync, Release-Smoke und GitHub-Pages-Reachability erfolgreich. CodeQL wurde beim Erstcheck noch ausgeführt und separat abgefragt.
- [x] **Auth-Lifecycle-Fehler korrigiert:** `auth()` aktualisiert das private Listen-Dashboard nun direkt vor dem optionalen Profilabruf, auch bei Login, Logout und Benutzerwechsel; Auth-Listener und Initialisierung vermeiden doppelte Refreshs (Commit `b70a60bd`). Statischer Regressionstest (Commit `1a3867dc`).
- [x] **Opt-in echter Live-Browsertest** `authenticated-live-smoke.mjs` erstellt (Commit `4abb4663`): Playwright meldet ein **bereits existierendes Konto** über die produktive GitHub-Pages-Oberfläche an, prüft das private Dashboard und meldet sich ab. Keine Listen- oder Wunsch-Mutationen, keine Screenshots, keine gespeicherten Sessions.
- [x] Manuell auslösbarer GitHub-Actions-Workflow `.github/workflows/wishes-authenticated-live.yml` eingerichtet (Commit `85e24d5c`): benötigt zwei als GitHub Actions Secrets bereitgestellte Werte `WISHES_EXISTING_USER_EMAIL` und `WISHES_EXISTING_USER_PASSWORD`; bei fehlenden Secrets **FAIL**, niemals stilles SKIP oder falsche Freigabe. Die Zugangsdaten werden nicht in Logs ausgegeben.
- [x] Node-Quelltext-Regression stellt sicher, dass der Live-Smoke keine schreibenden Listenaktionen ausführt (Commits `aaf2216c`, `2683795d`).
- [ ] **Manueller Live-Smoke noch nicht ausgeführt**: Vor Merge fehlt ein tatsächlich veröffentlichtes Dashboard und ein autorisiertes vorhandenes Konto mit bereitgestellten Secrets. Ohne diese Bedingungen kann kein echter Session-Erfolg behauptet werden.
- [ ] Vollständige CI/CodeQL auf dem letzten Commit abwarten. GitHub Pages bleibt das einzige Hostingziel. Kein Merge/Deployment bei offenen Auth- oder Sicherheits-Gates.
