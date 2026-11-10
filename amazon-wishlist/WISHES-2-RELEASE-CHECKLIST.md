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
