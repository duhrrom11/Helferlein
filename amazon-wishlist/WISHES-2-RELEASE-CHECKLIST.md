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
