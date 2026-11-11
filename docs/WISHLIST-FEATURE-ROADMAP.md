## Entwicklungsfortschritt – 11.11.2026 (Konflikterkennung bei paralleler Wunschbearbeitung)

- **Nachgewiesener Lost-Update-Pfad:** Der Wunsch-Editor schrieb `note`, `priority` und `visibility` ohne Abgleich des beim Öffnen geladenen Stands. Parallele Bearbeitungen in zwei Tabs konnten dadurch Änderungen unbemerkt überschreiben.
- **Korrektur:** Beim Öffnen des Editors wird eine Baseline aus Wunsch-ID, Notiz, Priorität und Sichtbarkeit gespeichert. Der Update-Query vergleicht die ursprünglichen Werte mit `.eq(...)` bzw. `.is(...,null)` und erkennt mit `.select('id')` einen Konflikt oder entfernten Wunsch. Der Editor-Reset verwirft die Baseline. Code: `5e0ea1d41815baddedfb556f567e9993dbdd2784`.
- **Grenzen:** Der Schutz gilt für diese drei Datenbankfelder; weitere Wunschmetadaten, Listenzuordnungen und Refresh-Races sind gesondert zu prüfen. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Konflikterkennung bei paralleler Listenbearbeitung)

- **Nachgewiesener Lost-Update-Pfad:** Das Bearbeitungsformular schrieb Titel, Beschreibung, Symbol, Farbe, Sichtbarkeit und Titelbild ohne Abgleich des beim Öffnen angezeigten Datenstands. Zwei Tabs konnten so die jeweils anderen Änderungen still überschreiben.
- **Korrektur:** `openEditor()` merkt sich die sechs ursprünglichen Feldwerte. Der Update-Query vergleicht alle sechs Werte mittels `.eq(...)` bzw. `.is(...,null)` und prüft mit `.select('id')`, ob eine Zeile aktualisiert wurde. Bei abweichendem Stand wird ein Konflikt gemeldet und kein stilles Überschreiben durchgeführt. Baseline wird bei Abbruch und Konto-Reset verworfen. Code: `20ff8877a770cbda583fcbd0d3c936c3fdd70651`.
- **Grenzen:** Der Konfliktschutz deckt die sechs Editorfelder ab, nicht alle Listen- oder Wunschmutationen. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Archivstatus-Konflikte zwischen Tabs)

- **Nachgewiesener Konfliktpfad:** Archivieren/Reaktivieren setzte `wishlist_lists.archived` anhand eines zuvor geladenen Kartenstatus, ohne den ursprünglichen Archivwert in der Datenbankbedingung abzugleichen. Eine parallele Änderung in einem anderen Tab konnte so unbemerkt überschrieben werden.
- **Korrektur:** Das Update verlangt nun zusätzlich `.eq('archived',list.archived)` und fordert per `.select('id')` die aktualisierten Zeilen an. Bei null Treffern wird ein Konflikthinweis angezeigt. Fehler werden für das noch aktive Ursprungskonto abgefangen. Code: `f11ee0b767368fa2aa64f4c0e6e2254352982dde`.
- **Grenzen:** Weitere Listenfelder und Wunschänderungen benötigen eigene Konfliktprüfung; keine allgemeine tabübergreifende Sperre. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listenzuordnung vor Insert gegen Kontowechsel absichern)

- **Nachgewiesene Lücke:** `assignWish(wishId,listId,uid)` führte den Insert in `wishlist_list_items` ohne Prüfung der aktuellen Konto-ID aus. Nach einem Kontowechsel zwischen Wunsch-Neuanlage und Listenzuordnung konnte dadurch ein verspäteter Zuordnungsversuch für das ursprüngliche Konto gestartet werden.
- **Korrektur:** `assignWish` vergleicht vor dem Insert `getUser()?.id` mit der übergebenen ursprünglichen Konto-ID und startet bei Abweichung keine Datenbankoperation. Code: `9c28194d556c391907cebd284662093768da7db8`.
- **Grenzen:** Bereits gestartete Datenbankoperationen werden nicht abgebrochen. Parallele Listenmutationen, tabübergreifende Konflikte und weitere Speicher-Races bleiben offen. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (überholte Speicherabschlüsse nach Kontowechsel)

- **Nachgewiesene Race Condition:** Der gemeinsame `run()`-Wrapper aktivierte `saveWish` im `finally`, wenn die aktuelle Konto-ID der Start-ID entsprach. Nach einem Wechsel A → B → A konnte dadurch ein alter Speichervorgang die Schaltfläche während eines neueren Speichervorgangs vorzeitig aktivieren.
- **Korrektur:** `wishSaveRunGeneration` wird bei jedem Wunsch-Speicherstart und bei erkanntem Kontowechsel erhöht. Der `finally`-Block darf die Speicherschaltfläche nur bei unveränderter Konto-ID und identischer Generation aktivieren. Code: `23d115547e316e9977efef5a94e1afae36731080`.
- **Grenzen:** Bereits gestartete Datenbankoperationen werden nicht abgebrochen. Weitere parallele Listenmutationen und Datenbank-Konflikte benötigen Prüfung. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Speichern nach Kontowechsel wieder freigeben)

- **Nachgewiesener UI-Fehler:** Der gemeinsame `run()`-Wrapper deaktiviert während `saveWish` die Speicherschaltfläche. Sein `finally` aktiviert diese bei gewechselter Konto-ID absichtlich nicht mehr. `auth()` setzte zwar den Editor, aber nicht `saveWish.disabled` zurück. Dadurch konnte das neue Konto dauerhaft keine Wünsche speichern.
- **Korrektur:** Bei erkanntem Kontowechsel aktiviert `auth()` unmittelbar nach `resetWishEditor()` die Schaltfläche `saveWish` wieder. Der alte Speichervorgang bleibt für UI-Rückmeldungen an die ursprüngliche Konto-ID gebunden. Code: `4c64bd2af7c0a0dd7e2f85e93b585b4db3074c79`.
- **Grenzen:** Bereits laufende Datenbankoperationen werden nicht abgebrochen. Weitere mögliche Parallelitätskonflikte und asynchrone Listenmutationen bleiben zu prüfen. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Kontowechsel während Wunsch-Listenzuordnung)

- **Nachgewiesene Race Condition:** Nach erfolgreicher Wunsch-Neuanlage wurde bei gewählter Zielliste `await dashboard.assignWish(...)` ausgeführt. Danach konnte die Routine ohne erneute Kontoprüfung den Editor zurücksetzen und Folgeaktualisierungen auslösen, obwohl während der asynchronen Listenzuordnung das Konto gewechselt hatte.
- **Korrektur:** Direkt nach Abschluss der optionalen Listenzuordnung wird `user?.id` erneut mit der ursprünglichen Konto-ID verglichen. Bei Kontowechsel endet der alte Speichervorgang vor Editor-Reset und Folgeaktualisierungen. Code: `1dd4c863111109f90e915d974302b38171684a7c`.
- **Grenzen:** Bereits bestätigte Datenbankänderungen bleiben bestehen. Gleichzeitige Mutationen und die restlichen Konto-/Auth-Races sind weiter zu prüfen. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunsch-Speichern: Folgeaktionen bei Kontowechsel)

- **Nachgewiesener Fehler:** Beim Bearbeiten und Anlegen eines Wunsches erfolgte nach bestätigter Datenbankänderung `await refreshFeed(); await dashboard.refresh();` ohne Kontoprüfung dazwischen. Ein Kontowechsel während der Feed-Aktualisierung konnte so noch eine alte Listenaktualisierung starten und anschließend eine irreführende Fehlermeldung `Sitzung hat sich geändert` auslösen, obwohl die Datenbankänderung bereits abgeschlossen war.
- **Korrektur:** Beide Speicherpfade prüfen nach `refreshFeed()` und nach `dashboard.refresh()` erneut die ursprüngliche Konto-ID. Bei Kontowechsel werden alte Folgeaktionen und Rückmeldungen ohne irreführende Fehlermeldung beendet. Code: `32595a531b4fd228c17c92ed95c3cf44ca21c24c`.
- **Grenzen:** Bereits bestätigte Datenbankänderungen bleiben bestehen; nicht alle Zwischenphasen und parallel laufenden Operationen sind damit abgedeckt. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunschlöschung bei Kontowechsel)

- **Nachgewiesene irreführende Fehlermeldung:** Die asynchrone Wunschlöschung warf nach erfolgreichem Datenbank-Delete bei einem zwischenzeitlichen Kontowechsel `Sitzung hat sich geändert`. Dadurch konnte eine bereits abgeschlossene Löschung fälschlich als fehlgeschlagen erscheinen.
- **Korrektur:** Nach bestätigtem Delete wird bei einem Kontowechsel die alte Routine ohne Fehlermeldung beendet. Nach `refreshFeed()` und nach `dashboard.refresh()` wird die Kontozugehörigkeit jeweils erneut geprüft; weitere alte Folgeaktionen und Erfolgsmeldungen entfallen bei Kontowechsel. Code: `1ba85a90a27cd703e543b1ba72f088d5f8df0141`.
- **Grenzen:** Die bereits gestartete Datenbanklöschung wird nicht abgebrochen. Weitere asynchrone Mutationen und Feed-Races benötigen Prüfung. Statische Codeprüfung ohne authentifizierten Browser-E2E-Test.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (überholte Authentifizierungsereignisse)

- **Nachgewiesene Race Condition:** Der `onAuthStateChange`-Handler rief verzögert `auth()` und anschließend `refreshFeed()` auf. Bei rasch aufeinanderfolgenden Authentifizierungsereignissen konnten ältere Handler trotz neuerer Ereignisse die Feed-Aktualisierung starten oder verspätete Fehlermeldungen ausgeben.
- **Korrektur:** `authEventGeneration` kennzeichnet den jüngsten Ereignis-Handler. Vor dem asynchronen Aufruf und nach `auth()` werden überholte Handler verworfen; Fehlermeldungen werden nur für den jüngsten Handler angezeigt. Code: `4d0aca79e1320dfa42cd10451940f5c557f1c31e`.
- **Grenzen:** Bereits laufende Feed- und Datenbankabfragen werden hierdurch nicht aktiv abgebrochen; ihre eigenen Generation- und Konto-Prüfungen bleiben entscheidend. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunschdetaildialog bei Neuladen und Kontowechsel)

- **Nachgewiesener veralteter UI-Zustand:** Der Wunschdetaildialog blieb beim Start eines neuen Dashboard-Ladevorgangs geöffnet, obwohl die bisherige Wunsch- und Zuordnungsansicht invalidiert wurde. Die Kategorie-Konflikt-Baseline und Wunschdetail-ID konnten dabei veraltet bleiben.
- **Korrektur:** `load()` schließt vor der asynchronen Datenabfrage einen offenen Wunschdetaildialog und löscht `detailWishId` sowie `detailCategoryBaseline`. `reset()` bereinigt dieselben Zustände bei der Rücksetzung der Listenverwaltung. Code: `bc9543f6b2570013c14707f176bbc20578873e19`.
- **Grenzen:** Bereits laufende asynchrone Änderungen und sämtliche Authentifizierungsereignisse sind damit nicht vollständig geprüft; weitere statische und Browser-E2E-Prüfung erforderlich. Kein authentifizierter Browser-E2E-Test ausgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Konflikterkennung bei Kategorien in mehreren Tabs)

- **Nachgewiesener Konflikt:** Ein geöffneter Wunschdetaildialog konnte eine im anderen Browser-Tab zwischenzeitlich geänderte Kategorie durch Speichern einer veralteten Auswahl überschreiben.
- **Korrektur:** Beim Öffnen der Wunschdetails wird die ursprüngliche Kategorie in `detailCategoryBaseline` gespeichert. Bei unverändertem Dialogfeld wird die Baseline durch Storage-Events synchronisiert. `saveCategory()` vergleicht vor dem Schreiben den aktuell gespeicherten Wert mit dieser Baseline; bei Abweichung wird die Änderung mit einem Konflikthinweis abgebrochen. Code: `f2f9624109bc0b1559d63fcde68fd43f14f76d48`.
- **Grenzen:** Der Vergleich ist keine atomare Cross-Tab-Sperre. Kontowechsel und andere Detaildialog-Aktionen müssen weiter untersucht werden. Statische Quellcodeprüfung ohne authentifizierten Browser-E2E-Test.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (offene Wunschdetails: Kategorie-Synchronisierung)

- **Nachgewiesener veralteter Dialogzustand:** Der `storage`-Listener aktualisierte `wishCategories` und die Wunschkarten, ließ aber das Kategorie-Auswahlfeld eines bereits geöffneten Wunschdetaildialogs unverändert. Änderungen aus anderen Tabs waren im offenen Formular daher nicht sichtbar.
- **Korrektur:** Vor der Aktualisierung wird geprüft, ob das Kategorie-Auswahlfeld noch dem bisher angezeigten Wert entspricht. Nur bei unveränderter Auswahl wird es nach dem erneuten Einlesen aus `localStorage` auf den aktuellen Wert gesetzt. Bereits im Dialog vorgenommene, ungespeicherte Auswahländerungen werden nicht überschrieben. Code: `427b762a66d5d1cd02f8a8b0319037fac2038841`.
- **Grenzen:** Konflikte bei gleichzeitigen Änderungen derselben Kategorie können weiterhin eine spätere Speicherung des aktuellen Tabs bevorzugen. Kontowechsel und Dialog-Races benötigen weitere Prüfung. Statische Quellcodeprüfung ohne authentifizierten Browser-E2E-Test.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Tab-Synchronisierung lokaler Wunschlisten-Daten)

- **Nachgewiesene veraltete Ansichten:** Favoriten, Kategorien und Markierungen wurden in der Listenverwaltung beim Laden aus `localStorage` übernommen, Änderungen anderer bereits geöffneter Browser-Tabs lösten jedoch keine Aktualisierung der laufenden Ansicht aus.
- **Korrektur:** Ein `storage`-Listener verarbeitet Änderungen an den drei benutzerbezogenen Schlüsseln. Bei aktuell geladenem und authentifiziertem Konto sowie vollständig geladenen Zuordnungen werden Favoriten, Kategorien oder Markierungen erneut eingelesen und die betroffenen Ansichten aktualisiert. Ereignisse für andere Konten werden ignoriert. Code: `86985ff887026b780647652d74caa96ecb846c51`.
- **Grenzen:** Das Storage-Event ist keine atomare Transaktion; nahezu gleichzeitige Schreibvorgänge können weiterhin kollidieren. Beschädigte externe Daten werden von den bisherigen Lesefunktionen für die Anzeige als leer behandelt, beim Schreiben aber nicht überschrieben. Kontowechsel und Dialogzustände verdienen weitere E2E-Prüfung. Statische Quellcodeprüfung ohne authentifizierten Browser-E2E-Test.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Kategorien und Markierungen: Mehrtab-Betrieb und beschädigter Speicher)

- **Nachgewiesenes Risiko:** `setMarker()` und `saveCategory()` schrieben jeweils die im aktuellen Tab zwischengespeicherten vollständigen Objekte `wishMarkers` bzw. `wishCategories`. Änderungen anderer Tabs konnten damit überschrieben werden. Beschädigte oder nicht lesbare localStorage-Inhalte wurden beim initialen Laden als leere Objekte dargestellt und beim nächsten Speichern ebenfalls überschrieben.
- **Korrektur:** Beide Handler lesen vor dem Schreiben die aktuellen Storage-Inhalte erneut, prüfen die JSON-Struktur und erlaubten Werte und ändern nur den ausgewählten Wunsch. Bei beschädigten oder nicht lesbaren Daten wird nicht überschrieben. Der lokale UI-Zustand wird erst nach erfolgreichem `setItem` übernommen. Code: `6c07308b6dae83381f7344a52dbfc4efa133fd11`.
- **Grenzen:** Gleichzeitige Read-Modify-Write-Aktionen aus verschiedenen Tabs sind weiterhin nicht atomar; eine automatische Storage-Event-Synchronisierung der geöffneten Ansichten wurde nicht ergänzt. Kontowechsel und UI-Aktualisierung bleiben weiter zu prüfen. Statische Codeprüfung ohne authentifizierten Browser-E2E-Test.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listenfavoriten: andere Browser-Tabs und beschädigte localStorage-Daten)

- **Nachgewiesenes Risiko:** Favoriten-Toggles basierten auf dem im jeweiligen Tab zwischengespeicherten `favoriteIds`. Änderungen aus einem zweiten Tab konnten bei der nächsten Aktion mit einem veralteten vollständigen Favoriten-Set überschrieben werden.
- **Korrektur:** `writeFavorites(id,listId)` liest vor jeder Favoritenänderung den aktuellen gespeicherten Zustand, prüft die JSON-Struktur und toggelt nur die angeforderte Listen-ID. Erst nach erfolgreichem `localStorage.setItem` wird der neue Favoritenzustand im aktuellen Tab übernommen. Ungültige oder nicht lesbare Daten werden nicht mit einer leeren Liste überschrieben. Code: `eb676514d1cd966995682a577edf29c5ecb9153e`.
- **Grenzen:** Read-Modify-Write über `localStorage` ist zwischen gleichzeitig schreibenden Tabs nicht atomar. Kategorie- und Markierungsänderungen, Tab-Synchronisation sowie Kontowechsel benötigen weitere Prüfung. Statische Codeprüfung ohne authentifizierten Browser-E2E-Test.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (lokale Wunsch-Zusatzdaten: beschädigte Speicherinhalte nicht überschreiben)

- **Nachgewiesenes Datenverlustrisiko:** `saveWishExtras()` ersetzte bei `localStorage.getItem`- oder JSON-Parsefehlern die bisherige Datenstruktur stillschweigend durch `{}` und konnte beim nächsten `setItem` vorhandene lokale Zusatzdaten überschreiben. Auch JSON-Werte mit unerwarteter Struktur wurden nicht ausreichend validiert.
- **Korrektur:** Ein tatsächlich fehlender Storage-Eintrag (`null`) wird weiterhin als neue leere Sammlung behandelt. Bei Lesefehlern, ungültigem JSON sowie Nicht-Objekten oder Arrays bricht das lokale Schreiben mit `false` ab, ohne die bestehende Sammlung zu überschreiben. Die bereits eingeführte Teil-Erfolgsmeldung nach erfolgreichem Datenbank-Commit greift weiterhin. Code: `71bd8ff08d5f36265ac10b8c1b1252063f952057`.
- **Grenzen:** Andere lokale Speicherpfade und parallele Browser-Tabs sind noch nicht umfassend abgesichert. Keine authentifizierten Browser-E2E-Tests. Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listenfavoriten: lokaler Speicherfehler darf UI nicht verändern)

- **Nachgewiesener Fehler:** Die Favoriten-Schaltfläche änderte `favoriteIds` vor `localStorage.setItem`. Bei verweigertem oder vollem Browserspeicher blieb die Änderung im Arbeitsspeicher sichtbar, obwohl sie nicht dauerhaft gespeichert wurde.
- **Korrektur:** Der Handler berechnet `nextFavorites` als Kopie. `writeFavorites(id,next)` gibt den Erfolg des Schreibens zurück. Nur nach erfolgreichem `setItem` werden `favoriteIds` übernommen und die Favoritenansicht neu gerendert; andernfalls bleibt der vorherige Zustand erhalten und eine Fehlermeldung erscheint. Code: `60738616fb61f0a0dbf83507e521d411d1acb9e4`.
- **Weitere Prüfung:** Kategorien und Markierungen schreiben bereits vor der Änderung des In-Memory-Zustands in `localStorage`. Die Liste zuletzt geöffneter Listen wird bewusst auch ohne dauerhafte Speicherung für die laufende Sitzung aktualisiert und warnt bei Speicherfehlern. Weitere Race Conditions und Speicherpfade bleiben prüfbar.
- **Prüfgrenzen:** Statische Codeprüfung ohne authentifizierten Browser-E2E-Test. Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (lokale Wunsch-Zusatzdaten nach erfolgreichem Datenbank-Commit)

- **Nachgewiesener Teilfehler:** `saveWishExtras()` warf bei `localStorage.setItem`-Fehlern eine Exception, obwohl der vorausgehende `wishlist_wishes.insert/update` bereits erfolgreich abgeschlossen war. Dadurch erschien der gesamte Speichervorgang als fehlgeschlagen und konnte zu unnötigen erneuten Datenbank-Schreibversuchen verleiten.
- **Korrektur:** `saveWishExtras()` meldet den Erfolg des lokalen Schreibens nun als booleschen Wert. Beide Wunsch-Speicherpfade schließen den Datenbank-Erfolg weiterhin ab, aktualisieren die Ansicht und melden bei fehlgeschlagenem lokalen Schreiben ausdrücklich den Teilfehler. Bei Neuanlage wird zum Bearbeiten des bestehenden Wunsches statt zur erneuten Anlage geraten. Eine fehlgeschlagene Listenzuordnung wird unabhängig davon angezeigt. Code: `6217f971c7c2bb391d515c7c7f0960690842384d`.
- **Grenzen:** Die lokalen Zusatzdaten bleiben bei Speicherausfall verloren; keine atomare Transaktion zwischen Datenbank und Browser-localStorage. Statische Quellcodeprüfung ohne authentifizierten Browser-E2E-Test.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listen-Duplizierung: Unterbrechung zwischen Zuordnungs-Batches)

- **Nachgewiesener Teilfehler:** Bei der mehrstufigen Listen-Duplizierung führten `if(!current())return`-Abbrüche vor späteren Zuordnungs-Batches oder nach dem letzten Batch zu stillen Teilkopien. Bereits erfolgreich gespeicherte Zuordnungen blieben bestehen, ohne dass der Benutzer die Anzahl sah.
- **Korrektur:** Der gemeinsame asynchrone Abschluss `reportInterruptedCopy()` lädt bei unverändert aktivem Konto die Listen neu und meldet anschließend die Zahl der bereits übertragenen Zuordnungen. Er wird nach Anlage der Kopie, zwischen den Batches und vor dem abschließenden Refresh bei veraltetem Kontext aufgerufen. Code: `ba4ddbfc21bd3474182547653e6cc719516462bf`.
- **Lokale Speicherpfade geprüft:** `saveWishExtras()` kann nach erfolgreichem Datenbank-Schreibauftrag an `localStorage.setItem` scheitern; Datenbank und Browser-Speicher sind nicht atomar. Keine ungesicherte automatische Wiederholung eingebaut; weitere Korrektur der Teilfehler-Rückmeldung erforderlich.
- **Prüfgrenzen:** Statische Codeprüfung ohne authentifizierten Browser-E2E-Test. Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Archivstatus und teilweise Listen-Kopien)

- **Archivierung/Reaktivierung:** Nach erfolgreichem `wishlist_lists.update({archived:...})` brach der Handler bei geänderter `loadGeneration` vor dem Dashboard-Refresh ab. Jetzt wird bei weiterhin gleichem geladenen Konto auch nach zwischenzeitlichem Refresh neu geladen. Code: `0c5491ece99d472eccefa6e68109ef429a7214a4`.
- **Teilweise Listen-Duplizierung:** Wenn die Kopie bereits per Insert angelegt war, aber vor der ersten Übernahme von Wunschzuordnungen eine Ladegeneration wechselte, endete die Operation bisher still. Der Handler lädt jetzt bei weiterhin aktivem ursprünglichem Konto die Listen neu und meldet ausdrücklich, dass die Kopie ohne Zuordnungen angelegt wurde und geprüft werden muss. Die Meldung wird erst nach dem Reload gesetzt, damit dieser sie nicht überschreibt. Code: `485ffd4ce5cc43a6e42710c8d06ffc8da68fde66`, Nachkorrektur `7c439d6678abbe282e3dfb7d40e7d7651ee2722d`.
- **Verbleibende Risiken:** Die Duplizierung bleibt eine mehrstufige, nicht atomare Operation. Bereits kopierte Zuordnungen können bei späterem Abbruch teilweise bestehen bleiben. Lokale Speicherfehler wurden in dieser Runde nicht vollständig geprüft. Keine authentifizierten Browser-E2E-Tests.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listenlöschung: erfolgreichen Delete trotz zwischenzeitlichem Refresh abschließen)

- **Nachgewiesener Race-Condition-Pfad:** Der Lösch-Handler verwarf nach erfolgreichem `wishlist_lists.delete()` den abschließenden Dashboard-Refresh, sobald `loadGeneration` zwischenzeitlich geändert wurde. Dadurch konnte die gelöschte Liste in der lokalen Ansicht verbleiben.
- **Korrektur:** Nach erfolgreichem Delete wird der Abschluss nur noch bei Kontowechsel bzw. abweichendem geladenen Konto unterdrückt. Eine geänderte Ladegeneration allein verhindert die Aktualisierung nicht mehr.
- **Prüfgrenzen:** Statische Quellcodeprüfung ohne authentifizierten Browser-E2E-Test. Duplizierung, Archivierung und lokale Speicherfehler sind nicht abschließend geprüft.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listenbearbeitung: erfolgreichen Save trotz Refresh abschließen)

- **Nachgewiesener Race-Condition-Pfad:** Der `editListForm`-Handler verwarf nach einem erfolgreichen `wishlist_lists.update(...)` den Abschluss, wenn sich `loadGeneration` während des Schreibauftrags geändert hatte. Dadurch konnte die Liste bereits gespeichert sein, während die Bearbeitungsansicht offen blieb und keine abschließende Aktualisierung erfolgte.
- **Korrektur:** Nach erfolgreichem Update wird nun geprüft, ob das ursprüngliche Konto noch geladen ist und dieselbe Listen-ID im Bearbeitungsformular steht. Ein zwischenzeitlicher Refresh allein verhindert den Abschluss nicht mehr; anschließend wird die Liste wie bisher neu geladen.
- **Grenzen:** Statische Codeprüfung ohne authentifizierten Browser-E2E-Test; keine serverseitige Idempotenzgarantie. Weitere parallele Aktionen und lokale Speicherfehler sind nicht abschließend geprüft.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listen-Neuanlage: erfolgreiche Inserts trotz zwischenzeitlichem Refresh abschließen)

- **Nachgewiesener Duplikat-Risikopfad:** Nach erfolgreichem `wishlist_lists.insert(payload)` brach der Erstellen-Handler bei jeder Änderung von `loadGeneration` ab. Eine zwischenzeitliche Dashboard-Aktualisierung konnte daher dazu führen, dass die Liste bereits in der Datenbank existierte, der unveränderte Formularinhalt aber stehen blieb und eine erneute Anlage möglich war.
- **Korrektur:** Nach erfolgreichem Insert wird der Abschluss nicht mehr allein wegen einer neuen Ladegeneration verworfen. Stattdessen wird geprüft, ob das ursprüngliche Konto noch aktiv und im Dashboard geladen ist. Dann werden unveränderte Eingaben geleert und die Listen aktualisiert. Ein Kontowechsel verhindert weiterhin Änderungen an fremdem UI-Zustand.
- **Grenzen:** Keine serverseitige Idempotenzgarantie für unabhängige oder geräteübergreifende Anlageversuche. Statische Codeprüfung ohne authentifizierten Browser-E2E-Test; keine Supabase-Schreibprobe.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listen-Neuanlage: Fokus nach asynchronem Speichern)

- **Nachgewiesener Fokuspfad:** Der `createList`-Handler deaktivierte beim Start des Datenbank-Schreibauftrags die fokussierte Erstellen-Schaltfläche und aktivierte sie im `finally` wieder, ohne den Tastaturfokus zurückzuführen.
- **Korrektur:** Der Handler merkt sich den ursprünglichen Fokus. Nach Abschluss wird der Button nur bei unverändert geladenem Konto reaktiviert und der Fokus nur dann zurückgesetzt, wenn er zuvor auf dem Button lag und aktuell kein anderes Bedienelement fokussiert ist.
- **Prüfgrenzen:** Statische Quellcodeprüfung und GitHub-Veröffentlichung; kein authentifizierter Browser-E2E-Test. Weitere parallele Aktionen und lokale Speicherfehler sind nicht abschließend geprüft.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunschformular: Erfolgsmeldung nach eigenem Reset)

- **Nachgewiesener Folgefehler:** Die zuvor eingeführte Prüfung der `wishEditorRevision` vor einer asynchronen Erfolgsmeldung unterdrückte auch die reguläre Erfolgsmeldung nach erfolgreichem Speichern. Grund: `resetWishEditor()` erhöht die Revision selbst, bevor die nachfolgenden Refreshes und die Erfolgsprüfung ausgeführt werden.
- **Korrektur:** Der Speicherpfad erfasst `completionRevision` und aktualisiert diesen Wert nur beim eigenen, revisionsgeschützten Editor-Reset. Die abschließende Erfolgsmeldung prüft gegen diesen Abschlussstand; spätere Benutzereingaben bleiben weiterhin erkennbar. Dies gilt für Neuanlage und Bearbeitung.
- **Prüfgrenzen:** Statische Quellcodeprüfung und GitHub-Veröffentlichung, kein authentifizierter Browser-E2E-Test. Keine Aussage über atomare Speicherung zwischen Supabase und Browser-localStorage.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunschformular: Erfolgsmeldung an Eingaberevision binden)

- **Nachgewiesener Race-Condition-Pfad:** Die asynchronen Speicherpfade für Wunsch-Neuanlage und Wunschbearbeitung prüften nach `refreshFeed()` und `dashboard.refresh()` bisher zwar Konto und Bearbeitungs-Wunsch, nicht aber die zwischenzeitlich geänderte `wishEditorRevision`. Eine ältere Speicherantwort konnte daher „Wunsch gespeichert“ melden, obwohl neue Eingaben noch nicht gespeichert waren.
- **Korrektur:** Beide Erfolgsmeldungen werden jetzt nur ausgegeben, wenn die beim Start erfasste Editorrevision noch aktuell ist. Die vorhandene Prüfung auf einen inzwischen anderen Bearbeitungswunsch bleibt erhalten.
- **Prüfgrenzen:** Statische Quellcodeprüfung und GitHub-Veröffentlichung. Keine Browser-E2E-Prüfung, keine Supabase-Schreibprobe; laufende Datenbankoperationen werden durch die Rückmeldungsprüfung nicht abgebrochen.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunschformular: veraltete Fehlerantworten nach Kontextwechsel)

- **Nachgewiesener Race-Condition-Pfad:** Der gemeinsame asynchrone `run`-Handler meldete Fehler des Wunsch-Speichervorgangs bislang auch dann, wenn während des Wartens ein anderer Wunsch geöffnet, das Formular verändert oder das Konto gewechselt wurde. Dadurch konnten Fehlermeldungen eines alten Vorgangs in einer neuen Bearbeitung erscheinen.
- **Korrektur:** Beim Start werden Konto-ID, Bearbeitungs-Wunsch-ID und Editorrevision erfasst. Ein Fehler des Wunsch-Speichervorgangs wird nur dann im Status und Formular angezeigt, wenn alle drei Werte noch passen. Das erneute Aktivieren des Speichern-Buttons erfolgt bei diesem Vorgang nur für dasselbe Konto.
- **Grenzen:** Der Handler verhindert keine bereits gestarteten Datenbankänderungen und ersetzt keine serverseitige Transaktions- oder Idempotenzabsicherung. Ein authentifizierter Browser-E2E-Test wurde nicht durchgeführt.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunschformular: Zusatzfeld-Revisionen und verspätete Erfolgsmeldungen)

- **Nachgewiesene Versionslücke:** `wishEditorRevision` wurde bisher nur bei URL, Titel, Notiz, Priorität und Sichtbarkeit erhöht. Änderungen an Produktbild, Zielpreis, Menge oder Status konnten während eines laufenden Speicherauftrags erfolgen, ohne die Versionsprüfung für das anschließende Zurücksetzen des Editors auszulösen. Jetzt erhöhen auch diese vier Zusatzfelder bei `input` und `change` die Revision.
- **Verspätete Erfolgsmeldungen:** Nach `refreshFeed()` und `dashboard.refresh()` prüft der Speichervorgang jetzt zusätzlich, ob inzwischen die Bearbeitung eines anderen Wunsches geöffnet wurde. In diesem Fall wird die alte Erfolgsmeldung nicht in die neue Bearbeitung geschrieben.
- **Grenzen:** Ein lokaler Speicherfehler nach erfolgreichem Datenbank-Commit kann weiterhin eine partielle Speicherung verursachen. Die neuen Prüfungen ersetzen keine atomare Datenbanktransaktion und keine authentifizierten Browser-Tests.
- **Produktionsschutz:** Nur GitHub-Code und Roadmap geändert; keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunschformular: Zusatzdaten vor Datenbankänderungen validieren)

- **Nachgewiesener partieller Speicherfehler:** In `app.mjs` wurden zusätzliche Wunschangaben (HTTPS-Produktbild, Zielpreis, Menge, Status) erst in `saveWishExtras` geprüft, nachdem die Wunschänderung bereits in Supabase gespeichert war. Ungültige Eingaben konnten dadurch nach einem erfolgreichen Datenbank-Schreibauftrag einen Formularfehler auslösen.
- **Korrektur:** `readValidatedWishExtras()` prüft und erfasst alle Zusatzangaben vor der ersten Datenbankänderung. `saveWishExtras(owner,id,extras)` verwendet den erfassten Stand statt nach asynchronen Schritten erneut aktuelle Formularfelder auszulesen.
- **Verbleibende Grenzen:** Die lokalen Zusatzdaten werden weiterhin getrennt von der Datenbank gespeichert; Fehler bei `localStorage.setItem` können weiterhin zu einer partiellen Speicherung führen. Ein vollständig atomarer Commit über Datenbank und Browserspeicher ist damit nicht möglich.
- **Prüfumfang:** Statische Codeprüfung und GitHub-Veröffentlichung, kein authentifizierter Browser-E2E-Test und keine produktive Supabase-Schreibprobe.
- **Produktionsschutz:** Keine Supabase-Produktivdaten geändert und keine Testdatensätze angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Wunschformular und Listen-Neuanlage: asynchrone Sitzungsgrenzen)

- **Wunsch-Neuanlage:** Die im Listen-Dashboard ausgewählte Zielliste wird nun beim Start des Speichervorgangs erfasst. Vorher wurde `dashboard.selectedList()` erst nach den Produkt- und Wunschdatenbankanfragen gelesen; ein zwischenzeitlicher Listenwechsel konnte die Zuordnung unbemerkt auf eine andere Liste umlenken.
- **Wunschbearbeitung:** Nach der Datenbankantwort wird die Konto-ID geprüft, bevor `saveWishExtras` zusätzliche lokale Wunschinformationen schreibt. Damit wird der bisherige lokale Schreibpfad bei einer verspäteten Antwort nach Kontowechsel unterbunden.
- **Listen-Neuanlage:** Die Speichern-Schaltfläche wird im `finally` nur für das weiterhin geladene Konto entsperrt. Ein während des Speicherns ausgelöster eigener Listen-Refresh darf die Entsperrung nicht verhindern; deshalb wird hierfür bewusst nicht die alte Ladegeneration verlangt.
- **Prüfgrenzen:** Statische Codeprüfung und GitHub-Veröffentlichung; keine authentifizierten Browser-E2E-Tests und keine Supabase-Schreibprobe. Weitere Formular- und Listenaktionen bleiben separat zu prüfen.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listenformular: konsistenter Speicherstand und Sitzungsgrenzen)

- **Asynchroner Bearbeitungs-Speicherpfad:** In `lists-dashboard.mjs` werden Symbol und Farbe der bearbeiteten Liste jetzt vor dem Speichervorgang zusammen mit Titel, Beschreibung, Sichtbarkeit und Bildadresse erfasst. Die Update-Nutzlast verwendet ausschließlich diesen erfassten Stand statt spätere Formularwerte zu lesen.
- **Veraltete Abschlussantwort:** Das `finally` des Bearbeitungsformulars gab bisher Eingaben und Speichern-/Abbrechen-Schaltflächen ohne Sitzungsprüfung frei. Jetzt erfolgt die Freigabe nur, wenn Konto und Ladegeneration noch zum gestarteten Speichervorgang passen.
- **Prüfgrenzen:** Statische Quellcodeprüfung und Veröffentlichung auf GitHub; keine authentifizierten Browser-E2E-Tests und keine Supabase-Schreibprobe. Weitere Wunschformular-Pfade bleiben separat zu untersuchen.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Fokus beim asynchronen Verschieben zwischen Listen)

- **Nachgewiesener Fokusverlust im Quellcode:** Nach der zweistufigen Verschiebeoperation wird die Wunschkartenansicht über `load({afterBulk:true})` und `renderWishCards()` ersetzt. Der auslösende Verschieben-Button verliert dadurch seinen DOM-Knoten und den Tastaturfokus.
- **Korrektur:** Der Fokus wird vor dem Deaktivieren des Buttons erfasst. Nach dem Neuaufbau wird die Ziellistenauswahl desselben Wunsches fokussiert, sofern keine bewusste Fokusverlagerung erfolgte. Ist der Wunsch nicht mehr sichtbar, wird die Wunschsuche als Rücksprungziel verwendet.
- **Sicherheitsgrenzen:** Die vorhandenen Konto-, Generationen- und Listenprüfungen sowie die getrennte Fehlerbehandlung für Zielzuordnung und Entfernen aus der Quellliste bleiben bestehen. Ein Verschieben ist weiterhin keine atomare Datenbanktransaktion; bei einem Fehler im zweiten Schritt kann eine zusätzliche Zuordnung bestehen bleiben und muss geprüft werden.
- **Prüfumfang:** Statische Quellcodeprüfung und GitHub-Veröffentlichung; keine Browser-E2E-Prüfung und keine Supabase-Schreibprobe. Die weiteren Listen- und Wunschformular-Speicherpfade sind noch nicht vollständig geprüft.
- **Produktionsschutz:** Ausschließlich GitHub-Quellcode und Roadmap geändert; keine Supabase-Produktivdaten verändert und keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Listen-Zuordnungscheckbox: Tastaturfokus nach asynchronem Nachladen)

- **Nachgewiesener Fokusverlust im Quellcode:** Die Checkbox zum Hinzufügen oder Entfernen eines Wunsches löst nach der asynchronen Datenbankoperation `load({afterBulk:true})` und im `finally` `renderWishCards()` aus. Dabei wird die fokussierte Checkbox durch ein neues Element ersetzt.
- **Korrektur:** Vor dem Deaktivieren wird der Fokuszustand erfasst. Die neu gerenderte Checkbox wird über eine stabile Wunsch-ID wiedergefunden; falls sie durch den Filter verschwindet, wird die Wunschsuche fokussiert. Eine bewusste Fokusverlagerung während der Anfrage bleibt erhalten.
- **Sitzungsgrenzen:** Die vorhandenen Prüfungen auf Konto, Listen-ID und Ladezustand bleiben erhalten; die Fokuswiederherstellung erfolgt nur im passenden aktuellen Listen-Kontext.
- **Prüfgrenzen:** Statische Codeprüfung und GitHub-Veröffentlichung; kein authentifizierter Browser-End-to-End-Test und keine Supabase-Schreibprobe. Andere Listenaktionen, insbesondere Verschieben und Formularspeicherung, bleiben gesondert zu prüfen.
- **Produktionsschutz:** Keine Supabase-Produktivdaten verändert, keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Prioritätsänderungen ohne gegenseitigen Fokusverlust)

- **Konkreter Folgefehler:** Das bisherige vollständige `render()` nach einer Prioritätsänderung entfernte auch andere, noch deaktivierte und auf ihre Speicherantwort wartende Prioritätsfelder. Deren asynchrone Handler arbeiteten anschließend mit abgehängten DOM-Elementen. Jetzt wird nach erfolgreicher Speicherung nur das betroffene Prioritätskennzeichen aktualisiert beziehungsweise die Karte entfernt, falls sie nicht mehr zum aktiven Filter passt.
- **Tastaturfokus:** Der Fokuszustand wird vor dem Deaktivieren des Select-Feldes erfasst. Nach der Antwort wird der Fokus nur zurückgegeben, wenn er inzwischen auf dem Dokumentkörper liegt; eine bewusste Fokusverlagerung wird nicht überschrieben. Bei einer durch den Filter entfernten Karte dient der Prioritätsfilter als Rücksprungziel.
- **Sitzungs- und Fehlergrenzen:** Verspätete Antworten nach Kontowechsel oder nach Entfernen des Elements ändern keine sichtbaren Felder. Fehlgeschlagene Speicherungen setzen den Auswahlwert zurück; verbundene Selects werden im `finally` wieder aktiviert.
- **Prüfumfang:** Statische Codeprüfung; keine authentifizierten Browser- oder Datenbank-Schreibtests. Insbesondere parallele Prioritätsänderungen und die Filterdarstellung sollten in einer isolierten Browser-Testumgebung nachgeprüft werden.
- **Produktionsschutz:** Nur GitHub-Code und Roadmap geändert; keine Supabase-Produktivdaten und keine Testdatensätze angelegt oder verändert.

## Entwicklungsfortschritt – 11.11.2026 (Geschenk-Dashboard: asynchrones Prioritätsspeichern)

- **Nachgewiesener Fokusverlust:** Die Prioritätsauswahl in `gift-dashboard.mjs` rief nach erfolgreichem Speichern `render()` auf und ersetzte damit das fokussierte Select-Element. Der Handler merkt sich den Fokus und stellt ihn nach dem Rendern auf die Priorität desselben Geschenks zurück; wenn das Geschenk durch den aktiven Filter verschwindet, wird der Prioritätsfilter fokussiert.
- **Fehlerpfad:** Bei einer unerwarteten Exception während der asynchronen Anfrage blieb das Select bisher deaktiviert und der Fehler wurde nicht als Speicherfehler gemeldet. `try/catch/finally` setzt den Wert zurück, meldet den Fehler und entsperrt ein noch verbundenes Feld zuverlässig.
- **Sitzungswechsel:** Die Schreiboperation verwendet die beim Start erfasste Konto-ID. Verspätete Antworten ändern bei abweichender Sitzung weder Dashboard-Daten noch Status oder Fokus.
- **Grenzen der Prüfung:** Codeprüfung und Syntaxkontrolle; kein authentifizierter Browser-E2E-Test und keine produktive Supabase-Schreibprobe. Weitere Listenaktionen und Dashboard-Speicherpfade müssen separat auf überholte Antworten und Fokusübergänge geprüft werden.
- **Produktionsschutz:** Ausschließlich GitHub-Quellcode und Roadmap geändert; keine Supabase-Produktivdaten oder Testdatensätze verändert.

## Entwicklungsfortschritt – 11.11.2026 (Wunschlisten nach Kontowechsel trotz laufender Mutation nachladen)

- **Kontowechsel während einer Listenänderung:** In `lists-dashboard.mjs` kann `load()` während `listMutationBusy` nur einen Hinweis ausgeben und ohne Datenabfrage zurückkehren. Wenn die alte Sitzung gerade eine Listen-Neuanlage oder Listenbearbeitung speichert und die neue Sitzung gleichzeitig ihren Dashboard-Refresh auslöst, bleibt deren Listenansicht damit bis zu einer späteren manuellen Aktualisierung leer. Beide asynchronen Listen-Speicherpfade prüfen jetzt im `finally`, ob ein anderes Konto angemeldet ist und seine Listen noch nicht geladen wurden. In diesem Fall starten sie nach dem Aufheben der Mutation-Sperre einen neuen `load()`-Versuch.
- **Fehlermeldungen sitzungsgebunden:** Die Nachladeaktion erfasst `refreshOwner` und zeigt Fehler nur an, falls dieses Konto weiterhin angemeldet ist. Dadurch überschreibt eine verspätete Fehlerrückmeldung nicht den Listenstatus einer inzwischen anderen Sitzung.
- **Prüfung:** Nach Veröffentlichung `lists-dashboard.mjs`, `gift-start.mjs` und `index.html` erneut aus dem GitHub-Repository geladen. Beide JavaScript-Module und zehn Inline-Skripte isoliert erfolgreich syntaktisch geprüft; keine doppelten statischen HTML-IDs. Authentifizierte mobile Browser- und Netzwerk-Race-End-to-End-Tests stehen aus.
- **Produktionsschutz:** Nur ein bisher fehlender clientseitiger Nachladeversuch und dessen Statusbehandlung ergänzt. Keine Supabase-Connectoraufrufe, Datenbankmigrationen, produktiven Schreibvorgänge oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Veraltete Nachladeantworten nach Listen-Speicheraktionen)

- **Race Condition nach Listenbearbeitung:** `editListForm.onsubmit` wartete nach erfolgreichem Update auf `load({afterBulk:true})`, prüfte vor Erfolgsmeldung und `finishListEditing()` aber nur die aktuelle Konto-ID. Wurde die Ansicht zwischenzeitlich erneut geladen oder der Sitzungszustand zurückgesetzt, konnte die ältere Aktion eine überholte Statusmeldung schreiben und den mobilen Tastaturfokus verschieben. Der Handler erfasst nun die `loadGeneration` des eigens angestoßenen Nachladens und prüft vor Status- und Fokusaktionen sowohl Konto-ID als auch die unveränderte Nachladegeneration.
- **Race Condition nach Listen-Neuanlage:** Auch `createList` zeigte bei einer fehlgeschlagenen Nachladeoperation den alten Fehlerhinweis bislang nur unter Prüfung der Konto-ID. Die Neuanlage sichert diese Fehlermeldung jetzt mit derselben generationsgebundenen Prüfung ab, damit später gestartete Aktualisierungen nicht von älteren Rückmeldungen überschrieben werden.
- **Prüfung:** `lists-dashboard.mjs`, `gift-start.mjs` und `index.html` nach GitHub-Veröffentlichung erneut abgerufen. Beide JavaScript-Module und zehn Inline-Skripte isoliert ohne Syntaxfehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler End-to-End-Test mit konkurrierenden Nachladevorgängen steht weiterhin aus.
- **Produktionsschutz:** Nur clientseitige Status- und Fokusbehandlung geändert. Keine zusätzlichen Datenbankoperationen, Supabase-Connectoraufrufe, Migrationen, Änderungen an Produktivdaten oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Listen-Editor während asynchronem Speichern geschützt)

- **Asynchrone Listenbearbeitung:** `editListForm.onsubmit` in `lists-dashboard.mjs` deaktivierte bisher während der asynchronen Update-Operation lediglich die Schaltflächen für Speichern und Abbrechen. Die übrigen `input`-, `select`- und `textarea`-Elemente blieben bearbeitbar, während das Formular bei erfolgreicher Antwort geschlossen wurde. Dadurch konnten spätere Eingaben während der ausstehenden Antwort unbemerkt verloren gehen. Jetzt werden alle bearbeitbaren Editorfelder während des Speichervorgangs temporär deaktiviert und im `finally`-Zweig wieder freigegeben.
- **Mobile Tastatur- und Fokusführung:** Ein vorübergehend deaktivierter Speichern-Button kann den aktiven Browserfokus verlieren. Bleibt das Formular nach einem Speicherfehler geöffnet, stellt die Abschlusslogik bei noch unverändertem Nutzer- und Ladezustand den Fokus auf die wieder freigegebene Speichern-Schaltfläche zurück, falls `document.body` den Fokus übernommen hat. Ein inzwischen bewusst veränderter Fokus wird nicht überschrieben.
- **Prüfung:** `lists-dashboard.mjs`, `gift-start.mjs` und `index.html` nach den GitHub-Commits erneut geladen. Beide JavaScript-Module und zehn Inline-JavaScript-Blöcke ohne Syntaxfehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler End-to-End-Test mit verzögerter oder fehlschlagender Speicherung ist weiterhin offen.
- **Produktionsschutz:** Nur clientseitige Formularsperre und Fokusführung geändert. Keine Supabase-Connectoraufrufe, Migrationen, Produktivdatenänderungen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Eingaben während asynchroner Listen-Neuanlage erhalten)

- **Race Condition bei der mobilen Listen-Neuanlage:** `createList` in `lists-dashboard.mjs` deaktivierte während einer laufenden Insert-Anfrage nur die Schaltfläche `createList`. `listTitle` und `listDescription` blieben für weitere Eingaben oder eine neue Vorlagenauswahl offen, wurden aber nach erfolgreichem `await` bisher bedingungslos geleert. So konnten nachträglich eingegebene Inhalte verloren gehen.
- **Gezielte Korrektur:** Beim Absenden werden die ursprünglichen Rohwerte `submittedTitle` und `submittedDescription` erfasst. Nach erfolgreicher, sitzungs- und generationsgültiger Antwort werden die Eingabefelder nur geleert, wenn ihr jeweiliger aktueller Wert noch exakt dem abgeschickten Wert entspricht. Spätere Änderungen bleiben im Formular erhalten. Die vorhandene Eingabevalidierung, Datenbankanfrage und Sitzungsprüfung bleiben unverändert.
- **Prüfung:** Aktualisierte `lists-dashboard.mjs`, unveränderte `gift-start.mjs` und `index.html` nach Veröffentlichung erneut von GitHub geladen. Beide JavaScript-Module und zehn Inline-Skripte ohne Syntaxfehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler End-to-End-Test mit verzögerter Antwort steht weiterhin aus.
- **Produktionsschutz:** Nur clientseitiger Umgang mit Formularwerten geändert. Keine Supabase-Connectoraufrufe, Migrationen, Änderungen an Produktivdaten oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Dashboard-Status und Wunschlistenfilter beim Kontowechsel bereinigt)

- **Dashboard-Statusmeldungen nach Sitzungswechsel:** In `gift-start.mjs` wurden beim Abmelden und beim Wechsel zu einer anderen angemeldeten Person bereits Vorschauzustände und Vorschauaktionen zurückgesetzt. Die Live-Meldungen `homeSettingsStatus` und `homeLayoutStatus` blieben dagegen unverändert. Beide Statusfelder werden nun an denselben Authentifizierungs-Reset-Stellen geleert, sodass Speicher- und Fehlermeldungen des bisherigen Kontos nicht in der nächsten Sitzung angezeigt werden.
- **Wunschlisten-Suche und -Filter:** `reset()` in `lists-dashboard.mjs` bereinigte zuletzt private Formularentwürfe, ließ aber `listsSearch`, `listsView` und `listsSort` bestehen. Damit konnte eine Suche oder die Auswahl „Nur Favoriten“ des bisherigen Kontos die Listen einer neuen Sitzung unbeabsichtigt filtern. Die Liste startet nun beim Sitzungsreset mit leerem Suchbegriff, der Ansicht `active` und der Standardsortierung `favorites`. Es werden keine gespeicherten Datensätze verändert.
- **Prüfung:** Aktualisierte `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` erneut über GitHub abgerufen. Beide JavaScript-Module und zehn Inline-Skripte ohne Syntaxfehler geprüft, keine doppelten statischen HTML-IDs. Authentifizierte mobile Browser-End-to-End-Tests mit realem Kontowechsel stehen noch aus.
- **Produktionsschutz:** Nur clientseitige Status- und Filterzustände geändert. Keine Supabase-Connectoraufrufe, Datenbankmigrationen, produktiven Datenänderungen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Private Listenformularentwürfe beim Sitzungswechsel bereinigt)

- **Kontowechsel und Listenentwürfe:** `reset()` in `lists-dashboard.mjs` blendete bisher die persönliche Wunschlistenoberfläche aus und leerte `editListId`, ließ aber bereits eingegebene `listTitle`-/`listDescription`-Werte und die Formularauswahl bestehen. Beim nächsten Anmelden konnten damit Entwürfe der vorherigen Sitzung weiterhin im Frontend erscheinen. Jetzt werden Neuanlage- und ausgeblendete Bearbeitungsfelder einschließlich Beschreibung, Vorlagenauswahl, Symbol, Farbe, Sichtbarkeit und Titelbild-URL beim Reset geleert beziehungsweise auf die Standardauswahl gesetzt.
- **Veraltete Formularfehler:** Der gleiche Sitzungsreset löscht `aria-invalid` und `aria-describedby` der betroffenen Listenfelder sowie alte Formular- und Editorstatusmeldungen. Neue Formulare beginnen dadurch nicht mit Fehlermarkierungen aus einer früheren Sitzung.
- **Verspätete Editoraktion:** `editListForm.onsubmit` rief `owner()` vor der Überprüfung einer eventuell beendeten Anmeldung auf. Ein Submit nach dem Logout konnte deshalb eine Ausnahme auslösen. Ein früher Authentifizierungs-Guard beendet diesen Pfad jetzt vor dem Zugriff auf die Konto-ID.
- **Prüfung:** Aktuelle `lists-dashboard.mjs`, `gift-start.mjs` und `index.html` erneut von GitHub abgerufen. Zwei Module sowie zehn Inline-JavaScript-Blöcke isoliert ohne Syntaxfehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler Browser-End-to-End-Test mit Kontowechsel steht noch aus.
- **Produktionsschutz:** Ausschließlich clientseitige Sitzungs-, Formular- und Validierungszustände angepasst. Keine Supabase-Connectoraufrufe, Datenbankmigrationen, Produktivdatenschreibvorgänge oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Mobile Listen-Sichtbarkeit und Vorlagenvalidierung)

- **Listen-Sichtbarkeit bei Neuanlage und Bearbeitung:** Die Bearbeitungsmaske in `lists-dashboard.mjs` meldete eine außerhalb von `private`/`public` liegende Auswahl bislang ohne Bezug zum fehlerhaften Feld. Jetzt wird `invalidField(editListVisibility, …)` verwendet; die Auswahl wird `aria-invalid` markiert, mit dem bestehenden Live-Feedback verknüpft und fokussiert. Die Neuanlage prüft `listVisibility` nun ebenfalls explizit, bevor der bisherige Insert-Pfad gestartet wird. Die vorhandenen `input`-/`change`-Handler räumen veraltete Markierungen beider Auswahlfelder auf.
- **Listen-Vorlage und Beschreibung:** Die Vorlagenauswahl überschreibt `listDescription` programmatisch. Ein zuvor durch eine überlange Beschreibung gesetztes `aria-invalid`/`aria-describedby` wurde dadurch nicht zurückgesetzt. Jetzt werden beide Attribute beim Vorlagenwechsel entfernt. Die alte Beschreibungsfehlermeldung wird nur dann durch einen Hinweis zur übernommenen Vorlage ersetzt, wenn sie tatsächlich noch die angezeigte Listen-Statusmeldung ist. Die bestehende Bereinigung für `listTitle` bleibt bestehen.
- **Prüfung:** Veröffentlichte `lists-dashboard.mjs`, unveränderte `gift-start.mjs` und `index.html` erneut aus GitHub geladen. Beide JavaScript-Module und zehn Inline-Skripte syntaktisch ohne Fehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler Browser-End-to-End-Test steht aus.
- **Produktionsschutz:** Ausschließlich clientseitige Formularvalidierung, Statusanzeige und Fokusführung. Keine Supabase-Connectoraufrufe, Migrationen, Produktivdatenänderungen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Sitzungsrevision für Speichern, Vorschaufokus und Ladefehler)

- **Speicherantworten nach Authentifizierungswechsel:** `gift-start.mjs` berücksichtigte bisher in den asynchronen Speicherpfaden für Dashboard-Einstellungen und Layouts nur `currentUser===saveOwner`. Nach einem Authentifizierungswechsel mit wieder gleicher Konto-ID konnte dadurch eine alte Antwort trotzdem lokale Einstellungen und Statusmeldungen verändern. Beide Pfade erfassen jetzt zusätzlich `saveAuthRevision` und prüfen nach `await` sowohl die Konto-ID als auch die Authentifizierungsrevision, bevor sie erfolgreiche oder fehlerhafte Ergebnisse anzeigen.
- **Vorlagenspeicherung und Vorschau-Fokus:** `homeSaveLayout` stellt den vor dem Speichern erfassten Formularentwurf nur noch dann wieder her, wenn die Sitzung unverändert ist. Der Abschluss von `saveLayoutChange` gibt Buttons nicht aufgrund einer alten Antwort in einer mittlerweile abgelösten Sitzung frei. `homeConfirmPreview` prüft nach der Speicherung Konto und Sitzungsrevision, bevor die Vorschau geschlossen und die Statusmeldung fokussiert wird.
- **Veraltete Ladefehler:** Der `catch`-Zweig von `refresh()` zeigte bislang eine Fehlernachricht auch dann, wenn die fehlgeschlagene Anfrage bereits durch eine neue Authentifizierungsrevision überholt war. Jetzt schreibt er nur noch in die sichtbare Statusregion, wenn seine Revision aktuell ist.
- **Prüfung:** Aktualisierte `gift-start.mjs`, `lists-dashboard.mjs` sowie `index.html` nach GitHub-Veröffentlichung erneut abgerufen. Beide Module und zehn Inline-Skripte syntaktisch ohne Fehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter Browser-End-to-End-Test mit Sessionwechsel und verzögerten Antworten bleibt offen.
- **Produktionsschutz:** Nur clientseitige Sitzungs-, Fokus- und Abschlussprüfungen geändert. Keine Supabase-Connectoraufrufe, Datenbankmigrationen, Produktivdatenschreibvorgänge oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Authentifizierungsrevision beim Laden und Fokusbereinigung nach Sitzungswechsel)

- **Dashboard-Laden bei Sitzungswechsel:** In `gift-start.mjs` wurde eine während `refresh()` eintreffende Authentifizierungsänderung zuletzt zwar durch `refreshPending` nachgeladen, der ursprünglich laufende asynchrone Abruf konnte jedoch zuvor noch veraltete persönliche Präferenzen und Dashboard-Daten anwenden. `authRevision` wird nun bei Authentifizierungsereignissen erhöht, während jeder `refresh()`-Durchlauf seine Ausgangsversion erfasst. Nach `auth.getUser()`, vor und nach den Dashboard-Datenabfragen sowie in `loadPreferences(uid,authVersion)` werden überholte Ergebnisse verworfen. Die vorgemerkte Aktualisierung lädt danach den aktuellen Kontostand erneut.
- **Mobiler Wunschlisten-Editor:** `reset()` in `lists-dashboard.mjs` blendete beim Sitzungswechsel den geöffneten Listen-Editor aus, ließ aber die alte `listEditReturnFocus`-Referenz bestehen. Sie wird nun zusammen mit dem übrigen Sitzungszustand gelöscht, damit eine spätere Fokusrückgabe nicht auf einen früheren Auslöser verweist.
- **Prüfung:** `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach den GitHub-Commits erneut abgerufen. Beide JavaScript-Module und zehn Inline-Skripte isoliert ohne Syntaxfehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler End-to-End-Test mit verzögerten Netzwerkantworten und tatsächlichem Kontowechsel ist weiterhin offen.
- **Produktionsschutz:** Änderungen ausschließlich in der clientseitigen Sitzungs- und Fokuslogik, ohne zusätzliche Schreibabfragen. Keine Supabase-Connectoraufrufe, Datenbankmigrationen, Änderungen an Produktivdaten oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Sitzungswechsel bei Layout-Speicherabschluss und Dashboard-Laden)

- **Asynchroner Vorlagenabschluss:** Beim Speichern persönlicher Dashboard-Layout-Vorlagen konnte `homeSaveLayout` nach dem `await saveLayoutChange(...)` noch `restoreSettingsDraft(draft)` ausführen, obwohl währenddessen ein anderes Konto aktiv geworden war. Der ursprüngliche `saveOwner` wird nun vor dem Speichern erfasst; das Formular wird nur wiederhergestellt, solange `currentUser===saveOwner` ist. Außerdem deaktiviert der `saveLayoutChange`-Abschluss alle Layout-Bedienelemente, wenn kein Nutzer mehr angemeldet ist, statt sie nach Abmeldung pauschal freizugeben.
- **Authentifizierungsereignisse während des Ladens:** `refresh()` ignorierte mit `if(loading)return` Authentifizierungsereignisse, die während eines laufenden asynchronen Dashboard-Ladevorgangs eintreffen. `refreshPending` merkt solche Ereignisse jetzt vorübergehend vor und löst nach dem laufenden `finally` eine weitere Aktualisierung aus, damit der aktuelle Sitzungszustand erneut geprüft wird.
- **Prüfung:** `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach den beiden GitHub-Commits erneut abgerufen. Zwei JavaScript-Module und zehn Inline-Skripte ohne Syntaxfehler geprüft, keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler End-to-End-Test mit Kontowechsel und verzögerten Netzwerkantworten steht aus.
- **Produktionsschutz:** Nur clientseitige Sitzungs-, Fokus- und Zustandslogik geändert; keine Supabase-Connectoraufrufe, Migrationen, produktiven Datenänderungen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Verspätete Dashboard-Speicherantworten bei Kontowechsel)

- **Kontogebundene asynchrone Speichervorgänge:** In `gift-start.mjs` wurden Antworten auf `homeGiftSettingsForm`-Speicherungen und `saveLayoutChange` bisher auf den aktuellen lokalen Dashboard-Zustand angewendet, obwohl während des `await` ein anderes Konto aktiv geworden sein konnte. Beide Pfade merken sich jetzt `saveOwner` beim Beginn der Aktion und benutzen diese ID unverändert für die bestehende Schreibanfrage. Nach der Antwort werden lokale Einstellungen und Erfolgsmeldungen ausschließlich aktualisiert, wenn `currentUser===saveOwner` gilt.
- **Fehler- und Vorschauzustand:** Bei fehlgeschlagenen Speicheraktionen werden Statusmeldungen ebenfalls nur für das noch aktive Ursprungskonto geschrieben. `saveLayoutChange` meldet bei einem inzwischen anderen Konto `false` zurück; damit kann auch der aufrufende Vorschau-Bestätigungspfad keinen verspäteten Erfolg auf die neue Sitzung übertragen. Bereits abgesendete Datenbankoperationen werden weder neu ausgelöst noch rückwirkend abgebrochen.
- **Prüfung:** `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach GitHub-Veröffentlichung erneut abgerufen; zwei JavaScript-Module und zehn Inline-Skripte isoliert ohne Syntaxfehler geprüft, keine doppelten statischen HTML-IDs. Ein authentifizierter Browser-Race-Test mit tatsächlichem Kontowechsel steht aus.
- **Produktionsschutz:** Ausschließlich clientseitige Kontozuordnung und Reaktionslogik für bereits bestehende asynchrone Speicherpfade geändert. Keine Supabase-Connectoraufrufe, Migrationen, produktive Datenänderungen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Fehlgeschlagene Layout-Speicherung erhält die Vorschau)

- **Vorschau-Bestätigung und Race Condition:** `homeConfirmPreview` in `gift-start.mjs` rief bisher `endPreview(false)` vor der asynchronen `saveLayoutChange`-Operation auf. Bei einem Speicherfehler waren die Vorschau und ihr Ziel damit verloren, obwohl der neue Layoutzustand nicht dauerhaft übernommen worden war. `saveLayoutChange` meldet den Erfolg jetzt als boolesches Ergebnis an den Aufrufer; die Vorschau wird erst nach bestätigtem Erfolg durch `endPreview(false)` beendet. Bei einem Fehler bleiben die Vorschau samt Bedienelementen für einen neuen Bestätigungsversuch verfügbar.
- **Status und Fokus:** Bei fehlgeschlagenem Speichern einer aktiven Vorschau meldet die bestehende `homeLayoutStatus`-Live-Region ausdrücklich, dass die Vorschau geöffnet bleibt. Die vorhandene Fokusführung auf die Statusregion bleibt erhalten. Sonstige Layout-Speicherpfade nutzen weiterhin die bestehende Funktion und ihre Statusmeldungen.
- **Prüfung:** Nach Veröffentlichung aktuelle `gift-start.mjs`, unveränderte `lists-dashboard.mjs` und `index.html` erneut aus GitHub abgerufen. Beide Module sowie zehn Inline-JavaScript-Blöcke isoliert syntaktisch ohne Fehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler End-to-End-Test mit simuliertem Speicherausfall bleibt offen.
- **Produktionsschutz:** Nur clientseitiger Abschlusszeitpunkt der Vorschau und Rückmeldung geändert. Keine Supabase-Connectoraufrufe, Migrationen, produktiven Datenänderungen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Dashboard-Vorschau gegen laufende Speicheraktionen abgesichert)

- **Vorschau während laufender Speicherung:** Die vorherige `settingsSaveBusy`-Sperre verhinderte parallele Schreibvorgänge, aber `showPreview` prüfte nur `layoutBusy`. Während reguläre Dashboard-Einstellungen gespeichert wurden, konnte die Vorschau weiterhin den lokalen `preferences`- und Formularzustand neu zeichnen. Jetzt prüft `showPreview` vor Änderungen beide Busy-Zustände und meldet den laufenden Speichervorgang über `homeLayoutStatus`.
- **Vorschau bestätigen:** `homeConfirmPreview` konnte `endPreview(false)` aufrufen und den lokalen Vorschauzustand verwerfen, bevor `saveLayoutChange` wegen eines laufenden Speichervorgangs den eigentlichen Speicherauftrag ablehnte. Die Busy-Prüfung erfolgt nun bereits vor der Bestätigungsabfrage und vor `endPreview`.
- **Vorschau verwerfen:** `homePreviewUndo` konnte den lokalen Zustand während eines laufenden Speicherauftrags wiederherstellen. Ein analoger Guard verhindert das Verwerfen während `layoutBusy` oder `settingsSaveBusy`. In allen drei Fällen bleibt die vorhandene Vorschau unangetastet; es werden keine zusätzlichen Schreibvorgänge gestartet.
- **Prüfung:** Veröffentlichtes `gift-start.mjs`, unverändertes `lists-dashboard.mjs` sowie `index.html` erneut von GitHub geladen. Beide Module und zehn Inline-JavaScript-Blöcke isoliert erfolgreich auf Syntax geprüft, keine doppelten statischen HTML-IDs. Authentifizierte Browser- und Race-Condition-End-to-End-Tests stehen aus.
- **Produktionsschutz:** Nur clientseitige Zustands-Guards und Live-Statusmeldungen; keine Supabase-Connectoraufrufe, produktiven Datenbankoperationen, Migrationen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Dashboard-Speicheraktionen gegen Überschneidungen abgesichert)

- **Parallele Dashboard-Speicheraktionen:** In `gift-start.mjs` wurde `homeSettingsSave` nur während seines eigenen asynchronen Schreibvorgangs gesperrt; `saveLayoutChange` verwendete eine getrennte `layoutBusy`-Sperre. Dadurch konnten normale Dashboard-Einstellungen und persönliche Layout-Vorlagen gleichzeitig in denselben Präferenzdatensatz geschrieben werden. Die neue clientseitige `settingsSaveBusy`-Sperre verhindert doppelte Formular-Submits und blockiert Layout-Schreibvorgänge, solange Einstellungen gespeichert werden. Umgekehrt prüft das Formular `layoutBusy`, bevor es eine Speicherung beginnt. Es erscheint eine vorhandene Live-Statusmeldung, wenn ein weiterer Vorgang noch läuft.
- **Vorlagenauswahl:** `homeSaveLayout` prüft vor dem Lesen des Formularentwurfs beide Busy-Zustände, sodass bei bereits laufendem Speichern kein zweiter Vorlagen-Schreibvorgang angestoßen wird. Der Guard liegt vor der bestehenden Vorschau- und Validierungsbehandlung; vorhandene Datenbankabfragen bleiben unverändert.
- **Prüfung:** `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach Veröffentlichung erneut über GitHub geladen. Beide JavaScript-Module und zehn Inline-Skripte ohne Syntaxfehler geprüft; keine doppelten statischen HTML-IDs. Vollständiger authentifizierter Browser- und Race-Condition-End-to-End-Test bleibt offen.
- **Produktionsschutz:** Nur clientseitige Busy-/Status-Logik geändert. Keine Supabase-Connectoraufrufe, Migrationen, Produktivdatenänderungen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Listenbeschreibung bei Neuanlage und Fokus in ungültigen Layout-Vorschauen)

- **Neue Wunschliste:** `createList` schnitt den getrimmten `listDescription`-Text über `.slice(0,500)` stillschweigend ab. Die Formularlogik prüft jetzt ausdrücklich die Grenze von 500 Zeichen, erhält die Eingabe und markiert/fokussiert das Beschreibungsfeld über `invalidField` einschließlich vorhandener Live-Statusmeldung. Beim erneuten Bearbeiten wird die Fehlermarkierung wieder entfernt. Die bisherige Datenbank-Insert-Operation wurde nicht geändert.
- **Dashboard-Layout-Vorschauen:** `showPreview` gab bei ungültigen Vorlagen oder Formulareinstellungen zuvor nur die Meldung „Ungültige Layout-Vorschau.“ aus. Jetzt wird der Einstellungsbereich `homeGiftSettings` geöffnet, eine konkrete Sortier-/Kennzahlen-/Link- oder Bereichssteuerung fokussiert und per `aria-describedby` mit `homeLayoutStatus` verknüpft; das Scrollverhalten berücksichtigt `prefers-reduced-motion`. Bei gültigen Vorschauen ist die Anzeige unverändert.
- **Prüfung:** Aktuelle `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach den Commits von GitHub abgerufen. Beide Module und zehn Inline-Skripte isoliert auf JavaScript-Syntax geprüft: keine Fehler; keine doppelten statischen HTML-IDs. Keine authentifizierte Browser-E2E-Prüfung durchgeführt.
- **Produktionsschutz:** Ausschließlich clientseitige Formular- und Fokuslogik geändert. Keine Supabase-Connectoraufrufe, Datenbankmigrationen, Produktivdatenschreibvorgänge oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Formularvalidierung für Listenbeschreibung und persönliche Layout-Vorlagen)

- **Listenbearbeitung:** Eine Beschreibung von mehr als 500 Zeichen wurde in `lists-dashboard.mjs` zuvor lediglich über `msg` gemeldet. Der Nutzer blieb beim Speichern-Button und das beschreibende Feld hatte weder `aria-invalid` noch einen Bezug zur Statusmeldung. Die Validierung nutzt nun `invalidField(editListDescription, …)` mit Fokusrückgabe und Screenreader-Verknüpfung. Die bestehende Attributbereinigung beim Ändern der Eingabe und beim Öffnen des Editors wurde auf `editListDescription` erweitert.
- **Dashboard-Vorlagenspeicherung:** Bei ungültigem `draft` in `homeSaveLayout` meldete `gift-start.mjs` bisher nur einen allgemeinen Fehler. Nun wird je nach ungültiger Sortierung, Kennzahlen-, Schnellzugriffs-, Favoriten- oder Bereichsauswahl das passende Feld fokussiert, per `aria-describedby` mit der vorhandenen `homeLayoutStatus`-Live-Meldung verknüpft und unter Berücksichtigung reduzierter Bewegung ins Sichtfeld gebracht. Die vorhandene Validierungs- und Speicherlogik bleibt unverändert.
- **Prüfung:** Die aktualisierten `gift-start.mjs`, `lists-dashboard.mjs` sowie `index.html` erneut von GitHub geladen; beide Module und zehn Inline-JavaScript-Blöcke ohne Syntaxfehler geprüft, keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler Browser-End-to-End-Test bleibt offen.
- **Produktionsschutz:** Nur clientseitige Formularvalidierung und Fokusführung geändert, keine Supabase-Abfragen oder produktiven Daten geändert, keine Migrationen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Dashboard-Vorschau bei Kontowechsel und Vorlagenspeicherung abgesichert)

- **Kontowechsel und Abmeldung:** Die Authentifizierungsaktualisierung in `gift-start.mjs` setzte `previewSnapshot` und `previewTarget` bei Abmeldung zurück, ließ den zuletzt gesicherten, nicht gespeicherten `previewFormDraft` jedoch bestehen. Beim Abmelden und beim Wechsel zu einer anderen angemeldeten Person werden jetzt alle drei temporären Vorschauzustände zurückgesetzt und die Vorschauaktionen `homePreviewUndo` und `homeConfirmPreview` deaktiviert. Damit verbleiben keine alten Formularentwürfe in einer neuen Sitzung.
- **Vorlagen während Vorschau:** `homeSaveLayout` ließ das Speichern eines persönlichen Layouts zu, während eine unbestätigte Vorschau aktiv war. Die anschließende `applyPreferences`-Neuzeichnung konnte gespeicherte und vorläufige Ansichten inkonsistent machen. Bei aktivem `previewSnapshot` wird die Vorlagenspeicherung jetzt vor dem bisherigen Schreibpfad abgefangen: Es erscheint eine formularnahe Live-Meldung, dass die Vorschau zuerst bestätigt oder verworfen werden muss, und die Fokusführung wechselt zur vorhandenen Rückgängig-Aktion.
- **Prüfung:** Die aktualisierte `gift-start.mjs`, unveränderte `lists-dashboard.mjs` und `index.html` nach GitHub-Veröffentlichung erneut abgerufen. Beide JavaScript-Module und zehn Inline-Skripte syntaktisch ohne Fehler geprüft; keine doppelten statischen HTML-IDs. Ein authentifizierter Browser-End-to-End-Test bleibt offen.
- **Produktionsschutz:** Ausschließlich clientseitige Zustandsbereinigung und ein zusätzlicher Guard vor bestehenden Speicheraktionen. Keine Supabase-Connectoraufrufe, Migrationen, produktiven Schreibvorgänge oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Formularentwurf beim Layout-Speichern und korrekte Listen-Vorlagenmeldung)

- **Geschenk-Dashboard: Vorlagenspeicherung:** `homeSaveLayout` speichert in `gift-start.mjs` den aktuellen Formularentwurf als persönliche Vorlage. Die gemeinsame `saveLayoutChange`-Routine zeichnete danach über `applyPreferences()` die Formularfelder anhand der bisher aktiven, gespeicherten Dashboard-Konfiguration neu und verwarf dadurch noch nicht gespeicherte Eingaben. Die neue gemeinsame `restoreSettingsDraft`-Hilfsfunktion erhält den aktuellen Formularentwurf nach der Vorlagenaktion einschließlich Sichtbarkeits-Checkboxen, Sortieroptionen, Kennzahlen, Links und Abschnittsreihenfolge. Die Funktion wird auch beim Rückgängigmachen einer Vorschau wiederverwendet; die tatsächlichen Supabase-Speicherparameter bleiben unverändert.
- **Wunschlisten-Vorlagen:** Die bisherige Korrektur für `listTitle` beseitigte zwar `aria-invalid` nach Einsetzen eines Vorlagentitels, ließ aber die alte globale Fehlermeldung „Listenname muss 1 bis 80 Zeichen enthalten.“ im Live-Status bestehen. Bei genau diesem zuvor bestehenden Fehlerzustand ersetzt die Vorlagenauswahl den veralteten Hinweis nun durch eine passende Rückmeldung. Andere Fehlermeldungen werden nicht überschrieben.
- **Prüfung:** `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach Veröffentlichung erneut über GitHub abgerufen. Beide Module und zehn Inline-JavaScript-Blöcke isoliert ohne Syntaxfehler geprüft; keine doppelten statischen HTML-IDs. Kein angemeldeter mobiler End-to-End-Browsertest durchgeführt.
- **Produktionsschutz:** Ausschließlich clientseitige Formularzustands-Wiederherstellung und Statusanzeige; keine Supabase-Connectoraufrufe, Migrationen, neuen Testdaten oder Änderungen an bestehenden Produktivdatensätzen.

## Entwicklungsfortschritt – 11.11.2026 (Individuelle Dashboard-Vorschau und Listen-Vorlagenvalidierung)

- **Individuelle Dashboard-Vorschau:** Die `custom`-Aktion im Layoutbalken von `gift-start.mjs` übergab zuvor `previewSnapshot||preferences` an `showPreview`. Damit wurde bei einer bestehenden Vorschau auf gespeicherte Dashboard-Werte statt auf den vor der Vorschau gesicherten nicht gespeicherten Formularentwurf zurückgegriffen. Jetzt wird `previewFormDraft||draftSettings()` für die individuelle Vorschau verwendet, damit die aktuellen beziehungsweise vor Vorschauwechsel gesicherten Einstellungen korrekt angezeigt werden. Bestehende Vorschau-/Speicherlogik und Datenbankaufrufe bleiben unverändert.
- **Wunschlisten-Vorlagen:** Die Vorlagenauswahl in `lists-dashboard.mjs` setzt `listTitle` programmatisch auf den Vorlagentitel. War das Feld zuvor als ungültig markiert, blieben `aria-invalid` und `aria-describedby` trotz neuer Eingabe erhalten, weil kein normales Eingabeereignis ausgelöst wurde. Nach der Vorlagenauswahl werden beide veralteten Attribute nun entfernt; der laufende Tastaturfokus bleibt unberührt.
- **Prüfung:** Aktualisierte `gift-start.mjs` und `lists-dashboard.mjs` sowie `index.html` nach GitHub-Veröffentlichung neu geladen. Beide Module und zehn Inline-Skripte erfolgreich isoliert auf JavaScript-Syntax geprüft, keine doppelten statischen HTML-IDs. Ein vollständiger Test im authentifizierten Mobilbrowser steht aus.
- **Produktionsschutz:** Ausschließlich clientseitige Vorschauauswahl und Formular-Fehlerzustände angepasst. Keine Supabase-Connectoraufrufe, Datenbankmigrationen, Änderungen an Produktivdatensätzen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Dashboard-Vorschau bewahrt Formularentwurf und mobile Bewegungspräferenz)

- **Nicht gespeicherte Dashboard-Einstellungen:** `showPreview` zeichnete die Konfigurationsfelder mit `applyPreferences()` neu. Dadurch gingen noch nicht gespeicherte Checkbox-, Sortier- und Abschnittsreihenfolgeänderungen verloren, wenn eine Layout-Vorschau verworfen wurde. Die neue temporäre `previewFormDraft`-Sicherung erfasst den aktuellen Formularentwurf beim ersten Vorschauwechsel. `endPreview(true)` stellt nach dem Wiederherstellen der tatsächlichen Dashboard-Ansicht auch die ursprünglichen Formulareingaben und die `draftOrder`-Reihenfolge wieder her; `endPreview(false)` verwirft die Entwurfssicherung bei bestätigter Übernahme. Es wurde keine bestehende Supabase-Speicherabfrage geändert.
- **Mobile Start-Schnellaktionen:** `homeNewWish` und `homeNewList` berücksichtigen jetzt `prefers-reduced-motion` beim Scrollen zum gewünschten Formular. Bestehende Fokusaktionen bleiben erhalten.
- **Prüfung:** `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach GitHub-Veröffentlichung erneut abgerufen. Beide Module und zehn Inline-Skripte isoliert ohne JavaScript-Syntaxfehler geprüft; keine doppelten statischen HTML-IDs. Vollständige authentifizierte Browser-/Touch-E2E-Prüfung bleibt ausstehend.
- **Produktionsschutz:** Änderungen ausschließlich im Client an Formularzustand und Scrollverhalten. Keine Supabase-Connectoraufrufe, Migrationen, produktive Schreiboperationen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Dashboard-Vorschauaktionen und mobile Schnellnavigation)

- **Vorschau und Fokus:** In `gift-start.mjs` deaktivieren `endPreview` und der Speichervorgang die gerade verwendeten Buttons „Vorschau rückgängig“ bzw. „Vorschau übernehmen“. Der Tastaturfokus blieb zuvor auf einem danach deaktivierten Button. Nach Abbruch oder bestätigter Übernahme wird die bestehende `homeLayoutStatus`-Live-Meldung programmatisch fokussiert; die bestehende Speicherlogik bleibt unverändert.
- **Listen-Schnellaktion:** `quickOpenSelected` in `lists-dashboard.mjs` scrollte bisher lediglich zur ausgewählten Liste. Die Aktion verwendet nun die vorhandene `focusListRegion('activeListHeading')`-Hilfe für einen nachvollziehbaren Tastatur- und Screenreader-Kontext.
- **Bewegungspräferenz:** Die Schnellaktionen `mobileNewWish`, `quickAddWish` und `quickNewList` respektieren `prefers-reduced-motion`, statt `smooth`-Scrollen unbedingt zu erzwingen.
- **Prüfung:** Nach Veröffentlichung `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` neu aus GitHub abgerufen. Zwei Module und zehn Inline-Skripte isoliert auf JavaScript-Syntax geprüft: keine Fehler; keine doppelten statischen HTML-IDs. Ein authentifizierter mobiler End-to-End-Test bleibt offen.
- **Produktionsschutz:** Nur clientseitige Fokus-, Navigations- und Scrolllogik geändert; keine Supabase-Connectoraufrufe, Datenbankmigrationen, Produktivdatenänderungen oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Dashboard-Vorschau und sichere Fokusrückgabe)

- **Dashboard-Vorschau:** In `gift-start.mjs` schaltete `saveLayoutChange` im `finally`-Block sämtliche Layoutbuttons frei, also auch `homeConfirmPreview` und `homePreviewUndo`, obwohl `endPreview` die Vorschau bereits beenden konnte. Diese beiden Aktionen bleiben nun deaktiviert, solange `previewSnapshot` nicht existiert. Bereits vorhandene Vorschaufunktionen und Speicherabfragen bleiben unverändert.
- **Listen-Editor:** `finishListEditing` stellte den Fokus nach Speichern/Abbrechen auf das ursprünglich aktive Element zurück, sobald dieses noch mit dem DOM verbunden war und keinen `[hidden]`-Vorfahren besaß. Mit einer zusätzlichen Prüfung über `getClientRects()` und `:disabled` werden auch per CSS ausgeblendete oder inzwischen deaktivierte Auslöser erkannt. In diesen Fällen dient `listsContent` als barrierefrei fokussierbarer Rücksprungpunkt.
- **Prüfung:** `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach den GitHub-Commits erneut geladen. Beide JavaScript-Module sowie zehn Inline-Skripte syntaktisch ohne Fehler geprüft; keine doppelten statischen HTML-IDs. Ein angemeldeter Browser-End-to-End-Test bleibt ausstehend.
- **Produktionsschutz:** Ausschließlich clientseitige Button-Zustände und Fokusführung geändert. Keine Supabase-Connectoraufrufe, Migrationen, produktiven Schreibvorgänge oder Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Sichere Listenbearbeitung und Dashboard-Formularfokus)

- **Listen-Editor:** Beim Speichern in `lists-dashboard.mjs` blieb der Button „Abbrechen“ aktiv, obwohl `listMutationBusy` gesetzt war und eine asynchrone Speicherung lief. Jetzt werden beide Formularaktionen während dieses Vorgangs gesperrt, ein formularnaher Live-Status meldet „Änderungen werden gespeichert …“, und beide Aktionen werden im `finally` wieder freigegeben. Der Abbruch-Handler ignoriert Klicks während der laufenden Listenänderung. Die bisherigen Datenbankoperationen bleiben unverändert.
- **Dashboard-Einstellungen:** Bei einer fehlerhaften Konfiguration in `gift-start.mjs` führte die Validierung bislang ausschließlich bei leerer Kennzahlenauswahl gezielt zum Feld. Jetzt wird je nach Fehler zuerst der betroffene Sortier- oder Auswahlbereich fokussiert und per `aria-describedby` mit der bestehenden Live-Statusmeldung verknüpft; die temporäre Verknüpfung wird beim Ändern entfernt. Auch reduzierte Bewegung wird beim Scrollen berücksichtigt.
- **Prüfung:** Aktualisierte Dateien `lists-dashboard.mjs`, `gift-start.mjs` und unveränderte `index.html` erneut von GitHub geladen. Beide Module und zehn Inline-JavaScript-Blöcke syntaktisch ohne Fehler geprüft, keine doppelten statischen HTML-IDs. Vollständiger authentifizierter Mobilbrowser-End-to-End-Test weiterhin offen.
- **Produktionsschutz:** Nur clientseitige Sperr-, Fokus- und Formularstatuslogik angepasst; keine Supabase-Abfragen, -Migrationen oder produktiven Daten verändert, keine Testdaten angelegt.

## Entwicklungsfortschritt – 11.11.2026 (Fokus bei Wunschfilter-Reset und Mehrfachauswahl)

- **Leere Suchergebnisse:** In `lists-dashboard.mjs` erzeugt `renderWishCards` bei null Treffern einen eigenen Button „Filter zurücksetzen“. Dessen Klick entfernt den Button beim Neuzeichnen selbst. Nach dem Rücksetzen wird nun das sichtbare Wunsch-Suchfeld `listWishSearch` fokussiert; die reguläre Aktion `listWishClearFilters` erhält dieselbe konsistente Fokusführung.
- **Mehrfachauswahl:** Die Aktionen `bulkClear` und `wishClearSelection` leeren die lokale Sammelauswahl und aktualisieren die Karten und Toolbar. Dabei können ursprünglich fokussierte Aktionsbuttons deaktiviert werden. Der Fokus wechselt jetzt nach dem Neuzeichnen zum weiterhin bedienbaren Wunsch-Suchfeld, während bestehende Live-Ergebniszähler unverändert bleiben.
- **Prüfung:** Die aktuelle `lists-dashboard.mjs`, `gift-start.mjs` und `index.html` nach GitHub-Veröffentlichung erneut geladen. Beide Module und zehn Inline-JavaScript-Blöcke ohne Syntaxfehler geprüft, keine doppelten statischen HTML-IDs. Das Geschenk-Dashboard benötigte in dieser Runde keine Codeänderung; ein vollständiger authentifizierter Browser-End-to-End-Test bleibt ausstehend.
- **Produktionsschutz:** Ausschließlich clientseitige Fokusführung nach Filter- und Auswahlaktionen geändert; keine neuen/geänderten Supabase-Abfragen, keine Produktivdatenänderungen und keine Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Dynamische Listenfilter und Nachladen ohne Fokusverlust)

- **Filter zurücksetzen:** Der im leeren Suchergebnis nachträglich erzeugte Button „Listenfilter zurücksetzen“ wird durch `render()` aus dem DOM entfernt. Auch der reguläre Zurücksetzen-Button kann nach der Filterkorrektur ausgeblendet werden. Beide Aktionen führen den Tastaturfokus jetzt nach dem Neuzeichnen zum weiterhin sichtbaren `listsSearch`-Feld zurück.
- **Wünsche nachladen:** Beim letzten Klick auf „Weitere 100 Wünsche anzeigen“ kann `wishLoadMore` nach dem Aktualisieren ausgeblendet werden, sodass der aktive Tastaturfokus verschwindet. In diesem Fall wird der bereits bestehende `listWishCount`-Ergebnisstatus temporär fokussierbar gemacht und fokussiert; solange weitere Seiten vorhanden sind, bleibt der Nachladen-Button unverändert.
- **Dashboard und Status:** Die vorhandenen Ergebniszähler `listsViewCount` und `listWishCount` sind bereits Live-Statusregionen. Die bestehenden Dashboard-Module wurden zusätzlich statisch überprüft; in dieser Runde war keine Änderung an `gift-start.mjs` erforderlich.
- **Prüfung:** Aktuelle `lists-dashboard.mjs`, `gift-start.mjs`, `index.html` erneut über GitHub abgerufen. Beide Module und zehn Inline-Skripte ohne JavaScript-Syntaxfehler geprüft, keine doppelten statischen IDs. Kein authentifizierter End-to-End-Test und keine produktiven Schreibtests.
- **Produktionsschutz:** Nur clientseitige Fokusführung nach Neuzeichnen/Filterwechsel; keine neuen oder geänderten Supabase-Abfragen, Migrationen, Testdaten oder Änderungen an Produktivdatensätzen.

## Entwicklungsfortschritt – 11.11.2026 (Fokus bei dynamischen Wunschkarten und Dashboard-Live-Rückmeldungen)

- **Wunschkarten-Markierungen:** `setMarker` zeichnet die gesamte Kartenansicht nach einer Favoriten-/Später-Markierung neu. Dabei verschwand der bisher fokussierte Button aus dem DOM. Neue `data-wish-marker`-Kennungen und die `restoreWishCardControl`-Hilfe setzen den Fokus auf die entsprechende neu gezeichnete Schaltfläche zurück, sofern die Aktion aus der Kartenansicht erfolgte. Die Detailansicht wird nicht unbeabsichtigt überfokussiert.
- **Mehrfachauswahl:** Wenn „Nur ausgewählte“ aktiv ist und ein Wunsch per Checkbox abgewählt wird, verschwindet seine Karte. Die Fokusführung landet nun bei einem passenden neuen Auswahlfeld oder beim Wunschfilter beziehungsweise der Listenüberschrift, statt auf einem entfernten Element zu verbleiben.
- **Kategoriebearbeitung:** Nach dem Speichern einer gerätelokalen Wunschkategorie und Schließen des Detaildialogs wird die zugehörige neu gezeichnete Wunschkarte wieder fokussiert, sofern sichtbar.
- **Dashboard-Einstellungen:** Nach dem Verschieben eines Abschnitts nennt die vorhandene Live-Statusmeldung jetzt den Namen des Abschnitts und die neue Position von vier Bereichen statt einer allgemeinen Bestätigung.
- **Prüfung:** Die aktualisierten `lists-dashboard.mjs`, `gift-start.mjs` sowie die unveränderte `index.html` aus GitHub neu geladen. Beide Module und zehn Inline-Skripte ohne Syntaxfehler isoliert geprüft; keine doppelten statischen HTML-IDs. Vollständiger authentifizierter Browser-E2E-Test bleibt offen.
- **Produktionsschutz:** Ausschließlich DOM-Fokus und barrierefreie Statusmeldungen. Keine neuen oder geänderten Supabase-Abfragen, Migrationen, Testdaten oder Änderungen an bestehenden Produktivdatensätzen.

## Entwicklungsfortschritt – 11.11.2026 (Dynamisch aktualisierte Favoriten und Dashboard-Validierung)

- **Konkreter Fokusverlust beim Favoritenwechsel:** Die Favoritenaktion in `lists-dashboard.mjs` zeichnet mit `render()` sämtliche Listenkarten neu. Dabei wurde auch der gerade aktive Favoritenbutton entfernt, wodurch die Tastaturnavigation ihren Anker verlor. Listenkarten erhalten nun ein internes `data-list-id`; nach dem Neuzeichnen fokussiert die Aktion den entsprechenden neuen Favoritenbutton. Falls die Karte durch den aktuellen Filter nicht mehr sichtbar ist (z. B. beim Entfernen aus „Nur Favoriten“), wandert der Fokus zum weiterhin erreichbaren Listenfilter.
- **Dashboard-Einstellungen ohne Kennzahl:** Die vorhandene clientseitige Validierung in `gift-start.mjs` zeigt bei einer leeren Kennzahlenauswahl nicht mehr ausschließlich eine Statusmeldung am Speichern-Button: Sie verknüpft den ersten Kennzahlen-Checkbox-Eintrag über `aria-describedby` mit `homeSettingsStatus`, fokussiert das Feld und scrollt unter Berücksichtigung reduzierter Bewegung zur Auswahl. Nach einer Änderung in der Auswahl wird diese temporäre Zuordnung entfernt.
- **Geprüft:** Nach Veröffentlichung `amazon-wishlist/lists-dashboard.mjs`, `gift-start.mjs` und `index.html` neu von GitHub geladen. Beide Module und die zehn Inline-Skripte ohne JavaScript-Syntaxfehler; keine doppelten statischen HTML-IDs. Ein vollständiger Browser-End-to-End-Test mit Anmeldung bleibt offen.
- **Produktionsschutz:** Ausschließlich clientseitige DOM-, Fokus- und Validierungsdarstellung; keine Datenbankabfragen geändert, keine Supabase-Migrationen oder -Schreiboperationen, keine Testdaten, keine Änderung bestehender Produktivdatensätze.

## Entwicklungsfortschritt – 11.11.2026 (Mobile Schnellnavigation und sortierbare Dashboard-Abschnitte)

- **Konkreter Sortierfehler im privaten Geschenk-Dashboard:** Nach dem Verschieben eines Abschnitts wählte die Tastaturfokuslogik stets den ersten aktiven Pfeilbutton. Wer wiederholt „Nach unten“ auslöste, konnte daher versehentlich mit „Nach oben“ die gerade ausgeführte Änderung umkehren. Der Fokus bleibt nun bei der gewählten Richtung, solange deren Button aktiv ist; an Listenrändern wird auf einen noch aktiven Button ausgewichen.
- **Mobile Wunschlisten-Schnellnavigation:** „Favoriten ansehen“ (`homeFavorites`) und „Listen“ (`mobileMyLists`) fokussieren die Listenübersicht nach dem Sprung. Die bestehende `focusListRegion`-Hilfe übernimmt Fokus und Scrollbewegung; Filter- und Datenlogik bleibt unverändert.
- **Wunschkarten:** Beim gezielten Navigieren zu einer Wunschkarte berücksichtigt `focusWishCard` die Systemeinstellung `prefers-reduced-motion` anstelle einer immer erzwungenen sanften Scrollbewegung.
- **Prüfung:** Aktuelle `gift-start.mjs`, `lists-dashboard.mjs` und `index.html` nach Veröffentlichung von GitHub geladen. Beide Module und zehn Inline-Skripte syntaktisch geprüft, keine Fehler; keine doppelten statischen HTML-IDs. Die Auswahl aktivierter Sortierbuttons wurde zusätzlich mit beiden Bewegungsrichtungen und verschiedenen Deaktivierungszuständen durchgespielt. Ein authentifizierter End-to-End-Browsertest bleibt offen.
- **Produktionsschutz:** Reine clientseitige Fokus-, Navigations- und Bewegungsanpassungen. Keine Supabase-Migration, keine Produktivdatenänderung, keine Testdaten.

## Entwicklungsfortschritt – 11.11.2026 (Fokusführung für Wunschlisten-Navigation und Dashboard-Sortierung)

- **Wunschlisten:** `openList` und der Button `listItemsBack` scrollten bislang ohne Tastaturfokuswechsel. Die neue clientseitige `focusListRegion`-Hilfe fokussiert die geöffnete Listenüberschrift bzw. beim Zurückspringen die Liste; sie berücksichtigt `prefers-reduced-motion`.
- **Geschenk-Dashboard:** Nach einer Verschiebung in der Abschnittssortierung suchte die bisherige Fokuslogik an einer festen Position nach einem Pfeilbutton, der an Listenrändern deaktiviert sein konnte. Die Fokuswahl nimmt nun einen aktivierten Button des verschobenen Abschnitts.
- **Prüfung:** Beide betroffenen JavaScript-Module `amazon-wishlist/lists-dashboard.mjs` und `amazon-wishlist/gift-start.mjs` erneut von GitHub geladen und ohne JavaScript-Syntaxfehler isoliert geprüft. Authentifizierter End-to-End-Browsertest steht aus.
- **Produktionsschutz:** Ausschließlich clientseitige Fokus- und Scroll-Logik verändert; keine Supabase-Schreiboperation, Schemaänderung oder Testdaten und keine Änderung vorhandener Produktivdatensätze.

## Entwicklungsfortschritt – 11.11.2026 (Geschenkplanung: mobile Fehlermeldungen und Fokusführung)

- **Konkrete UX-Lücke:** In der separaten `amazon-wishlist/gift-planner.html` wurden Speicher- und Validierungshinweise bislang allein in der weit oben stehenden globalen Statuszeile angezeigt; auf Smartphones waren diese nach Scrollen zum Formular nicht unmittelbar sichtbar.
- **Formularnahe Meldungen:** Neue Live-Regionen `budgetSaveFeedback` beim Anlassbudget und `giftFormFeedback` direkt nach den Geschenkspeicheraktionen; bestehende globale Statusmeldung bleibt erhalten. Rückmeldungen zu erfolgreichem Budget-/Geschenkspeichern und zu Fehlern erscheinen zusätzlich im relevanten Formular.
- **Validierung und Fokus:** Fehlende Anlässe/Titel oder ungültige Beträge führen beim bestehenden clientseitigen Validierungspfad zu `aria-invalid`, `aria-describedby` mit Verweis auf den lokalen Fehlerstatus sowie zum Fokus auf dem betreffenden Feld. Fehlerkennzeichnung wird beim Korrigieren des Feldes entfernt. Keine Änderung der Supabase-Schreibbedingungen.
- **Bearbeiten/Abbrechen:** Beim Bearbeiten eines Geschenks wird der auslösende Button erfasst; bei „Abbrechen“ kehrt der Fokus nach Möglichkeit dorthin zurück. Nach erfolgreichem Speichern wird die neue lokale Statusmeldung fokussiert. Die Meldungen sind für mobile Bildschirme und das dunkle Farbschema gestaltet.
- **Prüfung:** Beide GitHub-Dateien erneut abgerufen; isolierte JavaScript-Syntaxprüfung des Moduls ohne Fehler, Style-Tags und CSS-Klammern ausgeglichen sowie keine doppelten statischen IDs. Ein authentifizierter Browser-End-to-End-Test mit tatsächlichen Produktivdatensätzen steht aus.
- **Mobile Dashboard-Navigation:** Der vorhandene „Nach oben“-Button der Wunschlisten-Startseite setzt den Tastaturfokus jetzt auf den Hauptinhalt statt ihn nur vom Button zu entfernen. So bleibt nach der Sprungaktion ein nachvollziehbarer Tastaturpfad. Auch diese Änderung betrifft nur Client-JavaScript in `amazon-wishlist/index.html`.
- **Produktionsschutz:** Ausschließlich Änderungen an HTML/CSS und clientseitigen UI-Rückmeldungen sowie Fokus; keine Supabase-Migration, keine Testdaten oder Änderungen an Produktivdatensätzen.

## Entwicklungsfortschritt – 11.11.2026 (Mobile Navigationszustände, Touch und Tastatur)

- **Mobiler Klappzustand:** Die bestehende DOM-Gruppierung für `mobileListCreation`, `mobileRecentLists` und `mobileGiftExtra` speichert die über Touch-/Tastaturaktivierung gewählte Öffnung nun am jeweiligen `details`-Element (`data-mobile-open`). Beim responsiven Wechsel auf Desktop bleiben die Bereiche offen und beim Zurückwechseln zu Mobilgeräten wird die dort beabsichtigte Auswahl wiederhergestellt.
- **Programmatisch geöffnete Formulare:** Die Schnellaktionen `homeNewList` / `quickNewList`, Direktlinks in zuvor geschlossene Bereiche und Validierungsfehler der Listenerstellung markieren ihr mobiles `details` als absichtlich geöffnet. Dadurch fällt das Formular nach einem Bildschirmbreitenwechsel nicht unbeabsichtigt zu. Analog berücksichtigt die Verwaltung des privaten Geschenk-Dashboards programmatisches Öffnen durch Direktlinks.
- **Tastatur:** `Escape` in der Hauptnavigation schließt nur noch eine tatsächlich geöffnete Navigationsgruppe, die den aktuellen Tastaturfokus enthält. Der Fokus wird auf die `summary` dieser Gruppe zurückgesetzt; andere Gruppen bleiben unberührt.
- **Prüfung:** `amazon-wishlist/index.html`, `app.mjs` und `lists-dashboard.mjs` nach Veröffentlichung erneut von GitHub geladen. Zehn Inline-JavaScript-Blöcke und beide JavaScript-Module wurden isoliert ohne Syntaxfehler geprüft; 21 CSS-Stylesheets mit ausgeglichenen Klammern und keine doppelten statischen HTML-IDs. Vollständiger authentifizierter Live-Browser-Test auf Touchgeräten bleibt offen; die genannten Fehler wurden anhand des aktuellen Programmablaufs nachvollzogen, nicht durch einen vollständigen produktiven E2E-Test.
- **Produktionsschutz:** Ausschließlich clientseitige Navigation, Fokus und DOM-Zustandsmarker; keine Supabase-Schreiboperationen oder Migrationen, keine Testdaten, keine Änderungen an bestehenden Produktivdatensätzen.

## Entwicklungsfortschritt – 10.11.2026 (Mobile Erreichbarkeit und zugeordnete Formularfehler)

- **Schnellaktion „Neue Liste“:** Die bestehenden Auslöser `homeNewList`, `quickNewList` und `createList` öffnen den mobilen `details`-Bereich `mobileListCreation` vor nachfolgenden Fokus- und Speicheraktionen. Insbesondere die Schnellaktion `quickNewList` fokussiert damit keine Eingabe mehr in einem geschlossenen Bereich.
- **Desktop-Erreichbarkeit:** Die für Smartphones nachträglich gruppierten Bereiche `mobileListCreation`, `mobileRecentLists` und `mobileGiftExtra` werden ab 760 px geöffnet. Unterhalb davon bleibt die manuell gewählte mobile Klappstellung erhalten; ursprüngliche DOM-Elemente und Event-Handler bleiben bestehen.
- **Formular-Fehlermeldungen:** Listen- und Wunschfelder erhalten bei bestehenden Validierungsfehlern `aria-invalid="true"` und einen `aria-describedby`-Verweis auf `listsStatus`, `editListFeedback` bzw. `wishSaveFeedback`. Bei Listenfehlern werden geschlossene übergeordnete `details` vor dem Setzen des Fokus geöffnet. Nach Korrektur bzw. beim Zurücksetzen werden Fehlerattribute entfernt.
- **Gezielte Prüfung:** Aktuelle `index.html`, `app.mjs` und `lists-dashboard.mjs` nach Veröffentlichung über GitHub neu geladen; alle zehn Inline-JavaScript-Blöcke und beide Module isoliert ohne Syntaxfehler geprüft, 21 öffnende und 21 schließende Style-Tags sowie keine doppelten statischen HTML-IDs. Ein vollständiger angemeldeter Browser-End-to-End-Test steht noch aus.
- **Produktionsschutz:** Änderungen ausschließlich an clientseitiger Navigation, Sichtbarkeit und Zugänglichkeitsattributen; keine Supabase-Schreiboperationen oder Schemaänderungen, keine Testdaten und keine Änderungen vorhandener Produktivdatensätze.

## Entwicklungsfortschritt – 10.11.2026 (Mobile Formularvalidierung und Feldfokus)

- **Listen anlegen/bearbeiten:** Ungültige oder fehlende Listennamen führen nun zu einer direkt mit `aria-invalid="true"` markierten und fokussierten Eingabe; bei der bestehenden Listenbearbeitung gilt dasselbe für ungültige HTTPS-Titelbildadressen. Die vorhandene globale bzw. formularnahe Statusmeldung bleibt erhalten.
- **Wünsche speichern:** Ungültige Amazon.de-Produktlinks, Produkttitel und zu lange Wunsch-Notizen werden dem tatsächlich betroffenen Eingabefeld zugeordnet. Der bestehende Fehlertext wird weiter über die vorhandene Speicherfehlerbehandlung ausgegeben; zusätzlich wandert der Fokus zum Feld und `aria-invalid` kennzeichnet den Fehler für assistive Technologien.
- **Mobiles Design:** Deutliche rote Fokus-/Fehlerumrandung für ungültige Eingaben im Wunsch- und Listen-Editor bei Bildschirmbreiten bis 759 px. Bei Eingabe oder Auswahlwechsel wird die Markierung entfernt; beim erneuten Öffnen/Zurücksetzen des Editors werden alte Markierungen bereinigt.
- **Prüfung:** Die veröffentlichten Dateien `index.html`, `app.mjs`, `lists-dashboard.mjs` aus GitHub neu geladen; alle zehn Inline-JavaScript-Blöcke und beide Module isoliert ohne Syntaxfehler geprüft; 21 öffnende und 21 schließende Style-Tags sowie keine doppelten statischen HTML-IDs. Kein produktiver Browser-End-to-End-Test durchgeführt.
- **Produktionsschutz:** Nur Frontend-Validierungsdarstellung und Fokusführung verändert. Keine neuen oder geänderten Supabase-Abfragen, Migrationen oder Testdaten; keine Produktivdatensätze angefasst.

## Entwicklungsfortschritt – 10.11.2026 (Fokusführung nach Speichern und Abbrechen)

- **Listenbearbeitung:** Vor dem Öffnen des vorhandenen Listen-Editors wird das fokussierte Auslöseelement gemerkt. Beim Abbrechen und nach erfolgreichem Speichern führt die Oberfläche den Tastaturfokus wieder zu diesem Button, sofern er nach der Aktualisierung noch existiert und sichtbar ist. Falls der Button beim Neuzeichnen der Liste entfernt wurde, wird die Listenübersicht programmatisch fokussierbar und als sicherer Rücksprungpunkt genutzt. Auch bei bereits gespeichertem Listendesign mit nachfolgendem Ladefehler wird der Fokus zurückgeführt.
- **Wunschbearbeitung:** Der bestehende Abbruch setzt weiterhin alle Eingabewerte zurück und beendet den Bearbeitungsmodus; zusätzlich wird der Fokus auf den sichtbaren Speichern-Button zurückgeführt, und die globale Statusmeldung bestätigt den Abbruch. `prefers-reduced-motion` wird bei der Navigation berücksichtigt.
- **Barrierefreiheit:** Diese Anpassungen verhindern nach dem Ausblenden des Listenformulars einen Fokus auf einem versteckten Eingabefeld und erhalten einen nachvollziehbaren Tastaturpfad. Keine Änderungen an Formularvalidierung oder Datenbankabfragen.
- **Prüfung:** Nach Veröffentlichung beide JavaScript-Module und `index.html` erneut aus GitHub abgerufen; isolierte JavaScript-Syntaxprüfung der Module (einschließlich Top-Level-`await`) und Inline-Skripte ohne Syntaxfehler, keine doppelten statischen HTML-IDs. Authentifizierter Browser-End-to-End-Test bleibt ausstehend.
- **Produktionsschutz:** Nur clientseitige Fokus-/Scroll- und Statuslogik; keine Supabase-Schreiboperation, keine Migration, keine Testdaten oder Änderungen an Produktivdatensätzen.

## Entwicklungsfortschritt – 10.11.2026 (Formular-Navigation und lokale Fehlermeldungen)

- **Wunschbearbeitung:** Die bestehende Aktion „Bearbeiten“ scrollt nun zum tatsächlichen Wunsch-Editor-Titel statt an den Anfang des davorliegenden Profilbereichs und setzt den Fokus auf die bearbeitbare Notiz. Reduzierte Animation wird berücksichtigt; die Auswahl zur Sichtbarkeit aktualisiert ihren Privatsphäre-Hinweis beim Befüllen bestehender Wünsche.
- **Speicherrückmeldungen:** Zusätzlicher, barrierearm als Live-Region markierter Status `wishSaveFeedback` direkt unter dem Wunsch-Speicherbereich. Fehler aus der bestehenden `run`-Fehlerbehandlung sowie die vorhandenen Erfolgs- und Teilfehlermeldungen werden neben dem Formular angezeigt; die globale Statusmeldung bleibt bestehen.
- **Listenbearbeitung:** `editListFeedback` als lokale Live-Region im vorhandenen Formular `editListForm`. Während der Bearbeitung erscheinen bestehende Listenmeldungen zusätzlich direkt im Formular; das Öffnen scrollt gezielt zum Formular und fokussiert den Namen, „Abbrechen“ kehrt zur Listenübersicht zurück. Es wurden keine Speicherabfragen verändert.
- **Prüfung:** GitHub-Dateien `index.html`, `app.mjs` und `lists-dashboard.mjs` nach den Commits erneut gelesen; HTML-Inline-Skripte und `lists-dashboard.mjs` ohne Syntaxfehler bei statischer JavaScript-Prüfung, CSS-Klammern ausgeglichen. `app.mjs` nutzt bereits Top-Level-`await` und ist deshalb nicht mit einer klassischen Function-Parser-Prüfung als Ganzes validierbar. Authentifizierter Browser-End-to-End-Test weiterhin offen.
- **Produktionsschutz:** UI-, Status- und Navigationsänderungen ohne neue Supabase-Datenbankaufrufe, Migrationen oder Testdaten; vorhandene Produktivdaten werden nicht angefasst.

## Entwicklungsfortschritt – 10.11.2026 (Mobile Wunsch- und Geschenkformulare verbessert)

- **Datenschutzklarheit beim Wunsch-Speichern:** Der bisher statische Hinweis „Dein Wunsch wird öffentlich angezeigt“ wurde an die bestehende Auswahl `wishVisibility` gebunden. Bei `private` erklärt der Hinweis, dass der Wunsch selbst in öffentlichen Listen privat bleibt; bei `public` weist er auf die Sichtbarkeit von Titel und öffentlichen Notizen hin. Aktualisierung bei Eingabe/Auswahl und nach Klicks im Editor; ein `role="status"` mit `aria-live="polite"` unterstützt Screenreader. Die bestehende Speichern-/Supabase-Logik wird nicht verändert.
- **Mobile Wunschlisten-Bearbeitung:** Responsive Begrenzungen für die vorhandenen Wunsch-, Listen- und Listenbearbeitungsfelder, flüssig umbrechende Schaltflächen, breitenbegrenzte Wunschvorschau und mobile 16-px-Eingabeschrift. Preis- und Mengenfelder erhalten passende `inputmode`-Attribute.
- **Separate Geschenkplanungsseite:** `amazon-wishlist/gift-planner.html` bekommt mobile Karten-/Formularabstände, flexible Aktionsbuttons, Fokusmarkierung und einspaltige Kennzahlen auf sehr schmalen Bildschirmen; Budget- und Betragsfelder verwenden `inputmode="decimal"`.
- **Prüfung:** Beide Dateien nach den GitHub-Commits erneut geladen. `index.html`: zehn Inline-Skripte ohne JavaScript-Syntaxfehler, 21 Stylesheets ohne unausgeglichene CSS-Klammern und ohne doppelte statische HTML-IDs. `gift-planner.html`: ein Stylesheet mit ausgeglichenen CSS-Klammern und keine doppelten statischen IDs. Ein authentifizierter End-to-End-Test und echter Live-Viewport-Test stehen aus.
- **Produktionsschutz:** Nur Frontend-HTML/CSS/JS, keine Supabase-Migration oder -Schreiboperation, keine Testdaten, keine Änderung bestehender Wünsche oder Geschenke.

## Entwicklungsfortschritt – 10.11.2026 (Chromium-Viewport-Prüfung und lesbarere mobile Hauptnavigation)

- **Browserprüfung:** Headless Chromium wurde lokal mit einem ausdrücklich **nachgebildeten, reduzierten HTML/CSS-Testaufbau** der mobilen Hauptnavigation, Dashboard-Kennzahlen, Wunschlisten und Geschenkbudget-Flächen verwendet. Prüfformen: 320, 340, 360, 375, 390, 391, 420, 430, 759 und 760 px. In diesen Testansichten trat kein horizontaler Seitenüberlauf auf; die Einspalten- und Zweispaltenwechsel wurden kontrolliert.
- **Sichtbarer Verbesserungsbedarf:** Im nachgebildeten 420-px-Layout beanspruchten längere Hauptnavigations-Bezeichnungen in zwei Spalten mehrere Zeilen. Die tatsächlichen CSS-Regeln im GitHub-Code wurden deshalb um eine gezielte Regel erweitert: bis 440 px erhält die Hauptnavigation eine Spalte mit linksbündigen, gut lesbaren, mindestens 46 px hohen Links.
- **Nachprüfung:** Browser-Testaufbau mit der neuen Regel bei denselben zehn Breiten erneut geprüft; kein horizontaler Seitenüberlauf. Die produktive HTML-Datei enthält ausschließlich zusätzliche CSS-Regeln, keine geänderten IDs, Handler oder Datenzugriffe.
- **Einschränkung:** Die lokale Repository-ZIP enthält den aktuellen `amazon-wishlist/`-Ordner nicht. Ein Abruf der vollständigen GitHub-Live-Seite im Chromium-Container war nicht möglich. Es handelt sich **nicht** um einen vollständigen Live-Screenshot-Test oder authentifizierten End-to-End-Test; die Browser-Fixtures bilden relevante Layoutregeln nach, nicht die gesamte Produktivseite.
- **Produktionsschutz:** Keine Supabase-Migration oder -Schreiboperation, keine Testdaten, keine Änderung bestehender Produktivdatensätze.

## Entwicklungsfortschritt – 10.11.2026 (Mobile-Feinschliff: schmale Displays und Dashboard-Bedienung)

- **Konkreter Layoutfehler behoben:** Der zuletzt ergänzte Mobile-Stylesheet-Block hat bei Bildschirmbreiten unter 390 px versehentlich die bestehende Einspaltenregel des privaten Geschenk-Dashboards mit zwei Spalten überschrieben. Die spätere Regel stellt jetzt bis einschließlich 390 px ausdrücklich eine Spalte her; andere Karten und Eingaben bleiben unverändert.
- **Dashboard-Verwaltung stabilisiert:** Der manuell gewählte Öffnungszustand des Verwaltungsbereichs wird jetzt nur durch eine echte Aktivierung der Zusammenfassung erfasst, nicht durch `toggle`-Ereignisse automatischer Viewport-Anpassungen. Desktop zeigt den Bereich weiterhin offen; Mobilgeräte standardmäßig geschlossen, außer nach manueller Öffnung.
- **Robustheit:** Die Gruppierung des Dashboards hängt nicht mehr von einer ungenutzten, fragilen Abfrage benachbarter Überschriftselemente ab.
- **Prüfung:** Veröffentlichte `amazon-wishlist/index.html` erneut aus GitHub gelesen: neun Inline-Skripte ohne JavaScript-Syntaxfehler, 21 Stylesheets mit ausgeglichenen Klammern und Style-Tags, keine doppelten statischen HTML-IDs; Einspaltenregel und neue Bedienlogik vorhanden.
- **Produktionsschutz:** Nur Frontend-CSS und DOM-Bedienlogik; keine Supabase-Schreiboperation, Migration oder Testdaten. Browser-Visual-Review und angemeldeter End-to-End-Test sind weiterhin offen.

## Entwicklungsfortschritt – 10.11.2026 (Kompakter mobiler Arbeitsbereich und einheitliche Formulare)

- **Mobile Startseite:** Geschenk-Dashboard, eigene Listen, Budgetplaner, Wunschwelten und Geschenkfinder verwenden auf Smartphones ein engeres gemeinsames Abstands- und Überschriftensystem; Verwaltungsdetails bleiben separat aufklappbar.
- **Karten und Kennzahlen:** Vereinheitlichte Radien, Innenabstände und Schatten für bestehende Geschenk-, Listen-, Statistik- und Inspirationskarten. Zweispaltige Kennzahlen bleiben auf kleinen Geräten nutzbar; bei sehr schmalen Viewports erfolgt ein einspaltiger Umbruch.
- **Formulare und Aktionen:** Bestehende Eingaben erhalten auf Smartphones konsistente Mindesthöhen, 16-Pixel-Schrift zur Vermeidung ungewollten iOS-Zooms, sichtbare Fokusmarkierung und Breitenbegrenzung. Aktionen dürfen umbrechen, statt seitlich überzulaufen.
- **Funktions- und Datenschutzschutz:** Ausschließlich zusätzliche responsive CSS-Regeln in `amazon-wishlist/index.html`; keine Änderungen an bestehenden IDs, Formular-Handlern, Supabase-Zugriffen oder Produktivdaten. Keine Testdaten.
- **Prüfung:** GitHub-Datei erneut geladen; neuer Stylesheet-Block genau einmal vorhanden, öffnende und schließende Style-Tags ausgeglichen. Visuelle Prüfung auf echten Smartphones und authentifizierter End-to-End-Test bleiben offen.

## Entwicklungsfortschritt – 10.11.2026 (Mobile Deep-Links und Tastaturzugang)

- **Direkte Navigation:** Hash-Links auf vorhandene Elemente öffnen deren geschlossene übergeordnete `details`-Bereiche automatisch. Das gilt auch für die mobile Dashboard-Verwaltung; bestehende Elemente und IDs bleiben erhalten.
- **Tastatur:** Escape schließt die aktuell fokussierte offene Navigationsgruppe und setzt den Fokus auf deren Zusammenfassung zurück. Die Bedienung bleibt mit nativen `details`-Elementen kompatibel.
- **Produktivdaten:** Ausschließlich clientseitiges JavaScript in `amazon-wishlist/index.html`; keine Supabase-Migration, keine Testdaten, keine Änderung an Konten, Wunschlisten oder Geschenken.
- **Prüfung:** Statischer Abgleich des Skript-Einfügepunkts und einmaliges Vorhandensein des neuen Blocks; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Dashboard-Verwaltung für Smartphones gruppiert)

- **Nutzerführung:** Die Geschenkübersicht wird vor den umfangreichen Verwaltungsoptionen gezeigt. Ein neuer aufklappbarer Bereich „Dashboard verwalten“ gruppiert Layout/Vorschau, Anzeige/Einstellungen und Sicherungen/Verlauf/Datenübernahme.
- **Responsive Verhalten:** Verwaltung auf Smartphones standardmäßig geschlossen, auf größeren Bildschirmen geöffnet; kompaktere Dashboard-Karten, Abstände und Kennzahlen auf kleinen Displays.
- **Funktionsschutz:** Vorhandene Dashboard-Elemente werden als DOM-Knoten verschoben, nicht kopiert; ursprüngliche IDs, Formulare, Aktionen, Statusmeldungen und Sicherungsfunktionen bleiben erhalten.
- **Produktivdaten:** Nur Frontend-HTML/CSS/JS; keine Datenbankmigration, keine Testdaten, keine Änderungen an bestehenden Wunschlisten oder Geschenkdatensätzen.
- **Qualität:** Einmaligkeit der relevanten IDs und Vorhandensein des neuen Panels geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Mobile Orientierung und reduzierte Navigationslast)

- **Neu umgesetzt:** Kontextabhängiger, auf Smartphones erst nach weiterem Scrollen sichtbarer „Nach oben“-Button. Berücksichtigt sichere Bildschirmränder und die Einstellung für reduzierte Bewegung.
- **Nutzerführung:** Die mobile Schnellnavigation markiert den aktuell im Blickfeld befindlichen Bereich. Aufklappbare Hauptmenügruppen schließen nach Auswahl eines enthaltenen Links.
- **Darstellung:** Ruhigere Navigationsflächen, konsistente Karten und Schaltflächen sowie bessere Umbrüche und horizontale Themen-Navigation auf kleinen Displays.
- **Produktivdaten:** Nur HTML, CSS und rein clientseitige Navigationslogik. Keine Supabase-Migration, keine Testdaten und keine Änderungen an Konten, Wunschlisten oder Geschenken.
- **Qualität:** Vorhandensein des neuen Bedienelements und eindeutige IDs der zentralen Bereiche geprüft. Authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Mobile Designverfeinerung: Karten und Navigation)

- **Navigation:** Mobile Hauptnavigation verdichtet; aufklappbare Featuregruppen schließen einander beim Öffnen, damit die Seite nicht durch mehrere offene Menüs unnötig lang wird. Aktiver Sprunglink wird über `aria-current=location` hervorgehoben.
- **Karten:** Einheitliche Touch-Ziele, ruhige Abstände, verbesserte Fokusmarkierungen und flexible Textumbrüche für Wunschlisten, Geschenkbudget, Wunschwelten und Geschenkfinder. Sehr schmale Smartphones erhalten einspaltige Untermenüs.
- **Barrierefreiheit:** Tastaturbedienbare native Details-Elemente, mindestens 44px große Eingaben und Links, Fokusdarstellung und reduzierte Bewegung berücksichtigt.
- **Produktivdaten:** Nur HTML/CSS und clientseitige Navigationslogik; keine Supabase-Migration, keine Testdaten, keine Änderung bestehender Wunschlisten, Konten oder Geschenke.
- **Qualität:** Vorhandensein der neuen Styles und einmalige IDs der vier Kernbereiche geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Einheitliches mobiles Kartendesign)

- **Neu umgesetzt:** Gemeinsame Kartensprache für persönliche Wunschlisten, Geschenkbudget, Wunschwelten und Geschenkfinder: konsistente Oberflächen, Rahmen, Radien, Schatten, Typografie und Abstände mit bestehenden Theme-Variablen.
- **Mobil:** Kompaktere Innenabstände und Überschriften, reduzierte Dekoration, einspaltige Wunschlisten-Karten, übersichtliche Kennzahlen und Budgetergebnisse, kleinere Lücken in Ideen- und Ergebnisrastern.
- **Barrierefreiheit:** Bestehende semantische Bereiche, Schaltflächen, Formular-IDs, Fokusdarstellung und Bedienlogik bleiben erhalten; berücksichtigt reduzierte Bewegung.
- **Produktivdaten:** Nur CSS in `amazon-wishlist/index.html`, keine Supabase-Migration, keine Testdaten, keine Änderung an Daten oder bestehenden JavaScript-Funktionen.
- **Qualität:** Eindeutige IDs der vier zentralen Bereiche und Vorhandensein des neuen Styleblocks geprüft; vollständiger authentifizierter Browser-/Gerätetest steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Kompakte Wunschlisten und Geschenkbudget auf Smartphones)

- **Neu umgesetzt:** Mobile Wunschlisten-Übersicht mit verdichteten Kennzahlen, zweispaltigen Schnellaktionen und reduzierter dekorativer Hero-Fläche. „Zuletzt geöffnet“ und die Einstellungen zur Neuanlage von Listen werden in semantischen, aufklappbaren Bereichen angezeigt; der vorhandene „Liste erstellen“-Schnellzugriff öffnet die Einstellungen automatisch.
- **Budgetplanung:** Kompakte responsive Eingabefelder und Ergebnis-Kacheln; Drucken und Teilen in einer aufklappbaren Zusatzsektion. Auf Desktop bleiben die Inhalte direkt sichtbar.
- **Technik:** Bestehende DOM-Elemente werden lediglich verschoben und nicht dupliziert; IDs und vorhandene Eventhandler bleiben erhalten. Keine Datenbankmigration, keine Testdaten, keine Änderung an produktiven Konten, Wunschlisten oder Geschenken.
- **Qualität:** Authentifizierter Browser-End-to-End-Test auf Smartphones und Desktop steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Mobile Startseite: Eigene Listen und Planung zuerst)

- **Nutzerwunsch:** Auf Smartphones persönliche Wunschlisten und Geschenkplanung vor umfangreichen Inspirations- und Community-Modulen zeigen.
- **Neu umgesetzt:** Vorhandenes privates Geschenk-Startdashboard, persönliche Wunschlisten, Anmeldung und Geschenkbudget werden vor den Wunschwelten platziert. Geschenkfinder und weitere Inspiration bleiben vollständig erreichbar. Die Reihenfolge wird beim Laden durch Verschieben der bestehenden DOM-Knoten hergestellt; keine Komponenten oder Daten werden dupliziert.
- **Mobile Schnellnavigation:** Drei große Sprunglinks „Meine Listen“, „Budget planen“, „Inspiration“, mit responsive zweispaltiger Anordnung auf sehr kleinen Geräten. Auf breiten Bildschirmen bleibt die Hauptnavigation im Vordergrund.
- **Datensicherheit:** Keine Supabase-Migration, keine neuen Abfragen, keine Testdaten, keine Änderungen an bestehenden Konten, Wunschlisten oder Geschenken.
- **Qualität:** Einmalige IDs der betroffenen Bereiche geprüft; authentifizierter Browser-End-to-End-Test auf Mobilgeräten steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Kompakte mobile Startseite und Navigation)

- **Nutzerfeedback:** Der Social-Feed-Banner nahm oberhalb der Wunschlisten viel Platz ein und wiederholte den Benachrichtigungszugriff.
- **Neu umgesetzt:** Banner als schmale Social-Feed-Zeile unter die gruppierte Hauptnavigation verschoben; redundanter Benachrichtigungs-Button entfernt, Hauptnavigation behält Benachrichtigungen. Auf kleinen Smartphones entfällt der zusätzliche Banner-Erklärungstext.
- **Zugänglichkeit:** Direkter Sprunglink zu Wunschwelten, sichtbare Tastatur-Fokusmarkierungen und angepasste helle Farbdarstellung für die drei aufklappbaren Navigationsgruppen.
- **Sicherheit und Daten:** Ausschließlich HTML/CSS-Änderungen, keine Supabase-Abfragen, keine Datenbankmigration, keine Testdaten, keine Änderung an produktiven Wunschlisten oder Konten.
- **Qualität:** Authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Aufgeräumte mobile Hauptnavigation)

- **Nutzerfeedback:** Zu viele gleichwertige Buttons im Kopfbereich auf Smartphones erschweren die Orientierung.
- **Neu umgesetzt:** Vier priorisierte Hauptzugriffe (Meine Wunschlisten, Wünsche entdecken, Geschenkzentrale, Benachrichtigungen) und drei semantisch gruppierte, standardmäßig geschlossene, per Tastatur bedienbare Details-Gruppen (Geschenke planen, Ideen & Inspiration, Community & Social).
- **Erhalt:** Alle bisherigen Navigationsziele inklusive der versteckten Bearbeitungsnavigation bleiben erreichbar; keine Datenbankänderung, keine Testdaten, keine Änderung an Produktivdatensätzen.
- **Mobil:** Zwei Spalten für Hauptzugriffe auf üblichen Smartphone-Breiten, einspaltige Gruppen, große Touch-Ziele. Browser-End-to-End-Prüfung mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Erweiterter Vergleich privater Cloud-Filterfavoriten)

- **Neu umgesetzt:** Lesender Detailvergleich zweier angehefteter Cloud-Filteransichten mit nebeneinanderliegenden Datums-, Layout-, Änderungsbereichs- und Kategorieeinstellungen; abweichende Felder werden farblich markiert.
- **Monatsanalyse:** Gemeinsame Monatsübersicht zeigt Treffer je Ansicht und Schnittmenge pro Monat; Ergebniszusammenfassung mit exklusiven und gemeinsamen Sicherungspunkten.
- **Mobil:** Horizontal scrollbar gehaltene Tabellen und kompakte Darstellung auf Smartphones.
- **Sicherheit:** Ausschließlich bereits eigentümergebunden geladene Daten, keine Migration, keine Testdaten. RLS und Tabellenprivilegien für Cloud-Filteransichten, Präferenzen, Historie und Sicherungspunkte geprüft; kein anonymer Lesezugriff, keine direkten Schreibrechte für Historie/Sicherungspunkte.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Privater Favoritenvergleich für Sicherungspunkte)

- **Neu umgesetzt:** Zwei angeheftete Cloud-Filteransichten in einem responsiven, lesenden Vergleich gegenüberstellen. Auswahl A/B, Trefferzahl, Schnittmenge, exklusive Treffer und Anzahl der Treffer mit Abweichungen zur aktuellen Dashboard-Konfiguration.
- **Privatsphäre:** Vergleich nur über bereits privat geladene Sicherungspunkte und eigene Cloud-Ansichten; keine neue Datenbankabfrage oder Migration, keine Testdaten. Bei Kontoabmeldung wird die Vergleichsoberfläche verborgen.
- **Sicherheit:** RLS und Tabellenprivilegien für Cloud-Filteransichten, Dashboard-Präferenzen, Historie und Sicherungspunkte geprüft; kein anonymer Lesezugriff, keine direkten Schreibrechte auf Sicherungspunkte/Historie.
- **Qualität:** JavaScript-Syntax geprüft. Authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Gebündelte Favoriten-Navigation)

- **Neu umgesetzt:** Private Monatsvorschau angehefteter Sicherungspunkt-Filteransichten mit Zurück/Weiter-Navigation, gezieltem Öffnen je Favorit und Schließen der Vorschau. Alle Vorschauaktionen verändern die aktiven Filter nicht; die gesonderte Anwenden-Schaltfläche bleibt erhalten.
- **Mobil und barrierearm:** Responsive Navigation mit großen Touch-Zielen und beschrifteten Vorschau-Schaltflächen.
- **Sicherheit:** Keine Datenbankmigration und keine Testdaten. RLS und Berechtigungen für Cloud-Filteransichten, Präferenzen, Historie und Sicherungspunkte erneut geprüft; kein anonymer Lesezugriff und keine direkten Schreibrechte auf Historie/Sicherungspunkte.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Gebündelte Favoriten-Monatsvorschau und Weiter-Button)

- **Neu umgesetzt:** Favoriten-Schnellleiste um einen ausdrücklich beschrifteten „▶️ Weiter – nächsten Favoriten ansehen“-Button ergänzt. Er durchläuft angeheftete Filteransichten zyklisch, ohne die aktiven Filter zu verändern.
- **Monatsvorschau:** Passende Sicherungspunkte pro Monat werden vor Anwendung anhand bereits geladener privater Daten berechnet und als mobile, barrierearm beschriftete Balken dargestellt. Ein gesonderter Button aktiviert die Vorschau-Filter auf Wunsch.
- **Sicherheit:** Keine Datenbankmigration, keine Testdaten und keine Änderung an Sicherungspunkten oder Produktivdaten. RLS und anonyme Leserechte für Cloud-Filteransichten, Präferenzen, Historie und Sicherungspunkte überprüft.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Ergebnisvorschau in der Favoriten-Schnellleiste)

- **Neu umgesetzt:** Angeheftete Cloud-Filteransichten zeigen direkt in der mobilen Schnellleiste die Anzahl passender, bereits geladener privater Dashboard-Sicherungspunkte vor dem Anwenden.
- **Filterparität:** Trefferzählung berücksichtigt Datumsgrenzen, gespeichertes aktives Layout, abweichenden Einstellungsbereich sowie die UND-Verknüpfung aller ausgewählten Änderungskategorien. Die Vorschau verändert keine aktiven Filter.
- **Sicherheit:** Rein lokale Berechnung über bereits eigentümergebunden geladene Daten; keine neuen Datenbankabfragen, keine Migration, keine Testdaten. RLS und Rechte für Cloud-Ansichten, Präferenzen, Historie und Sicherungspunkte erneut geprüft.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Favoriten-Schnellleiste für private Sicherungspunkte)

- **Neu umgesetzt:** Horizontale, mobil scrollbar angelegte Schnellleiste direkt über der privaten Dashboard-Sicherungspunkt-Zeitachse. Angeheftete Cloud-Filteransichten können mit einem Klick angewendet werden; der aktuelle Filterzustand wird per `aria-pressed` kenntlich gemacht.
- **Synchronisierung:** Schnellleiste verwendet ausschließlich die bereits privat geladenen, owner-gebundenen Cloud-Ansichten; reagiert auf Favoritenänderungen und auf das Anwenden von Filteransichten. Bei Kontoabmeldung wird sie geleert.
- **Sicherheit:** Keine Datenbankmigration, keine Testdaten, keine Änderungen an Sicherungspunkten oder Produktivdaten. RLS und Privilegien der Cloud-Filteransichten, Präferenzen, Historie und Sicherungspunkte geprüft.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Favoriten für private Cloud-Filteransichten)

- **Neu umgesetzt:** Persönliche Cloud-Filteransichten können per Schaltfläche als Favorit angeheftet oder wieder gelöst werden. Angeheftete Ansichten erscheinen in der responsiven Kartenübersicht zuerst, danach alphabetisch.
- **Persistenz:** Neues boolesches Feld `is_favorite` (Standard `false`) in `wishlist_gift_checkpoint_filter_views`. Vorhandene Ansichten bleiben unverändert und erhalten den Standardwert. Favoriten werden owner-gebunden in Supabase synchronisiert; Duplikate und importierte Ansichten starten ohne Favoritenstatus.
- **Sicherheit:** RLS und Tabellenprivilegien für Cloud-Ansichten, Präferenzen, Historie und Sicherungspunkte geprüft; kein anonymer Lesezugriff, Sicherungspunkte und Historie ohne direkte Schreibrechte. Keine Testdaten und keine Änderungen an Geschenk- oder Planungsdaten.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Kartenübersicht privater Cloud-Filteransichten)

- **Neu umgesetzt:** Responsive Kartenübersicht für alle privaten Cloud-Filteransichten der Dashboard-Sicherungspunkt-Zeitachse, mit Namen, gespeicherter Filterkombination und letztem Änderungsdatum.
- **Interaktion:** Jede Karte bietet eine lesende Vorschau mit Anzahl der Unterschiede zu aktuellen Filtern sowie die direkte Anwendung der gespeicherten Filter. Keine Änderungen an Sicherungspunkten oder deren Wiederherstellungsablauf.
- **Sicherheit:** Keine Datenbankmigration und keine Testdaten. RLS und Berechtigungen für Cloud-Ansichten, Dashboard-Präferenzen, Historie und Sicherungspunkte geprüft. Kein anonymer Lesezugriff; Sicherungspunkte und Historie weiterhin nicht direkt beschreibbar.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Cloud-Filteransichten verwalten)

- **Neu umgesetzt:** Bestehende Cloud-Filteransichten lassen sich mit einem neuen Namen atomar umbenennen oder unter einem freien Namen duplizieren. Ausgewählte Ansichten zeigen das letzte Änderungsdatum und die Anzahl der gespeicherten Kategorien.
- **Sicherheit:** Umbenennen über `wishlist_rename_checkpoint_filter_view` als SECURITY INVOKER mit `auth.uid()`-Eigentümerprüfung; Cloud-Tabelle bleibt owner-RLS-geschützt. Kein anonymer Zugriff. Duplizieren erzeugt nur eine neue eigene Ansicht, niemals eine Sicherungspunktkopie.
- **Produktivdaten:** Keine bestehenden Ansichten oder Sicherungspunkte migriert, gelöscht oder verändert. Keine Testdaten. RLS und Berechtigungen der vier relevanten Tabellen erneut geprüft.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Geräteübergreifende private Filteransichten)

- **Neu umgesetzt:** Private Supabase-Tabelle `wishlist_gift_checkpoint_filter_views` mit owner-gebundenen Namen, Filter-JSON und Kategorien; RLS-Policies für ausschließlich eigene Lese-/Schreibzugriffe, kein anonymer Zugriff.
- **Cloud-Synchronisierung:** Persönliche Filteransichten lassen sich geräteübergreifend laden, speichern, anwenden und nach Bestätigung löschen. Oberfläche für maximal fünf Ansichten je Konto.
- **Lokaler Bestand:** Bisherige browserlokale Ansichten werden nicht gelöscht oder automatisch überschrieben. Ausdrücklich bestätigter Import kopiert freie, noch nicht gleichnamig vorhandene Ansichten in die Cloud und lässt lokale Originale unverändert.
- **Sicherheit:** Keine bestehenden Tabellen oder Produktivdatensätze migriert oder gelöscht; keine Testdaten. RLS und Privilegien für Cloud-Ansichten, Dashboard-Präferenzen, Historie und Sicherungspunkte überprüft.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private gespeicherte Filteransichten)

- **Neu umgesetzt:** Bis zu fünf benannte Filterkombinationen pro angemeldetem Konto für die private Dashboard-Sicherungspunkt-Zeitachse speichern, anwenden, nach Bestätigung überschreiben und löschen.
- **Umfang:** Datumsfilter, Layout, abweichender Einstellungsbereich und interaktive Mehrfachkategorien werden gemeinsam gespeichert. Die Filteransichten sind browserlokal (localStorage), nach Nutzer-ID getrennt und **nicht geräteübergreifend synchronisiert**; es werden keine Sicherungspunkt-Inhalte lokal gespeichert.
- **Sicherheit:** Keine Datenbankmigration, keine Testdaten. RLS und Rechte für Dashboard-Einstellungen, Historie und Sicherungspunkte erneut geprüft; keine anonymen Leserechte und keine direkten Schreibrechte für Historie/Sicherungspunkte. Produktivdaten bleiben unverändert.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Interaktive private Sicherungspunkt-Änderungsanalyse)

- **Neu umgesetzt:** Anklickbare, per Tastatur bedienbare Änderungskategorien in der privaten Dashboard-Zeitachse; Mehrfachauswahl verwendet UND-Verknüpfung und lässt sich mit Datums-, Layout- und bisherigen Änderungsfiltern kombinieren. Die Schaltflächen kennzeichnen ihren Zustand mit aria-pressed.
- **Historischer Vergleich:** Zwei unterschiedliche private Sicherungspunkte lassen sich anhand der Zeitstempel auswählen und in einer Tabelle über alle zwölf Dashboard-Einstellungsfelder vergleichen; abweichende Werte werden markiert. Der Vergleich speichert nichts.
- **Wiederherstellung:** Bleibt über den gesonderten Vergleich mit der aktuellen Konfiguration und ausdrückliche Bestätigung geschützt. Historischer A/B-Vergleich allein löst keine Wiederherstellung aus.
- **Sicherheit:** Keine Migration, keine Testdaten. RLS und Rechte für Einstellungen, Historie und Sicherungspunkte erneut überprüft; kein anonymer Lesezugriff, keine direkten Schreibrechte für Historie/Sicherungspunkte. Geschenkaufgaben, Anlässe und historische Produktivdaten unverändert.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus. Kategorien beschreiben Abweichungen zur aktuellen Konfiguration.

## Entwicklungsfortschritt – 10.11.2026 (Visuelle private Sicherungspunkt-Änderungsübersicht)

- **Neu umgesetzt:** Responsives Statistik-Dashboard innerhalb der privaten Sicherungspunkt-Zeitachse: Anzahl gefilterter Sicherungspunkte, Monatsanzahl und Anzahl der Sicherungspunkte mit Abweichungen zur aktuellen Konfiguration.
- **Änderungskategorien:** Farblich unterschiedene Kategorien für Layouts, Sichtbarkeit, Kennzahlen, Schnellzugriffe/Favoriten und Sortierung. Kategorien erscheinen als aggregierte Badges und direkt an einzelnen Sicherungspunkten.
- **Monatsstatistik:** Mobil lesbare Balken pro Monat zeigen die relative Anzahl der Sicherungspunkte. Auswertungen aktualisieren sich mit den bestehenden Datums-, Layout- und Änderungsfiltern.
- **Sicherheit:** Keine Migration, keine Testdaten. RLS und Rechte für Einstellungen, Historie und Sicherungspunkte erneut geprüft; keine anonymen Leserechte, keine direkten Schreibrechte für Sicherungspunkte und Historie. Produktive Geschenkaufgaben, Anlässe und historische Planungsdaten unverändert.
- **Qualität:** JavaScript-Syntax geprüft; ein authentifizierter Browser-End-to-End-Test steht aus. Alle Kategorieangaben sind Unterschiede zur aktuellen Konfiguration, keine Rekonstruktion des damaligen Änderungsgrundes.

## Entwicklungsfortschritt – 10.11.2026 (Mobile Monatsnavigation für Sicherungspunkt-Zeitachse)

- **Neu umgesetzt:** Monatlich gruppierte private Dashboard-Sicherungspunkt-Zeitachse mit horizontal scrollbar angeordneten, mobil nutzbaren Monats-Sprungmarken und Links zurück zur Monatsnavigation.
- **Kompakte Änderungen:** Jeder Sicherungspunkt zeigt maximal drei abweichende Einstellungsfelder mit Hinweis auf weitere Unterschiede; die aufklappbaren vollständigen Änderungsdetails bleiben erhalten. Die Monatsübersicht zeigt Anzahl der Sicherungspunkte und die gefilterte Zusammenfassung die Feldabweichungen gegenüber der aktuellen Konfiguration.
- **Filter und Wiederherstellung:** Vorhandene Datums-, Layout- und Änderungsfilter sowie Vergleich und ausdrückliche Bestätigung vor Wiederherstellung bleiben erhalten. Monatsgruppen beziehen sich auf die aktuell gefilterten Sicherungspunkte.
- **Sicherheit:** Keine Migration, keine Testdaten. RLS für Präferenzen, Verlauf und Sicherungspunkte geprüft; anonyme Nutzer ohne Leserechte, Verlauf und Sicherungspunkte ohne direkte Schreibrechte. Geschenkaufgaben, Anlässe und historische Produktivdaten unverändert.
- **Qualität:** JavaScript-Syntax geprüft. Ein authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Mobile private Sicherungspunkt-Zeitachse)

- **Neu umgesetzt:** Responsiv gestaltete, chronologische Zeitachse für die maximal 20 privaten Dashboard-Sicherungspunkte mit Zeitstempel, aktivem Layout und Anzahl der Unterschiede zur aktuellen Konfiguration.
- **Änderungsdetails:** Aufklappbare Details zeigen für alle abweichenden Felder die gespeicherten Werte des Sicherungspunkts und die aktuellen Werte. Datums-, Änderungsbereichs- und Layoutfilter bleiben erhalten.
- **Wiederherstellung:** Weiterhin nur nach Vorher-Nachher-Vergleich und ausdrücklicher Bestätigung; bestehender Sicherungspunkt-Trigger erstellt bei tatsächlichen Änderungen automatisch einen neuen Sicherungspunkt.
- **Sicherheit:** Keine Migration, keine Testdaten. RLS und Rechte für Präferenzen, Historie und Sicherungspunkte erneut überprüft; kein anonymer Lesezugriff und keine direkten Schreibrechte auf Historie/Sicherungspunkte. Geschenkaufgaben, Anlässe und historische Produktivdaten bleiben unverändert.
- **Qualität:** JavaScript-Syntax geprüft. Ein authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Sicherungspunktfilter)

- **Neu umgesetzt:** Suche in den maximal 20 privaten Dashboard-Sicherungspunkten nach Datum (Von/Bis), aktiver Layout-Ansicht und abweichendem Einstellungsbereich (Layouts/Vorlagen, Sichtbarkeit, Kennzahlen, Schnellzugriffe/Favoriten, Sortierung/Reihenfolge).
- **Transparenz:** Der Änderungsbereich beschreibt Unterschiede des Sicherungspunkts zur aktuell geladenen Dashboard-Konfiguration, nicht die Ursache seiner damaligen Erstellung. Filter arbeiten lokal auf owner-gefilterten Datensätzen; Rücksetzen und Aktualisieren sind möglich.
- **Wiederherstellung:** Vorher-Nachher-Vergleich und ausdrückliche Bestätigung bleiben erhalten.
- **Datenschutz:** Keine Migration, keine Testdaten. RLS und Rechte für Präferenzen, Verlauf und Sicherungspunkte erneut überprüft; anonyme Zugriffe ausgeschlossen, Sicherungspunkte und Verlauf ohne direkte Schreibrechte. Geschenkaufgaben, Anlässe und historische Produktivdaten unverändert.
- **Qualität:** JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Vergleich automatischer Dashboard-Sicherungspunkte)

- **Neu umgesetzt:** Vorher-Nachher-Vergleich eines automatischen Sicherungspunkts mit der aktuellen Dashboard-Konfiguration in einer mobil horizontal scrollbar dargestellten Tabelle.
- **Transparenz:** Alle zwölf Einstellungsfelder werden angezeigt, Unterschiede hervorgehoben und gezählt; persönliche Layout-Vorlagen werden einschließlich ihrer Werte verglichen.
- **Sicheres Wiederherstellen:** Eine frühere Konfiguration kann erst nach Vergleich und ausdrücklicher Bestätigung übernommen werden. Hat sich die lokale aktuelle Konfiguration zwischen Vergleich und Bestätigung geändert, wird eine erneute Prüfung verlangt.
- **Datenschutz:** Keine neue Migration und keine Testdaten. RLS für Präferenzen, Auditverlauf und Sicherungspunkte überprüft; anon ohne SELECT, Auditverlauf und Sicherungspunkte ohne direkte Schreibrechte. Geschenkaufgaben, Anlässe und Jahresabschlüsse bleiben unverändert.
- **Qualität:** JavaScript-Syntax geprüft; Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Automatische private Dashboard-Sicherungspunkte)

- **Neu umgesetzt:** Vor jeder tatsächlich veränderten bestehenden Dashboard-Konfiguration legt ein Datenbank-Trigger automatisch einen vollständigen Snapshot des vorherigen Zustands an. Es werden maximal 20 Sicherungspunkte je Konto vorgehalten; ältere Sicherungspunkte werden durch den Trigger automatisch bereinigt.
- **Produktivmigration:** `wishlist_automatic_private_dashboard_checkpoints` erstellt `wishlist_gift_home_checkpoints`, Owner-SELECT-RLS und den geschützten BEFORE UPDATE-Trigger auf `wishlist_gift_home_preferences`. Bestehende Einstellungen bleiben erhalten; Sicherungspunkte beginnen erst bei zukünftigen Änderungen.
- **Oberfläche:** Privater Bereich mit Sicherungspunkten, Zeitstempeln, Änderungsübersicht und ausdrücklicher Bestätigung vor der Wiederherstellung. Die Wiederherstellung erzeugt selbst einen neuen Sicherungspunkt der vorherigen Konfiguration und einen Eintrag im unveränderten Auditverlauf.
- **Sicherheit:** Checkpoints: RLS aktiviert, kein anon-SELECT, keine direkten INSERT/UPDATE/DELETE-Rechte für authentifizierte Nutzer. Einstellungen und Auditverlauf ebenfalls mit aktivem Owner-RLS geprüft. Keine Testdaten und keine Änderungen an Geschenkaufgaben, Anlässen oder Jahresabschlüssen.
- **Qualität:** JavaScript-Syntax geprüft; ein authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private JSON-Sicherung und validierter Dashboard-Import)

- **Neu umgesetzt:** Lokaler JSON-Export der eigenen Dashboard-Konfiguration (Sichtbarkeit, Reihenfolge, Kennzahlen, Sortierungen, Schnellzugriffe, Favoriten, aktive Ansicht und gespeicherte Layouts) mit Formatkennung und Version.
- **Sicherer Import:** Lokale Dateiprüfung (max. 64 KB), strikte Format-/Versions- und Wertevalidierung, Gegenüberstellung aller zwölf Einstellungsfelder mit hervorgehobenen Unterschieden. Ein Import wird erst nach ausdrücklicher Bestätigung in die owner-geschützte Präferenztabelle geschrieben; zwischenzeitlich veränderte Einstellungen machen die Vorschau ungültig.
- **Nachvollziehbarkeit:** Der vorhandene geschützte Datenbank-Trigger protokolliert tatsächlich geänderte importierte Einstellungen im privaten Verlauf. Export/Dateivorschau verändern keine Datenbankdaten.
- **Sicherheit:** Owner-only RLS für Präferenzen und Verlauf geprüft; anon kein Lesen, Verlauf keine direkten Schreibrechte. Keine neue Migration, keine Testdaten und keine Änderungen an Geschenkaufgaben, Anlässen oder historischen Produktivdaten.
- **Qualität:** JavaScript-Syntax geprüft. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Privater Vergleich historischer Dashboard-Einstellungen)

- **Neu umgesetzt:** Zwei gespeicherte historische Dashboard-Konfigurationen lassen sich aus den letzten 30 Verlaufseinträgen auswählen und in einer mobil horizontal scrollbar dargestellten Tabelle vergleichen.
- **Nachvollziehbare Unterschiede:** Alle zwölf Dashboard-Einstellungsfelder werden nebeneinander gezeigt; abweichende Zeilen hervorgehoben und gezählt. Gespeicherte Vorlagen werden einschließlich ihrer enthaltenen Einstellungen lesbar aufgeschlüsselt.
- **Wiederherstellung:** Jede vollständig gültige ausgewählte Version kann nach ausdrücklicher Bestätigung wiederhergestellt werden. Dies verwendet die vorhandene owner-geschützte Einstellungstabelle und erzeugt über den bestehenden Trigger einen neuen historischen Eintrag.
- **Sicherheit und Datenbestand:** Keine Migration und keine Testdaten. Owner-only RLS beider Tabellen erneut geprüft, Historie ohne direkte INSERT/UPDATE/DELETE-Rechte, anon ohne Leserechte. Geschenkaufgaben, Anlässe und historische Produktivdaten unverändert.
- **Prüfung:** JavaScript-Syntax geprüft. Ein Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Privater Dashboard-Einstellungsverlauf)

- **Neu umgesetzt:** Eigentümergefilterter Einstellungsverlauf mit Zeitstempel, tatsächlich geänderten Konfigurationsfeldern und explizit bestätigter Wiederherstellung früherer vollständiger Konfigurationen.
- **Produktivmigration:** `wishlist_private_immutable_dashboard_settings_history` legt `wishlist_gift_home_history` an. Ein geschützter AFTER INSERT/UPDATE-Trigger protokolliert neue bzw. tatsächlich veränderte Einstellungen mit vorherigem und neuem JSON-Snapshot. Keine rückwirkende Rekonstruktion historischer Änderungen.
- **Sicherheit:** Historientabelle: RLS aktiviert, owner-only SELECT, kein anonymes Lesen und keine direkten INSERT/UPDATE/DELETE-Rechte für authentifizierte Nutzer. Die Wiederherstellung schreibt nur in die bereits owner-geschützte Präferenztabelle und erzeugt dadurch einen neuen Historieneintrag. Alle Geschenkaufgaben, Anlässe und historischen Produktivdaten bleiben erhalten.
- **Frontend:** Auf `amazon-wishlist/index.html` ein privater Verlauf mit maximal 30 neuesten Einträgen; `gift-start.mjs` zeigt nachvollziehbare Feldänderungen und erlaubt eine bestätigte Wiederherstellung, soweit der gespeicherte Snapshot gültig ist.
- **Prüfung:** RLS und Rechte beider Tabellen geprüft, JavaScript-Syntax geprüft. Keine Testdaten. Authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Layout-Vorschau, Rückgängig und Standardansicht)

- **Neu umgesetzt:** Nicht persistente Vorschau der drei Dashboard-Vorlagen und individueller Formulareinstellungen; aktive Layouts werden erst nach ausdrücklicher Bestätigung gespeichert.
- **Rückgängig:** Eine laufende Vorschau kann verworfen werden; die vorherige Ansicht wird aus dem gespeicherten lokalen Zustand wiederhergestellt.
- **Zurücksetzen:** Standardeinstellungen können nach Rückfrage als Vorschau angezeigt und anschließend ausdrücklich dauerhaft übernommen werden. Persönlich gespeicherte Vorlagen bleiben erhalten.
- **Datenschutz:** Keine neue Migration und keine Testdaten. Nur bestätigte Einstellungen werden in der vorhandenen owner-geschützten Präferenztabelle gespeichert. RLS erneut überprüft (aktiv, kein anon-SELECT). Aufgaben, Anlässe und historische Produktivdaten bleiben unverändert.
- **Prüfung:** JavaScript-Syntax geprüft; Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Gespeicherte private Dashboard-Layouts)

- **Neu umgesetzt:** Schnellwechsel zwischen den vordefinierten Layouts „Kompakt“, „Tagesplanung“, „Geschenküberblick“ und dem aktuellen individuellen Layout. Drei Vorlagenplätze können mit einer persönlichen Momentaufnahme der aktuellen Dashboard-Einstellungen überschrieben werden (nach ausdrücklicher Bestätigung).
- **Gespeicherter Umfang:** Sichtbarkeit und Reihenfolge der vier Bereiche, Kennzahlen, Aufgaben- und Anlasssortierung, Schnellzugriffe und Favoriten. Der aktivierte Layoutschlüssel wird nutzergebunden gespeichert und beim nächsten Besuch geladen.
- **Produktivmigration:** `wishlist_private_home_saved_layout_presets` ergänzt `wishlist_gift_home_preferences` um `saved_layouts jsonb` und `active_layout` mit begrenzten Layoutschlüsseln und Größenbeschränkung. Bestehende Produktivdaten bleiben unverändert; Standardansicht ist „Individuell“.
- **Sicherheit:** Owner-only RLS der Präferenztabelle bestätigt, anon kein SELECT; Speichern und Aktivieren nur nach explizitem Nutzerklick. Clientseitige Schema-/Werteprüfung für Vorlagen. Keine Testdaten oder Änderungen an Geschenkaufgaben/Anlässen/Jahresabschlüssen.
- **Qualität:** JavaScript-Syntax geprüft; ein authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Individuelle private Dashboard-Karten und Favoriten)

- **Neu umgesetzt:** Sechs einzeln auswählbare Kennzahlen (offene/überfällige/heute fällige/erledigte Aufgaben, Anlässe in 30 Tagen, aktuelle Erledigungsquote), konfigurierbare Schnellzugriffe und persönliche Favoriten zu sieben bekannten internen Helferlein-Seiten.
- **Produktivmigration:** `wishlist_private_home_metric_links_favorites` ergänzt `wishlist_gift_home_preferences` um `metric_keys`, `quick_links`, `favorite_links` mit eingeschränkten zulässigen Schlüsseln und sinnvollen Standardwerten. Bestehende Präferenzen und alle Aufgaben-/Anlassdaten bleiben erhalten.
- **Sicheres Speichern:** Auswahl ausschließlich nach ausdrücklichem Speichern in der owner-geschützten Einstellungstabelle. Client validiert die Schlüssel und Mindestanzahl von Kennzahlen; die Datenbank prüft zulässige Schlüssel und Arraygrößen. Keine externen Linkziele.
- **Frontend:** `amazon-wishlist/index.html` ergänzt Einstellungsgruppen und getrennte Favoriten-/Schnellzugriffskarten; `gift-start.mjs` lädt und rendert die eigenen Präferenzen.
- **Prüfung:** Owner-only RLS und fehlende anon-Leserechte erneut bestätigt; JavaScript-Syntax geprüft. Keine Testdaten. Authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Frei anordenbares privates Startdashboard)

- **Neu umgesetzt:** Individuelle Reihenfolge der vier Startdashboard-Bereiche (Kennzahlen, Tagesaufgaben, kommende Anlässe, Aufgabenfortschritt) mit mobil bedienbaren, tastaturzugänglichen Aufwärts-/Abwärts-Schaltflächen.
- **Produktivmigration:** `wishlist_private_home_section_order` ergänzt `wishlist_gift_home_preferences.section_order` als validiertes Text-Array mit allen vier Bereichskennungen; bestehende Einstellungszeilen erhalten die bisherige Standardreihenfolge. Keine Änderung an Aufgaben, Anlässen oder historischen Produktivdaten.
- **Speichern:** Reihenfolge wird zunächst nur lokal im Formular verändert; erst nach ausdrücklichem Klick auf „Einstellungen sicher speichern“ mit den bestehenden Anzeige- und Sortiereinstellungen owner-gefiltert gespeichert. Die Datenbank prüft Vollständigkeit und gültige Werte.
- **Sicherheit:** Owner-only RLS der Präferenztabelle erneut überprüft, anon keine Leserechte; kein Testdatensatz erstellt. JavaScript-Syntax geprüft; authentifizierter Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Personalisierbares privates Geschenk-Startdashboard)

- **Neu umgesetzt:** Einstellbare Sichtbarkeit für Kennzahlen, Tagesaufgaben, kommende Anlässe und Aufgabenfortschritt sowie bevorzugte Aufgabensortierung (Dringlichkeit/Priorität/Fälligkeit) und Anlasssortierung (Termin/Titel).
- **Produktivmigration:** `wishlist_private_gift_home_display_preferences` erstellt `wishlist_gift_home_preferences` mit genau einer Zeile pro Nutzer und abgesicherten Sortierwerten. Bestehende Daten und historische Ereignisse nicht verändert; keine Testdaten.
- **Sicheres Speichern:** Owner-only RLS für SELECT/INSERT/UPDATE/DELETE, keine anonymen Tabellenrechte. Änderungen werden erst nach Klick auf „Einstellungen sicher speichern“ als nutzergebundenes Upsert gespeichert. Ohne Datensatz gelten sichere Standardwerte.
- **Frontend:** `amazon-wishlist/index.html` bietet mobile Einstellungsoberfläche; `gift-start.mjs` lädt die eigenen Präferenzen nach Anmeldung und aktualisiert Anzeige und Sortierung nach erfolgreichem Speichern.
- **Prüfung:** RLS und anonyme Lesesperre für Präferenzen, Aufgaben und Anlässe bestätigt; JavaScript-Syntax geprüft. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Privates Geschenk-Startdashboard)

- **Neu umgesetzt:** Mobilfreundliches, privates Geschenk-Startdashboard direkt auf `amazon-wishlist/index.html` mit eigenem Modul `gift-start.mjs`. Es erscheint nur nach erfolgreicher Supabase-Anmeldung und aktualisiert sich bei Authentifizierungsänderungen.
- **Inhalte:** Offene und überfällige Aufgaben, heute fällige Tagesprioritäten mit Begründung und Priorität, nächste drei einmalige/wiederkehrende Anlässe mit transparentem Standard-Planungsvorlauf von 21 Tagen, persönlicher Fortschritt anhand aktuell nicht archivierter Aufgaben.
- **Navigation:** Direkte Links zum privaten Geschenk-Planungscockpit, zur Tagesplanung und zur Aufgabenverwaltung. Keine automatischen Aufgabenaktionen.
- **Datenschutz:** Ausschließlich owner-gefilterte paginierte SELECT-Abfragen auf `wishlist_gift_tasks` und `wishlist_occasions`. RLS und owner-only SELECT für beide Tabellen geprüft; anon keine Leserechte. Keine Migration, keine Testdaten, keine Änderung bestehender Produktivdaten. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Privates mobiles Geschenk-Planungscockpit)

- **Neu umgesetzt:** `amazon-wishlist/gift-cockpit.html` und `gift-cockpit.mjs` als mobile, private Übersichtsseite. Verlinkung aus `gift-assistant.html`.
- **Tagesprioritäten:** Eigentümergefilterte offene Geschenkaufgaben mit Fälligkeit bis heute, überfällige zuerst, dann gespeicherte Priorität; nachvollziehbare Gründe und Links zur Aufgabenverwaltung.
- **Kommende Anlässe:** Wiederkehrende und einmalige Anlässe nach nächstem Datum, mit transparentem Standard-Planungsvorlauf von 21 Tagen; keine automatische Checklistenübernahme.
- **Fortschritt und Historie:** Aktueller Erledigungsstand nicht archivierter Aufgaben; separate Zählung tatsächlich protokollierter Erledigungs- und Verschiebungsereignisse; historische Geschenk-Jahresabschlüsse als eigene unveränderliche Datenquelle.
- **Empfehlungen:** Regelbasierte Hinweise zu überfälligen Aufgaben, nahenden Anlässen, Terminverschiebungen und vorhandenen Jahresabschlüssen. Kein AI- oder Erfolgsversprechen.
- **Datenschutz:** Ausschließlich owner-gefilterte, paginierte SELECT-Abfragen auf `wishlist_gift_tasks`, `wishlist_occasions`, `wishlist_gift_year_closings`, `wishlist_gift_task_events`. RLS und owner-only SELECT auf allen vier Tabellen überprüft; anon kein SELECT. Keine Migration, keine Testdaten, keine Produktivdaten geändert. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Privater Aufgaben-Erfolgsbericht)

- **Neu umgesetzt:** Monatsübersichten für Erledigungs-, Terminverschiebungs- und Wiedereröffnungsereignisse; Anlassvergleiche und transparente, regelbasierte persönliche Empfehlungen im privaten `gift-task-report.html`/`gift-task-report.mjs`.
- **Sicherer Export:** Nach explizitem Bestätigungsdialog wird ausschließlich der owner-gefilterte, vollständig geladene Ereignisbestand als lokale JSON-Datei heruntergeladen. Keine serverseitige Veröffentlichung und keine Datenbankänderung.
- **Produktivmigration:** `wishlist_task_events_occasion_snapshot_for_future_history` ergänzt nullable `occasion_id`/`occasion_title` am Ereignis und speichert sie im vorhandenen Trigger bei künftigen Status- und Terminänderungen. Keine Rückbefüllung, keine Veränderung bestehender Aufgaben, historischer Ereignisse oder Jahresabschlüsse.
- **Methodik:** Ausschließlich protokollierte Ereignisse; ältere Ereignisse ohne Anlass-Snapshot werden als historisch nicht zugeordnet ausgewiesen. Monatsvergleiche messen Ereignisaktivität, nicht den Anteil aller abgeschlossenen Aufgaben. Empfehlungen werden aus gezählten Ereignissen begründet.
- **RLS:** `wishlist_gift_task_events` owner-only SELECT; anon keine Leserechte, authenticated kein direktes INSERT/UPDATE/DELETE. Kein Browser-End-to-End-Test mit angemeldetem Konto durchgeführt.

## Entwicklungsfortschritt – 10.11.2026 (Privater Aufgaben-Fortschrittsbericht)

- **Neu umgesetzt:** Druckfertiger, mobiler Aufgaben-Fortschrittsbericht in `amazon-wishlist/gift-task-report.html` und `gift-task-report.mjs`, verlinkt aus der Geschenk-Planungsassistenz.
- **Ereignisbasierte Kennzahlen:** Tatsächlich protokollierte Erledigungen, Wiedereröffnungen, Terminverschiebungen; durchschnittliche Terminverschiebung nur bei Ereignissen mit altem und neuem Datum. Historischer Achtwochenvergleich nach tatsächlichem Ereigniszeitpunkt; letzte 200 Ereignisse als Chronik. Kennzahlen basieren auf allen geladenen Ereignissen.
- **Methodik:** Ausschließlich `wishlist_gift_task_events` als Datenquelle, keine Live-Aufgaben und keine rückwirkend geschätzten Erledigungszeiten. Mehrfache Erledigung derselben wiedereröffneten Aufgabe zählt als mehrfaches Ereignis. Ohne vollständige alte/neue Datumswerte keine Durchschnittsberechnung.
- **Datenschutz:** Owner-gefilterte paginierte SELECT-Abfragen; vorhandene owner-only RLS und unveränderliche Ereignis-Webberechtigungen überprüft. Keine Migration, keine Testdaten, keine Änderung an Produktivdaten. Browser-End-to-End-Test mit authentifiziertem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Privates Aufgaben-Aktivitätsprotokoll)

- **Produktivmigration:** `wishlist_private_immutable_task_activity_events` erstellt `wishlist_gift_task_events` mit Eigentümer-ID, Aufgaben-ID und gespeichertem Titel, Ereignistyp, altem/neuem Status und Fälligkeitsdatum sowie serverseitigem `occurred_at`. Ein AFTER UPDATE Trigger auf `wishlist_gift_tasks` schreibt Status- und Terminänderungen automatisch und transaktionsgebunden. Bestehende Aufgaben und Jahresabschlüsse werden nicht verändert, historische Ereignisse nicht erfunden.
- **Sicherheit:** RLS für Ereignisse aktiviert, ausschließlich owner-only SELECT für `authenticated`; kein anonymes Lesen und kein direktes INSERT/UPDATE/DELETE für Webrollen. Triggerfunktion SECURITY DEFINER mit leerem `search_path`, ohne öffentliche EXECUTE-Rechte. Auslöser läuft bei echten Änderungen der Felder `status` oder `due_date`.
- **Frontend:** Privates Aktivitätsprotokoll in der Planungsassistenz, letzte Aktivitäten mit altem/neuem Wert und tatsächlichem Ereigniszeitpunkt, Sechswochenübersicht der protokollierten Erledigungen. Nach bestätigten Schnellaktionen wird das Protokoll neu geladen.
- **Grenzen:** Vor Einführung des Triggers liegende Änderungen können nicht rückwirkend rekonstruiert werden. Historische Fortschrittsansicht zeigt Anzahl der Erledigungsereignisse, nicht eindeutig erledigte Aufgaben (erneute Erledigung nach Wiederöffnung kann erneut zählen). Keine Testdaten erzeugt; kein authentifizierter Browser-End-to-End-Test durchgeführt.

## Entwicklungsfortschritt – 10.11.2026 (Private Geschenk-Tagesplanung)

- **Neu umgesetzt:** Privater Tagesfokus in `gift-assistant.html`/`gift-assistant.mjs` mit heute fälligen und überfälligen Aufgaben, Dringlichkeitsbegründung und mobiler Darstellung.
- **Bestätigte Schnellaktionen:** Einzeln „Erledigen“ oder „Auf morgen verschieben“ mit Bestätigungsdialog, bestehender owner-only UPDATE-RLS und optimistischer Konfliktprüfung anhand des bisherigen Feldwerts. Kein automatisches Umschreiben von Aufgaben.
- **Fortschritt:** Tagesquote der aktuell erledigten heute fälligen Aufgaben, Liste bereits erledigter Aufgaben und Vierwochenübersicht nach Fälligkeitswoche. **Methodische Grenze:** Ohne Änderungsverlauf sind dies aktuelle Statusquoten, keine historischen Erledigungszeitpunkte; ausdrücklich in der Oberfläche gekennzeichnet.
- **Produktivschutz:** Keine Datenbankmigration, keine Testdaten, keine Veränderung historischer Jahresabschlüsse. Bestehende Produktivdaten bleiben erhalten; ausschließlich ausdrücklich bestätigte Einzelaktionen ändern Status oder Fälligkeit. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Interaktive private Geschenk-Wochenplanung)

- **Neu umgesetzt:** Interaktive Aufgabenaktionen in der privaten Geschenk-Planungsassistenz: einzelne offene Aufgaben nach Bestätigungsdialog als erledigt markieren und Fälligkeitsdatum nach Bestätigungsdialog verschieben. Mobile Eingabefelder und Aktionsstatusmeldungen.
- **Sichere Schreiboperationen:** Bestehende owner-only RLS auf `wishlist_gift_tasks`; Client-Update ist auf `id`, `user_id` und bisherigen Feldwert eingeschränkt (optimistische Konflikterkennung). Keine pauschalen Änderungen; nur die bestätigte Aufgabe wird geändert. Fehler und parallele Änderungen werden angezeigt.
- **Wochenfortschritt:** Anteil erledigter, nicht archivierter Aufgaben mit Fälligkeitsdatum innerhalb der aktuellen Kalenderwoche; überfällige offene Aufgaben werden separat priorisiert. Anzeige wird nach erfolgreicher Aktion aktualisiert.
- **Produktivschutz:** Keine Migration, keine Testdaten, keine Änderung historischer Jahresabschlüsse. Bestandsdaten bleiben erhalten; bestätigte Nutzeraktionen können ausschließlich Status und Fälligkeitsdatum einzelner Aufgaben ändern. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Intelligente private Geschenk-Wochenplanung)

- **Neu umgesetzt:** In `gift-assistant.html` und `gift-assistant.mjs` erscheinen bestehende private Geschenkaufgaben mit Fälligkeit bis zum Ende der aktuellen Kalenderwoche, einschließlich überfälliger Aufgaben. Mobile Kennzahlen für überfällige, diese Woche fällige und hoch priorisierte Aufgaben.
- **Nachvollziehbare Priorisierung:** Überfällig vor unmittelbar fällig vor später fällig; innerhalb der Dringlichkeitsgruppen hohe vor mittlerer vor niedriger Priorität. Fünf vorrangige Aufgaben und weitere Wochenaufgaben in separaten Karten. Anlasszuordnung, Fälligkeitsdatum und Begründung werden angezeigt.
- **Datenschutz und Bestand:** Owner-gefilterte, paginierte Leseabfragen auf `wishlist_gift_tasks`, `wishlist_occasions` und `wishlist_gift_year_closings`; vorhandene RLS unverändert. Keine Migration, keine Testdaten, keine automatische Statusänderung, keine Veränderung bestehender Produktivdaten.
- **Grenzen:** Aufgaben ohne Fälligkeitsdatum werden nicht in die aktuelle Wochenpriorisierung aufgenommen. Historische Jahresabschlüsse bleiben Grundlage für Budget-/Checklistenempfehlungen, während die Wochenplanung bewusst den aktuellen privaten Aufgabenstand verwendet. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Privater Geschenk-Planungskalender)

- **Neu umgesetzt:** Mobile Wochenübersicht mit vorheriger/aktueller/nächster Woche, empfohlenem Planungsstart und Anlassdatum. Vorlauf von 21 Tagen für Standard, 28 Tagen bei historisch belegten Versandaufgaben. Historische Jahresabschlüsse liefern die Grundlage der Empfehlung; aktuelle private Anlässe liefern zukünftige Termine.
- **Sichere Checklistenübernahme:** Auswahl zwischen Standard-, Versand- und Kurzfristig-Vorlage pro Anlass. Explizite Checkbox und zusätzlicher Bestätigungsdialog vor dem einzigen Schreibzugriff `wishlist_create_occasion_checklist_year`. Bestehender SECURITY INVOKER RPC prüft Anlass-Eigentümerschaft, Checklistenjahr und Vorlagentyp und erstellt fehlende Aufgaben idempotent. Bereits vorhandene Aufgaben werden nicht überschrieben oder gelöscht.
- **Produktivschutz:** Keine Migration, keine Testdaten, keine automatischen Schreibvorgänge, keine Änderung an historischen Jahresabschlüssen. Bestehende owner-only RLS für Anlässe, Jahresabschlüsse und Aufgaben wird verwendet.
- **Grenzen:** Wochenkalender zeigt zukünftige Anlässe der ersten 40 Einträge und empfohlene Planungsstarts; keine automatische Synchronisierung externer Kalender. Browser-End-to-End-Test mit authentifiziertem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Geschenk-Planungsassistenz)

- **Neu umgesetzt:** `amazon-wishlist/gift-assistant.html` und `gift-assistant.mjs` als mobil nutzbare, vollständig lesende Geschenk-Planungsassistenz. Links von Startseite und Geschenk-Jahresstatistik.
- **Historische Budgetrichtwerte:** Pro Anlass Median ausdrücklich gespeicherter Jahresbudgets aus `wishlist_gift_year_closings.budgets_snapshot`; falls keine Budgethistorie vorliegt, Median tatsächlich erfasster Ausgaben aus `gifts_snapshot`. Zahl und Jahre der verwendeten historischen Abschlüsse werden genannt. Keine automatische Budgetänderung.
- **Checklisten und Fristen:** Für zukünftige private Anlässe Standard-Checkliste mit 21 Tagen oder Versand-Checkliste mit 28 Tagen Vorlauf; Versandhinweise basieren auf gespeicherten Aufgaben-Titeln, andernfalls klar gekennzeichnete allgemeine Regel. Kommende Termine stammen aus aktuellen eigenen Anlässen, nicht aus historischen Snapshots.
- **Hinweise:** Historisch unvollständige Geschenkgruppen, Aufgabenabschlussstände und fehlende Budgethistorie führen zu nachvollziehbaren Hinweisen. Die Assistenz führt keinerlei Schreiboperationen aus; für tatsächliche Änderungen sind die bestehenden Anlass- und Aufgabenverwaltungsseiten zu verwenden.
- **Datenschutz:** Private owner-only RLS auf `wishlist_gift_year_closings` und `wishlist_occasions`, kein neues Schema, keine Migration, keine Testdaten, keine Veränderung bestehender Produktivdaten. Historische Abfragen werden paginiert; ein Fehler bei unvollständigem Abruf verhindert irreführende Teilauswertungen. Browser-End-to-End-Test mit authentifiziertem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Geschenk-Erkenntniszentrale)

- **Neu umgesetzt:** Private Erkenntniszentrale in `gift-analytics.html`/`gift-analytics.mjs` mit langfristigen Geschenk- und Aufgabenquoten, Ausgabenentwicklung, historischer Budgettreue, Anlasszuverlässigkeit und erklärbaren regelbasierten Hinweisen.
- **Historische Datenbasis:** Ausschließlich gespeicherte `wishlist_gift_year_closings`-Snapshots und deren Geschenk-, Aufgaben- und Budget-Momentaufnahmen. Keine Live-Geschenke oder Live-Budgets fließen in die Erkenntnisse ein. Historische Anlassvergleiche erfordern mindestens zwei Abschlüsse je Anlass.
- **Methodische Grenzen:** Budgetvergleiche verwenden die Summe der ausdrücklich gespeicherten Anlassbudgets und können bei unvollständiger Erfassung nur Teilbudgetvergleiche sein; fehlende Budgets werden nicht als Nullbudget interpretiert. Abschlüsse ohne Aufgaben-Snapshots sind gekennzeichnet. Empfehlungen sind nachvollziehbare Regeln und keine Vorhersagen.
- **Sicherheit und Bestand:** Bestehende owner-only SELECT-RLS auf Jahresabschlüssen; keine neue Datenbankmigration, keine Testdaten, keine Veränderung bestehender Produktivdaten. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Geschenk-Erfolgsgeschichte)

- **Neu umgesetzt:** Mehrjährige Erfolgsgeschichte mit historisch gespeicherter Gesamtzahl verschenkter Geschenke, Gesamtausgaben und abgeschlossenen Jahren; visuelle Geschenk- und Aufgaben-Abschlussquoten je Jahr; Anlassvergleiche mit Geschenken, Aufgaben, Ausgaben und Jahresbudgets über mindestens zwei abgeschlossene Jahre.
- **Datenbasis:** Ausschließlich unveränderliche `wishlist_gift_year_closings`-Snapshots (`gifts_snapshot`, `budgets_snapshot`, `tasks_snapshot` und Abschlusskennzahlen). Keine Live-Daten in den historischen Diagrammen; ältere Abschlüsse ohne Aufgaben-Snapshot werden ausdrücklich gekennzeichnet. Anlassvergleiche verwenden gespeicherte `occasion_id`; fehlende historische Namen bleiben neutral.
- **Mobile Darstellung und Druck:** Responsive historische Balkendiagramme, horizontal scrollbarere Anlassvergleichstabellen, visuelle Zusammenfassung und gemeinsame Druckansicht mit dem privaten Jahresrückblick. Die Druckfunktion des Browsers ermöglicht PDF-Ausgabe; der bestehende lokale JSON-Export bleibt erhalten.
- **Datenschutz:** Keine Datenbankmigration oder Änderung bestehender Produktivdaten. Zugriff über vorhandene owner-only SELECT-RLS auf Jahresabschlüsse. Kein Browser-End-to-End-Test mit angemeldetem Konto durchgeführt.

## Entwicklungsfortschritt – 10.11.2026 (Privater Geschenk-Jahresrückblick)

- **Neu umgesetzt:** Mobiler Jahresrückblick für abgeschlossene Jahre auf Basis unveränderlicher `wishlist_gift_year_closings`-Snapshots. Kennzahlen für Geschenke, Ausgaben, Budgets und Aufgaben, nachweisbare Meilensteine (vollständige Geschenk- bzw. Aufgabenabschlüsse), abgeschlossene Anlassgruppen und fehlende historische Aufgaben-Snapshots werden transparent dargestellt.
- **Privater Export:** JSON-Export der eigenen historischen Abschlussdaten inklusive einzelner gespeicherter Geschenke, Aufgaben und Budgets mittels lokalem Browser-Blob; Druckansicht für Browser-Print/PDF. Keine neue externe Export-API und keine Datenübertragung an einen zusätzlichen Dienst.
- **Sicherheit und Datenbestand:** Bestehende owner-only SELECT-RLS auf `wishlist_gift_year_closings` wird weiterverwendet; kein Datenbankschema geändert, keine bestehenden Abschlüsse umgeschrieben und keine Testdaten erstellt. Exportdateien enthalten private Inhalte und sollten vertraulich aufbewahrt werden.
- **Grenzen:** Anlassnamen sind nur für Anlässe mit gespeicherten Budget-Snapshot-Titeln verfügbar; andernfalls wird ein neutraler Platzhalter angezeigt. Meilensteine basieren auf Abschlussstatus, nicht auf echten Ereigniszeitpunkten. Keine nachträgliche Rekonstruktion historischer Aufgaben für ältere Abschlüsse. Vollständiger Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Jahreschronik mit Aufgaben-Snapshots)

- **Neu umgesetzt:** Zukünftige historische Jahresabschlüsse speichern zusätzlich unveränderliche Aufgaben-Momentaufnahmen (`tasks_snapshot`, `task_count`, `task_done_count`) aus privaten, jahreszugeordneten Geschenk-Checklisten. Gespeichert werden Aufgaben-ID, Anlass-ID, Titel, Status, Fälligkeit, Priorität, Vorlagenschlüssel und Archivierungszeitpunkt.
- **Additive Produktivmigration:** Optionale Felder in `wishlist_gift_year_closings`; bestehende Abschlüsse bleiben unverändert und enthalten weiterhin `NULL` als Kennzeichnung für fehlende historische Aufgaben-Snapshots. Die bestehende bestätigungspflichtige `wishlist_close_gift_year`-Funktion erfasst Geschenk-, Budget- und Aufgabenstand in einer Transaktion. Unveränderte owner-only SELECT-RLS, keine direkten Schreibrechte für Client-Rollen, kein Testabschluss.
- **Mobile Jahreschronik:** Chronologische Karten für abgeschlossene Jahre, historische Aufgaben-Abschlussquote, Fortschrittsbalken, Vergleich der Ausgaben und Abschlussquoten mit dem vorherigen Abschluss sowie Details zu archivierten Aufgabenständen.
- **Grenzen:** Nur Aufgaben mit `checklist_year` und `checklist_key` fließen in den Aufgaben-Snapshot ein. Historische Snapshots älterer Abschlüsse werden nicht rekonstruiert. Jahreschronik basiert auf gespeicherten Abschlüssen, nicht auf aktuellen offenen Jahresdaten. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private historische Jahresabschlüsse)

- **Neu umgesetzt:** Einmalige, ausdrücklich bestätigte Jahresabschlüsse für Geschenkpläne und historische Jahresbudgets. Abschlusswerte (Geschenkzahl, verschenkte Geschenke, geplante und erfasste Beträge, Jahresbudgets) sowie einzelne Geschenk- und Budgeteinträge werden als JSONB-Momentaufnahme gespeichert.
- **Additive Produktivmigration:** `wishlist_gift_year_closings` mit eindeutigem `(user_id,closing_year)`, owner-only SELECT-RLS, keinen direkten Schreibrechten für Webrollen und `wishlist_close_gift_year(year,confirm)` als eng begrenzter `SECURITY DEFINER`-RPC mit `auth.uid()`-Prüfung, Bestätigungspflicht, advisory transaction lock und unveränderlichem Erstabschluss. Die Funktion legt keine Testdaten an.
- **Mobile Jahresstatistik:** Abschlussbestätigung, gespeicherte Abschlussdetails, historische Jahresvergleichswerte und abgeschlossene Budgetkennzahl. Offene Jahre bleiben live.
- **Grenzen:** Abschlüsse enthalten Geschenkstatus, Ausgaben und explizite Budgetwerte, jedoch keine Aufgabenstatus-Snapshots. Der aktuelle Abschnitt der Anlass-Budgetdetails zeigt für einzelne Anlässe weiterhin live editierbare Jahresbudgets; historische Abschlusswerte stehen separat in den Abschlussdetails. Geschenkjahr-Schätzungen aus dem Erstellungsjahr bleiben als solche markiert. Kein Browser-End-to-End-Test mit authentifiziertem Konto durchgeführt.

## Entwicklungsfortschritt – 10.11.2026 (Geschenkjahr und historische Anlassbudgets)

- **Additive Produktivmigration:** `wishlist_gift_plans.gift_year` und `gift_year_source` ergänzt. Bestehende Geschenke erhalten ihr Erstellungsjahr als ausdrücklich gekennzeichnete Schätzung (`inferred_created`), ohne ihre übrigen Daten zu verändern. Neue Geschenke erhalten das aktuelle Kalenderjahr als Standard. Über `wishlist_set_gift_year(plan_id,year)` können Eigentümer das Jahr korrigieren.
- **Historische Budgets:** Neue private Tabelle `wishlist_occasion_budget_years` mit eindeutigem Schlüssel `(user_id,occasion_id,budget_year)`, explizit gespeicherten Budgetwerten und vier owner-only RLS-Richtlinien. Keine historischen Budgets erfunden oder automatisch rückwirkend befüllt.
- **Mobile Jahresstatistik:** Geschenkjahr korrigieren, Jahresbudgets pro Anlass erfassen und Budgetabweichungen für das ausgewählte Jahr auswerten. Jahresvergleich und Geschenk-Abschlussquote verwenden `gift_year` statt `created_at`.
- **Sicherheit:** Budgethistorie nur für authentifizierte Eigentümer; RPC `SECURITY INVOKER`, eingeschränkte EXECUTE-Berechtigung und Eigentümerprüfung. Bestehende Geschenk-/Anlass-/Aufgaben-RLS unverändert.
- **Grenzen:** Historische Geschenkstatus und tatsächliche Ausgaben sind weiterhin veränderlich und nicht als unveränderliche Jahres-Snapshots archiviert. Bestehende Geschenk-Jahreszuordnungen sind Schätzungen, bis Nutzer sie bestätigen. Kein Browser-End-to-End-Test mit authentifiziertem Konto durchgeführt.

## Entwicklungsfortschritt – 10.11.2026 (Private Geschenk-Jahresstatistik)

- **Neu umgesetzt:** `amazon-wishlist/gift-analytics.html` und `gift-analytics.mjs` mit mobiler Jahresauswahl, Jahresvergleich, Geschenk-Abschlussquote, erfassten tatsächlichen Ausgaben, geplanten Beträgen, Anlassbudget-Vergleich und abgeschlossenen Anlass-Checklisten bzw. Geschenkgruppen.
- **Privatsphäre:** Daten werden ausschließlich aus den bestehenden owner-only-RLS-Tabellen `wishlist_gift_plans`, `wishlist_gift_tasks` und `wishlist_occasions` mit zusätzlichem `user_id`-Filter gelesen. Keine Daten fremder Nutzer und keine Reservierungsdaten werden abgefragt.
- **Integration:** Navigation in `index.html` und `gift-dashboard.html` ergänzt. Sicherheitsmigrationen entziehen anonymen Nutzern sämtliche Tabellenrechte auf Geschenkpläne und Anlässe sowie authentifizierten Nutzern TRUNCATE/TRIGGER/REFERENCES auf Geschenkpläne, Anlässe und Aufgaben. CRUD für authentifizierte Eigentümer bleibt erhalten. Keine Testdaten und keine Änderungen an bestehenden Produktivdatensätzen.
- **Methodische Grenzen:** Geschenkpläne besitzen noch kein separates Jahr; sie werden nach `created_at` gruppiert. Der aktuelle Status und aktuelle tatsächliche Ausgaben wirken damit rückwirkend. Anlassbudgets sind aktuelle Werte, keine historischen Snapshots; bei jährlich wiederkehrenden Anlässen wird das aktuelle Budget in den Jahresansichten angezeigt. Die abgeschlossenen Anlässe basieren auf vollständig erledigten Checklisten des jeweiligen Jahres oder vollständig verschenkten Geschenkgruppen mit Erstellungsjahr. Bis zu 5000 Geschenkpläne, 5000 Aufgaben und 2000 Anlässe pro Aufruf; bei größeren Datenbeständen sind paginierte Aggregationen erforderlich.
- **Prüfung:** JavaScript-Syntax und RLS-Schema geprüft; vollständiger Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Sichere Jahresübernahme und private Jahresbilanz)

- **Neu umgesetzt:** Selektive Übernahme von bis zu 100 Aufgaben eines jährlichen Anlasses aus dem Vorjahr. Nutzer wählen die Aufgaben einzeln aus und bestätigen die Übernahme. Neue Aufgaben erhalten Status `open`, kopierte Priorität, Notizen und Erinnerungsfrist; Fälligkeiten werden anhand der relativen Tagesdifferenz zum Anlassdatum in das Zieljahr übertragen. Bestehende Aufgaben werden durch eindeutigen Jahresindex und `ON CONFLICT DO NOTHING` nicht überschrieben.
- **Additive Produktivmigration:** `wishlist_rollover_gift_tasks(occasion_id,from_year,to_year,task_ids)` als `SECURITY INVOKER`, leerer `search_path`, EXECUTE ausschließlich `authenticated`. Prüft Eigentümerschaft des wiederkehrenden Anlasses und aller ausgewählten Aufgaben, genau ein Jahr Abstand, begrenzten Jahreshorizont und maximal 100 ausgewählte IDs.
- **Mobile Oberfläche:** Aufgaben-Auswahl im Vorjahresbereich und private Jahresbilanz je Anlass/Jahr (erledigt, offen, überfällig, archiviert) in `gift-tasks.html`. Geschenkzentrale zeigt überfällige Aufgaben je Checklistenjahr.
- **Datenbestand:** Keine Löschungen, kein Rücksetzen bestehender Aufgaben und keine Testdatensätze. Die bisherige Jahresarchivierung bleibt unverändert.
- **Grenzen:** Nur jährlich wiederkehrende Anlässe und bereits jahreszugeordnete Checklistenaufgaben können übernommen werden. Alte Aufgaben ohne `checklist_year` werden nicht automatisch zugeordnet. Vollständiger Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Jährliche Geschenk-Checklisten und Archiv)

- **Neu umgesetzt:** Jährlich getrennte Geschenk-Checklisten, manuelle Jahresauswahl (aktuell −3 bis +5 Jahre), Fortschrittsanzeige pro Anlass und Jahr sowie Archivieren/Wiederherstellen vollständiger Checklistenjahre.
- **Additive Produktivmigration:** `wishlist_gift_tasks.checklist_year` (optional) und `archived_at` (optional). Zwei eindeutige partielle Indizes verhindern Duplikate für neue Jahres-Checklisten und schützen gleichzeitig alte Checklisten ohne Jahreszuordnung. Keine vorhandenen Aufgaben gelöscht oder umgeschrieben.
- **Sichere RPCs:** `wishlist_create_occasion_checklist_year(occasion_id,template,year)` und `wishlist_archive_occasion_checklist_year(occasion_id,year,archive)` verwenden `SECURITY INVOKER`, leeren `search_path`, authentifizierte Ausführung und Prüfung der Anlass-Eigentümerschaft. Erzeugung transaktional mit `ON CONFLICT DO NOTHING`; Archivierung reversibel.
- **Mobile Bedienung:** Jahresauswahl und Archivschaltflächen in `gift-tasks.html`; Jahresfortschritt in Aufgabenverwaltung und Geschenkzentrale. Archivierte Aufgaben werden aus aktiven Aufgaben- und Erinnerungsansichten ausgeblendet.
- **Grenzen:** Bestehende Checklisten ohne Jahr werden nicht rückwirkend einem Jahr zugeordnet. Es gibt keine automatische Anlage neuer Checklisten ohne Nutzeraktion. Maximal 1000 Aufgaben pro Ansicht; vollständiger Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Geschenk-Checklisten pro Anlass)

- **Neu umgesetzt:** Drei kostenlose Aufgabenpakete pro Anlass: Standard (5 Aufgaben), Kurzfristig (4 Aufgaben) und Versand (4 Aufgaben). Aufgaben erhalten vorgeschlagene Fälligkeiten relativ zum nächsten Anlass, Priorität und Erinnerungsfrist.
- **Additive Produktivmigration:** Optionale Spalte `wishlist_gift_tasks.checklist_key` und eindeutiger partieller Index auf `(user_id,occasion_id,checklist_key)`. Bestehende Aufgaben bleiben unverändert. `wishlist_create_occasion_checklist(occasion_id,template)` ist `SECURITY INVOKER`, prüft Anlass-Eigentümerschaft und erstellt das Paket transaktional mit `ON CONFLICT DO NOTHING`. Erneutes Erstellen desselben Pakets erzeugt keine Duplikate.
- **Mobile Oberfläche:** Aufgabenpakete mit Bestätigung, unmittelbarer Aufgabenaktualisierung und Fortschritt pro Anlass in `gift-tasks.html`. Aggregierte Checklistenfortschritte auch in `gift-dashboard.html`.
- **Grenzen:** Pakete sind pro Anlass und Pakettyp einmalig; jährliche Wiederholung erzeugt nicht automatisch neue Aufgaben für Folgejahre. Es gibt keine automatische Löschung bestehender Aufgaben. Erinnerungen bleiben in der App. Vollständiger Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Kostenlose intelligente Aufgabenplanung)

- **Neu umgesetzt:** Sechs lokale Geschenk-Aufgabenvorlagen (Bestellen, Abholen, Verpacken, Karte, Versand, Überreichen) mit vordefinierten Prioritäten und Erinnerungsfristen. Vorlagen füllen nur das Formular vor; Speichern erfolgt ausschließlich nach Nutzerbestätigung.
- **Regelbasierte Fälligkeit:** Terminempfehlung anhand des ausgewählten Anlasses; Vorlauf je Vorlage 0–14 Tage. Jährlich wiederkehrende Anlässe werden auf die nächste Fälligkeit abgebildet; der 29. Februar wird in Nicht-Schaltjahren auf den 28. Februar gelegt. Die vorgeschlagene Fälligkeit bleibt manuell änderbar.
- **Mobiler Wochenplan:** Siebentägige Kalenderansicht mit Vor-/Zurücknavigation, Sprung zur aktuellen Woche, fälligen offenen Aufgaben und separatem Hinweis auf überfällige Aufgaben.
- **Sicherheit:** Bestehende owner-only RLS auf `wishlist_gift_tasks` bleibt unverändert; keine neue Datenbankmigration, keine Produktivdatenänderung und keine zusätzlichen Drittanbieter. Bestehende Erinnerungen im Dashboard bleiben verfügbar.
- **Grenzen:** Terminempfehlungen berücksichtigen keine Versandlaufzeiten, Feiertage oder Ladenöffnungszeiten. Keine automatischen Push-Mitteilungen. Vollständiger Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Geschenk-To-dos und Erinnerungen)

- **Neu umgesetzt:** `amazon-wishlist/gift-tasks.html` und `gift-tasks.mjs` als mobile Aufgabenverwaltung mit CRUD, Fälligkeitsdatum, Status (offen, in Arbeit, erledigt), Priorität (hoch, mittel, niedrig), Erinnerungs-Vorlauf (0–30 Tage), Notizen sowie optionaler Anlass- und Geschenkverknüpfung.
- **Additive Produktivmigration:** `wishlist_gift_tasks` mit owner-only SELECT/INSERT/UPDATE/DELETE unter RLS. Bei INSERT/UPDATE werden eigene Anlässe und Geschenkpläne geprüft; wenn beides gesetzt ist, müssen Anlass und Geschenkplan übereinstimmen. Fremdschlüssel auf Anlass und Geschenkplan verwenden `ON DELETE SET NULL`; bestehende Produktivdaten bleiben unverändert.
- **Geschenkzentrale:** Zeigt fällige und überfällige private Aufgaben als Erinnerungsübersicht und verlinkt die neue Aufgabenverwaltung. Hauptnavigation ergänzt.
- **Grenzen:** Erinnerungen sind nur in der App sichtbar, keine E-Mails oder Push-Mitteilungen. Bis zu 1000 Aufgaben pro Ansicht, maximal 15 Erinnerungen in der Aufgabenverwaltung und 8 im Dashboard. Browser-End-to-End-Test mit authentifiziertem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Zentrale mobile Geschenkzentrale)

- **Neu umgesetzt:** `amazon-wishlist/gift-dashboard.html` und `gift-dashboard.mjs` als mobile Übersicht mit Anlässen in den nächsten 30 Tagen, offenen Geschenkaufgaben, Prioritätsfilter, Budgetwarnungen und Fortschrittsanzeige. Hauptnavigation erweitert.
- **Additive Produktivmigration:** `wishlist_gift_plans.priority` (1 hoch, 2 mittel, 3 niedrig; Standard 2) mit Werteprüfung und Index. Bestehende Daten erhalten. Eigentümergebundene RLS der Geschenkplanung schützt Prioritätsänderungen.
- **Private Reservierungszahlen:** `wishlist_gift_dashboard_reservations()` als `SECURITY DEFINER` mit leerem `search_path`, EXECUTE nur für `authenticated`. Liefert ausschließlich die Anzahl eigener Reservierungen und die Anzahl eigener Reservierungen mit eigenem Geschenkplan; keine fremden Reservierer.
- **Grenzen:** Bis zu 1000 Anlässe und 1000 Geschenke pro Seitenaufruf; maximal 25 offene Aufgaben und 12 anstehende Anlässe auf der Startübersicht. Keine automatischen Push-Benachrichtigungen. Vollständiger Browser-End-to-End-Test mit angemeldetem Nutzer steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Geschenkkoordination)

- **Neu umgesetzt:** Geschenkstatus direkt auf mobilen Geschenkekarten ändern (Idee, Geplant, Gekauft, Verpackt, Verschenkt); Anzeige ausschließlich eigener Reservierungen für verknüpfte Wünsche.
- **Additive Produktivmigration:** `wishlist_my_gift_coordination(p_limit)` liefert zu eigenen Geschenkplänen nur `reserved_by_you` oder `not_reserved_by_you`. `wishlist_update_gift_progress(p_plan_id,p_status,p_release_reservation)` prüft den Eigentümer und aktualisiert den Status; bei bestätigter Freigabe beim Verschenken wird die eigene Reservierung in derselben Transaktion aufgehoben.
- **Sicherheit:** Beide RPCs sind `SECURITY DEFINER`, mit leerem `search_path` und ausschließlich für `authenticated` freigegeben. Keine Informationen über fremde Reservierer. Bestehende Produktivdaten erhalten.
- **Private Reservierungsübersicht:** Zeigt den Status bereits verknüpfter eigener Geschenkpläne. Keine automatische Freigabe ohne Bestätigung.
- **Grenzen:** Abgleich maximal 500 verknüpfte Geschenkpläne; Reservierungsübersicht berücksichtigt maximal 1000 eigene Geschenkpläne. Vollständiger Browser-End-to-End-Test mit mehreren Konten steht aus.

# Helferlein Wishes – verbindliche Feature-Roadmap

> **Projektauftrag für neue Chats und Entwicklungsrunden.** Dieses Dokument enthält die vom Nutzer am 10.11.2026 erneut bereitgestellte vollständige Produktvision, in umsetzbare Kategorien gegliedert. Es ist die zentrale Referenz für die Weiterentwicklung der Wishlist-Seite unter `amazon-wishlist/`.

## Vision und Ziele

Helferlein Wishes wird eine umfassende **Social-Shopping-, Wunschlisten-, Geschenkplanungs- und Inspirationsplattform**: Amazon-Wunschlisten + Pinterest-artige Sammlungen + soziale Profile + Geschenkberater + persönlicher Shopping-Assistent. Affiliate-Links sind ein transparent gekennzeichneter Monetarisierungsweg; Vertrauen und hilfreiche Empfehlungen stehen im Vordergrund.

**Verbindliche Arbeitsweise (aktuellster Nutzerauftrag):**
- **Feature-first:** Ideen umsetzen, Design und Nutzererlebnis sichtbar verbessern; keine endlosen Sicherheits-/Testschleifen, aber notwendige kurze Funktionsprüfungen und grundlegende Zugriffssicherheit.
- **Kostenlos zuerst:** Bestehende Infrastruktur verwenden; zusätzliche laufende Kosten vermeiden. Gratis-Kontingente sind nicht unbegrenzt.
- **Pakete bündeln:** In jeder Runde mehrere zusammenhängende Verbesserungen liefern.
- **Selbstständig veröffentlichen:** Der Nutzer hat am 10.11.2026 die ausdrückliche Freigabe für GitHub-Merge, Deployment und notwendige Supabase-Änderungen erteilt; nur wichtige Produktentscheidungen rückfragen. Dies **ersetzt** die ältere Brainstorming-Regel „keine ungefragte Veröffentlichung“ aus dem ursprünglichen Ideentext.
- **Produktivdaten bewahren:** Keine Löschung oder Überschreibung vorhandener Nutzerkonten, Wünsche oder Listen; Schemaänderungen möglichst additiv und rückwärtskompatibel.
- **Weiter-Button:** Wenn eine Fortsetzung vom Nutzer benötigt wird, eine klar erkennbare Aktion **▶️ Weiter** anbieten.
- **Realistische Statusangaben:** Geplant ≠ implementiert; lokale Browserdaten ≠ geräteübergreifende Supabase-Daten; nicht ausgeführte Prüfungen nicht als bestanden darstellen.
- **Plattform:** GitHub-Repository `duhrrom11/Helferlein`, `main`, GitHub Pages; Wishlist unter `amazon-wishlist/`. Kein Wechsel zu Vercel.

## Phase 1 – ohne zusätzliche kostenpflichtige Dienste (zuerst)

### 1. Wunschlisten-System
- Softwareseitig beliebig viele Wunschlisten; Namen, Beschreibungen, Icons, Farben und individuelle Designs.
- Sichtbarkeit: öffentlich, privat, per Link teilbar – mit tatsächlich durchgesetzten Zugriffsrechten.
- Kategorien und Unterkategorien, Prioritäten, Notizen.
- Wunschbudget, Preisangaben und Wunschpreise.
- Produktbilder, Varianten und gewünschte Mengen.
- Produkte zwischen Listen verschieben, mehreren Listen zuordnen.
- Listen duplizieren, archivieren und verwalten.
- Suche, Filter, Sortierung und automatische Sortierung.
- Vorlagen für Geburtstag, Weihnachten, Hochzeit, Baby, Einzug, Hobbys, Reisen etc.
- Attraktive Produktkarten und persönliche Sammlungen.

### 2. Community und Profile
- Öffentliche Nutzerprofile mit Profilbild, Titelbild, Beschreibung und persönlichem Design.
- Follower, Abonnements, Likes, Favoriten und Lieblingsprodukte.
- Wunschlisten anderer speichern; Profile und Listen teilen.
- Öffentliche Sammlungen und Themenwelten.
- Community-Ranglisten, Nutzer-Badges und Meilensteine.
- Moderation, Missbrauchs- und Spam-Schutz als technische Grundlage.

### 3. Geschenke und Überraschungen
- Geburtstags-, Weihnachts-, Hochzeits- und Baby-Wunschlisten.
- **Geheime Geschenkreservierungen:** Freunde reservieren, ohne dass Beschenkte die Reservierung sehen; Doppelkäufe verhindern.
- Geschenkstatus und Fortschrittsanzeige.
- Gemeinsame Familien-, Paar-, Freundes- und WG-Listen; Wunschlisten für Kinder mit angemessener Privatsphäre.
- Gruppen-Geschenkplanung und Geschenkbudget-Rechner.
- Geburtstags-/Anlasskalender und Erinnerungen.
- Wunschlisten drucken oder als PDF exportieren.

### 4. Entdecken und Inspiration
- Pinterest-artiger Produktfeed, Wunschwelten und Themenlisten.
- Beliebteste Wünsche, neue Wünsche, Wunsch des Tages.
- Top-10-/Top-100-Listen und Community-Empfehlungen.
- Geschenkideen nach Budget (z. B. unter 20/50/100 €), Anlass und Interessen.
- Redaktionelle Themenwelten, saisonale Aktionen.
- Zufälliger Wunschgenerator.

### 5. Intelligente Funktionen ohne bezahlte KI
- Geschenkfinder als Fragebogen zu Anlass, Interessen, Alter und Budget.
- Regelbasierte Empfehlungen aus bereits vorhandenen Produkten.
- Interessen-/Budgetfilter, ähnliche Wünsche und persönliche Kategorieempfehlungen.
- Wunschlisten-Analyse und -Vergleich.
- Automatische Sortierung und Geschenkideen-Zufallsgenerator.
- Empfehlungen passend zum Anlass.

### 6. Affiliate und Wachstum
- Amazon-Partnerlinks automatisch und korrekt erzeugen; **deutliche Affiliate-Kennzeichnung**.
- Produktlinks kopieren, Wunschlisten teilen und QR-Codes erstellen.
- Geschenkideen-Landingpages, SEO-freundliche Kategorien und Themenwelten.
- Empfehlungslisten und interne Empfehlungsflächen.
- Teilen via WhatsApp und weitere Apps.
- Affiliate-Klickstatistiken und beliebte Produktkategorien unter Beachtung von Datenschutz und geltenden Partnerprogrammregeln.
- Kein unzulässiges Scraping und keine unbelegten Preis-/Verfügbarkeitsangaben.

### 7. Design und Nutzererlebnis
- Hochwertiges, konsistentes Premium-Design.
- Light-/Dark-Mode, mobile-first, Animationen und Übergänge.
- Individuelle Farbschemata und Profilgestaltung.
- Schöne Produktkarten, personalisierbares Dashboard.
- Fortschrittsanzeigen, interaktive Statistiken.
- Onboarding, Widgets, gute Tastaturbedienung und Barrierefreiheit.

## Phase 2 – kostenlos startbar, mögliche spätere Kosten

Diese Funktionen nach Phase 1 bzw. abhängig von Kapazität, zulässigen Datenquellen und Betriebskosten:
- Produktbilder automatisch laden (Bildquelle, Nutzungsrechte und Speicherbedarf beachten).
- Preisverlauf, Wunschpreis-Alarm, Preisrückgangsbenachrichtigungen.
- Browser-Erweiterung zum Speichern von Produkten.
- Progressive Web App (PWA), Push-Benachrichtigungen.
- E-Mail-Geschenkerinnerungen.
- Nutzer-Uploads und Galerien.
- Umfangreiche Produktsuche.
- Öffentliche Produktbewertungen; Kommentare und Diskussionen mit Moderation.
- Live-Community-Feed.
- Gemeinsame Geschenkkassen (echte Zahlungen nur mit geeignetem Zahlungsdienstleister).
- Mehrsprachigkeit, erweiterte Statistiken.
- Automatischer Produktimport unter Beachtung von API-/Shop-Bedingungen.

## Phase 3 – potenziell kostenpflichtige Premium-Funktionen

- KI-Geschenkberater mit individuellen Vorschlägen und Begründungen.
- Foto-zu-Produkt-Suche und Bilderkennung.
- Shopübergreifender Preisvergleich.
- Virtuelle Produktvorschau, z. B. Möbel im eigenen Zuhause.
- Persönlicher Shopping-Agent mit automatisierter Suche, Wunschplanung und Empfehlungen.

## Produktprinzipien

1. **Social Gifting:** Menschen kommen nicht nur zum Speichern zurück, sondern zum Entdecken, Planen und Schenken.
2. **Überraschungen erhalten:** Reservierungen für Beschenkte verborgen halten.
3. **Transparente Monetarisierung:** Affiliate-Einnahmen durch relevante Empfehlungen statt irreführender Werbung.
4. **Datenschutz und Rechte:** Öffentliche Wünsche sind nicht automatisch privat, nur weil sie einer privaten Liste zugeordnet sind. Privatheit muss durch Datenmodell, RLS und Oberfläche tatsächlich gelten.
5. **Kostenbewusst:** Hosting, Datenbank, E-Mails und Traffic können später Kosten verursachen.
6. **Stufenweise ausbauen:** Phase 1 zuerst, Phase 2/3 als langfristige Vision.

## Aktueller technischer Zwischenstand (10.11.2026)

- Wunschlisten-Dashboard, Karten, Schnellaktionen, Kategorien, Prioritäten, Filter, Favoriten, Community-Feed und Profile sind bereits teilweise vorhanden.
- Designpakete für Dashboard, Listenkarten, Wunscheditor, mobile Darstellung und Dark Mode wurden auf `main` veröffentlicht.
- Bild-URL, Wunschpreis, Menge und Wunschstatus wurden zuletzt als **gerätegebundene lokale Browser-Zusatzdaten** eingeführt. **Noch nicht geräteübergreifend in Supabase gespeichert und nicht öffentlich geteilt.** Dies ist ein Zwischenstand, kein abgeschlossener Produktumfang.
- Nächste sinnvolle Umsetzung: Zusatzdaten in das vorhandene Datenmodell überführen, geräteübergreifende Bearbeitung und korrekte öffentliche Darstellung; anschließend weitere Phase-1-Features bündeln.
- Bestehende Nutzer-/Produktivdaten bei jeder Migration erhalten.

## Entwicklungsfortschritt – 10.11.2026 (Geschenkplanung)

- **Neu umgesetzt:** Kostenloser Geschenkbudget-Planer mit Gesamtbudget, Ausgaben, Anzahl Geschenke, Restbudget, Durchschnitt und Fortschrittsanzeige.
- **Neu umgesetzt:** Druckansicht des Geschenkplaners mit browserseitiger PDF-Speicherung.
- **Neu umgesetzt:** Teilen-Schaltfläche mit nativer Gerätefunktion bzw. Zwischenablage-Fallback.
- **Technische Abgrenzung:** Der Budgetplaner rechnet nur im Browser; keine dauerhafte Speicherung, keine gemeinsame Geschenkkasse und keine Supabase-Schemaänderung. PDF-Funktion ist der Browser-Druckdialog, kein serverseitiger PDF-Export von Wunschlisten.
- **Offen:** Vollständige Wunschlisten-PDFs, Geburtstagskalender, Geschenkfinder, öffentliche Themenwelten und weitere Roadmap-Pakete.

## Entwicklungsfortschritt – 10.11.2026 (Geschenkfinder)

- **Neu umgesetzt:** Responsiver Geschenkfinder mit Anlass, Interessen und Budgetauswahl, regelbasierter Stichwortzuordnung, maximal sechs Empfehlungskarten und Zufallsinspiration.
- **Datenquelle:** Ausschließlich aktuell im Browser geladene öffentliche Wünsche aus dem bestehenden Community-Feed; keine zusätzliche Supabase-Abfrage und keine Änderungen an Produktivdaten.
- **Preisgrenze:** Budgetauswahl ist derzeit informativ, **kein echter Preisfilter**, da der bestehende Feed keine verlässlichen Produktpreise enthält.
- **Monetarisierung:** Bereits vorhandene Amazon-Partnerlinks werden für Empfehlungen wiederverwendet.
- **Noch offen:** Vollständige serverseitige Community-Suche, valide Produktpreisquelle, präzisere Interessenklassifikation, mehr Anlässe und Empfehlungen aus mehreren Seiten des Feeds.

## Entwicklungsfortschritt – 10.11.2026 (Wunschwelten)

- **Neu umgesetzt:** Öffentlicher, Pinterest-inspirierter Entdecken-Bereich mit responsivem Kartenlayout und sechs Themenwelten (Gaming & Technik, Wohnen & Küche, Bücher & Kreativität, Beauty & Wellness, Sport & Abenteuer, Familie & Spielen).
- **Neu umgesetzt:** Themenfilter, Stichwortsuche, alphabetische Sortierung und „Neu mischen“ für zufällige Inspiration.
- **Datenquelle:** Nur bereits geladene öffentliche Wünsche aus dem bestehenden Community-Feed. Keine zusätzlichen Supabase-Abfragen, keine neuen Tabellen und keine Änderungen an Produktivdaten.
- **Abgrenzung:** Noch keine eigenständig von Nutzern erstellbaren/gespeicherten Themenwelten, keine vollständige serverseitige Suche, keine automatisch abgerufenen Produktbilder. Themenzuordnung basiert auf Stichwörtern.
- **Offen:** Persistente kuratierte Sammlungen, Profilintegration, Community-Ranglisten, bessere Produktbilder und eine eigenständige öffentliche Entdecken-Suche.

## Entwicklungsfortschritt – 10.11.2026 (Persönliche Sammlungen)

- **Neu umgesetzt:** Vier zusätzliche Pinterest-artige Vorlagen für persönliche Sammlungen: Cozy-Wunschwelt, Geschenkideen unter 50 €, Kreativwelt und Wellness-Welt. Sie nutzen die bestehenden `wishlist_lists`-Felder für Titel, Beschreibung, Icon und Farbe; keine neue Tabelle.
- **Neu umgesetzt:** „Sammlung teilen“ als statische Textkopie mit Titeln und Amazon-Produktlinks, über native Teilen-Funktion oder Zwischenablage. Vor dem Teilen wird auf die Weitergabe auch privater Inhalte hingewiesen.
- **Neu umgesetzt:** Mobile Anpassungen für Listenkarten und Aktionsflächen.
- **Wichtige Abgrenzung:** Es gibt **noch keine öffentlichen, dauerhaft abrufbaren Sammlungsseiten** und keine echte per Link freigegebene Privatlistenansicht. Die Aktion übermittelt nur eine bewusst erstellte Textkopie. Die Vorlage „unter 50 €“ ist eine thematische Bezeichnung, **keine automatische Preisprüfung**.
- **Offen:** Sichere öffentlich teilbare Sammlungsseiten mit RLS, individuelle Titelbilder, Profilintegration und interaktive soziale Funktionen.

## Entwicklungsfortschritt – 10.11.2026 (Öffentliche Sammlungsseiten)

- **Neu umgesetzt:** Eigenständige responsive Sammlungsseite `amazon-wishlist/collection.html?id=<uuid>` mit Titel, Beschreibung, Icon, Wunschkarten und Amazon-Partnerlinks.
- **Neu umgesetzt:** Besitzer können die Sichtbarkeit bestehender Listen im Bearbeitungsformular zwischen `private` und `public` umschalten; erstmalige Veröffentlichung erfordert eine ausdrückliche Bestätigung. Öffentliche Links lassen sich aus dem Dashboard öffnen und kopieren.
- **Produktive Supabase-RLS erweitert:** Zwei additive `SELECT`-Policies auf `wishlist_lists` und `wishlist_list_items` geben ausschließlich nicht archivierte Listen mit `visibility='public'` und deren Zuordnungen für `anon`/`authenticated` frei. Eigentümerregeln bleiben unverändert; keine Daten gelöscht.
- **Wichtige bestehende Einschränkung:** `wishlist_wishes` und `wishlist_products` waren bereits unabhängig von der Listenfreigabe öffentlich lesbar. „Private Liste“ schützt derzeit die Listenmetadaten und Mitgliedschaften, **nicht** die grundsätzliche Sichtbarkeit einzelner Wünsche.
- **Noch offen:** End-to-End-Browserprüfung, echte Titelbilder, personalisierte Slugs statt UUID-Links, Social-Interaktionen und eine umfassende Überarbeitung der Wunsch-Privatsphäre.

## Entwicklungsfortschritt – 10.11.2026 (Privatsphäre und Titelbilder)

- **Produktive Supabase-Migrationen, additiv und datenbewahrend:** `wishlist_wishes.visibility` mit Standardwert `public`, `wishlist_lists.cover_url` (optionale HTTPS-Titelbild-URL), neue RLS-SELECT-Policy für öffentliche oder eigene Wünsche; öffentliche Sammlungszuordnungen nur bei öffentlichen Wünschen lesbar.
- **Neu umgesetzt:** Wunsch-Editor mit Auswahl `Öffentlich`/`Nur für mich` (auch beim Bearbeiten), Listen-Editor mit Titelbild-URL und responsive öffentliche Sammlungsseite mit Titelbild.
- **Bestandskompatibilität:** Bereits vorhandene Wünsche bleiben durch den Standardwert `public` sichtbar; neue private Wünsche sind nur für Eigentümer lesbar. Private Wünsche werden auf öffentlichen Sammlungsseiten herausgefiltert.
- **Einschränkungen:** Titelbilder sind externe HTTPS-URLs (kein Upload/Hosting), keine Bildmoderation oder automatische Bildsuche. Bestehende öffentliche Wünsche müssen bei Bedarf vom Besitzer ausdrücklich auf privat umgestellt werden. Vollständige Browser- und rollenbasierte Integrationstests stehen noch aus.

## Entwicklungsfortschritt – 10.11.2026 (Öffentliche Profile)

- **Neu umgesetzt:** Eigenständige responsive Profilseiten unter `amazon-wishlist/profile.html?handle=<handle>` mit Anzeigename, Bio, optionalem Profilbild und Übersicht der öffentlichen Sammlungen.
- **Neu umgesetzt:** Karten mit Titelbildern, Beschreibungen und Links zu öffentlichen Sammlungen; Teilen-Funktion mit nativer Gerätefreigabe bzw. Zwischenablage.
- **Neu umgesetzt:** Community-Feed und Personensuche verlinken auf die Profilgalerie; Profil-Editor erlaubt HTTPS-Profilbild-URL über das bereits vorhandene Feld `wishlist_profiles.avatar_url`; eigener Profil-Link verweist auf die neue Seite.
- **Sicherheit:** Die Profilgalerie fragt ausschließlich `visibility='public'` und `archived=false` ab. Bestehende Supabase-RLS-Policies bleiben aktiv; keine neuen Tabellen, keine produktiven Datensätze geändert.
- **Noch offen:** Eigene Bild-Uploads und Bildmoderation, Follower-Statistiken auf der Profilseite, personalisierte Profil-Themes, End-to-End-Browserprüfung.

## Entwicklungsfortschritt – 10.11.2026 (Social-Entdecken und Profilstatistiken)

- **Neu umgesetzt:** Öffentliche Profilseiten zeigen Follower-Zahlen, gefolgte Profile und Anzahl öffentlicher Sammlungen (maximal 48 angezeigte Sammlungen, danach `48+`).
- **Neu umgesetzt:** Eigenständige responsive Social-Entdecken-Seite `amazon-wishlist/discover.html` mit öffentlichen Sammlungskarten, Profilverlinkung, Suche, Themenfiltern und Sortierung nach Aktualität, Namen oder Follower-Zahl des Erstellers.
- **Neu umgesetzt:** Hauptnavigation verlinkt auf Social-Entdecken; mobile Karten und horizontal scrollbare Themenfilter.
- **Datenquelle und Sicherheit:** Bestehende `wishlist_follows`, `wishlist_profiles` und `wishlist_lists`; vorhandene RLS-Policies für öffentlich sichtbare Sammlungen und Follower geprüft. Keine Migration, keine Änderungen an Produktivdatensätzen.
- **Abgrenzung:** Entdecken zeigt maximal 60 neueste öffentliche Sammlungen. Follower-basierte Reihenfolge ist keine echte Like- oder Aufrufrangliste; die aggregierten Follower-Daten werden clientseitig aus maximal 10.000 geladenen Beziehungen berechnet. Für große Datenmengen sind serverseitige Aggregation und Pagination erforderlich.
- **Noch offen:** Browser-End-to-End-Test, vollständige Rankings, Likes/Favoriten, Profil-Badges und datensparsame skalierbare Statistiken.

## Entwicklungsfortschritt – 10.11.2026 (Sammlungs-Likes und private Merkliste)

- **Produktiv umgesetzt:** Zwei neue additive Supabase-Tabellen `wishlist_collection_likes` (öffentliche Likes, eine Stimme je angemeldetem Nutzer und Sammlung) und `wishlist_collection_bookmarks` (private Merkliste je Nutzer). Bestehende Produktivdaten und Tabellen bleiben unverändert.
- **Sichere RLS:** Likes sind nur für öffentliche, nicht archivierte Sammlungen lesbar; angemeldete Nutzer dürfen ausschließlich ihre eigenen Likes anlegen oder entfernen. Bookmarks sind ausschließlich für ihren Eigentümer lesbar, erstellbar und löschbar. Das Anlegen setzt eine öffentlich sichtbare Sammlung voraus. Bei später privatisierten Sammlungen bleibt der Bookmark intern gespeichert, die Oberfläche zeigt sie nicht mehr an.
- **Like-Zahlen:** SQL-Funktion `wishlist_collection_like_counts(uuid[])` mit `SECURITY INVOKER` und expliziter Freigabe für `anon`/`authenticated` berechnet tatsächliche Likes pro öffentlicher Sammlung. Keine simulierten Popularitätswerte.
- **Neu umgesetzt:** Likes und Merken auf öffentlichen Sammlungsseiten und in Social-Entdecken, Sortierung nach tatsächlichen Likes, Filter „Nur meine gemerkten Sammlungen“, eigenständige private Merkliste unter `amazon-wishlist/bookmarks.html`, mobile Schaltflächen und Navigation.
- **Grenzen:** Entdecken lädt maximal 60 neueste öffentliche Sammlungen; die Likes-Rangliste sortiert **innerhalb dieser Auswahl**. Die private Merkliste lädt maximal 200 Einträge. Likes sind öffentlich sichtbar und deren Datensätze enthalten Nutzer-UUIDs; die private Merkliste ist davon getrennt. Eine vollständige browserbasierte Prüfung mit realen Nutzerkonten steht noch aus.
- **Weitere Roadmap:** Serverbasierte Pagination für globale Rankings, bessere Login-Rückkehr, Profil-Favoriten und performante Social-Statistiken.

## Entwicklungsfortschritt – 10.11.2026 (Persönlicher Social-Feed)

- **Neu umgesetzt:** Responsive Seite `amazon-wishlist/social-feed.html` mit Tabs `Gefolgt`, `Gemerkt` und `Für dich`, plus direkter Einstieg und Navigation auf der mobilen Wishlist-Startseite.
- **Gefolgt:** Zeigt neueste öffentliche, nicht archivierte Sammlungen der Nutzer aus `wishlist_follows` (nur bei Anmeldung).
- **Gemerkt:** Zeigt die öffentlich gebliebenen Sammlungen aus der persönlichen `wishlist_collection_bookmarks`-Merkliste.
- **Für dich:** Kostenlose, deterministische Themenempfehlungen aus Schlüsselwörtern von gelikten/gemerkten Sammlungen; zusätzlich Like-Zahlen und Aktualität als Sortiersignale. Kein KI-Dienst, keine zusätzliche Profilspeicherung.
- **Social-Aktionen:** Öffentliche Sammlungen lassen sich aus dem Feed heraus liken und merken; gemeinsame Logik aus `collection-social.mjs`.
- **Privatsphäre und Produktivbetrieb:** Bestehende RLS-Policies geprüft; nur öffentliche Sammlungen werden geladen, Merkliste bleibt eigentümergebunden. Keine Datenbankmigrationen oder Bestandsdatenänderungen.
- **Einschränkungen:** Feed berücksichtigt maximal 100 zuletzt erstellte öffentliche Sammlungen; bei vielen gefolgten Profilen können ältere Beiträge fehlen. Empfehlungen sind einfache Schlagwortübereinstimmungen, keine semantische Suche. Browser-End-to-End-Test mit echten Nutzerkonten steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Persönliches Social-Dashboard)

- **Neu umgesetzt:** Mobile-first Social-Dashboard unter `amazon-wishlist/social-dashboard.html` mit Follower-Zahl, erhaltenen Likes und Anzahl neuer Aktivitäten seit dem letzten markierten Besuch.
- **Aktivitäten:** Neu veröffentlichte öffentliche Sammlungen gefolgter Profile, neue Follower sowie Likes auf eigene öffentliche Sammlungen. Die Einträge werden beim Aufruf aus vorhandenen `wishlist_follows`, `wishlist_lists`, `wishlist_profiles` und `wishlist_collection_likes` berechnet.
- **Neu umgesetzt:** „Als gesehen markieren“ speichert einen Zeitstempel im lokalen Browserspeicher pro angemeldetem Nutzer; keine neue Datenbanktabelle, kein Push und keine E-Mail. Ohne bisherigen Zeitstempel werden die letzten sieben Tage als neu behandelt.
- **Mobile Navigation:** Direkter Link im Hauptmenü und auf dem Startseiten-Banner.
- **Privatsphäre:** RLS und Filter für öffentliche, nicht archivierte Sammlungen bleiben aktiv. Likes werden nur für eigene öffentliche Listen geladen. Keine Änderungen an bestehenden Supabase-Datensätzen.
- **Grenzen:** Höchstens 200 Follower, 200 gefolgte Profile, 200 eigene Listen, 100 öffentliche Sammlungen gefolgter Profile und 200 Likes werden pro Aufruf berücksichtigt. Statistiken können bei größeren Mengen deshalb mit `200+` angezeigt werden; Benachrichtigungen sind berechnete Momentaufnahmen und keine persistierten Ereignisse. Vollständiger Browser-End-to-End-Test steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Dauerhafte Benachrichtigungszentrale)

- **Neu umgesetzt:** Mobile-first Benachrichtigungszentrale `amazon-wishlist/notifications.html` und `notifications.mjs`, verlinkt von Startseite und Social-Dashboard.
- **Additive Supabase-Migration:** `wishlist_notification_preferences` (Einstellungen für neue öffentliche Sammlungen, Follower, Likes) und `wishlist_notification_reads` (dauerhafte Gelesen-Markierungen je Nutzer und Ereignis). Bestehende Produktivdaten bleiben unverändert.
- **Sicherheit:** Beide Tabellen mit aktivierter RLS und ausschließlich eigentümergebundenen Policies. Die Benachrichtigungsfunktion `wishlist_notification_feed(p_before,p_limit,p_before_key)` läuft als `SECURITY INVOKER`, greift auf vorhandene Tabellen mit deren RLS zurück und gibt nur Ereignisse für den authentifizierten Nutzer zurück. Sammlungsereignisse erfordern eine vor der Veröffentlichung bestehende Follow-Beziehung und aktuell öffentliche, nicht archivierte Sammlung.
- **Paginierung:** Serverseitige Keyset-Paginierung nach `created_at` und `event_key`, bis zu 20 Aktivitäten pro Seite. „Weitere laden“ ergänzt die Liste.
- **Gelesen-Status:** Einzelne Ereignisse oder alle aktuell geladenen ungelesenen Ereignisse als gelesen markieren; persistente, insert-only Markierung ohne unnötige Rechte für spätere Änderungen.
- **Einstellungen:** Individuelle, dauerhaft gespeicherte Aktivierung/Deaktivierung der drei Hinweisarten.
- **Abgrenzung:** Keine E-Mail-, Push- oder Hintergrundbenachrichtigungen; Ereignisse werden beim Abruf aus dem aktuellen Datenbestand berechnet. Entfernte Likes, aufgehobene Follows oder später privatisierte Sammlungen erscheinen ggf. nicht mehr. Ungelesen-Zahl bezieht sich auf die geladenen Einträge, nicht auf alle möglichen Aktivitäten. Gelesen-Markierungen bleiben bei erneuter Erzeugung derselben Ereigniskennung erhalten. Vollständiger Browser-End-to-End-Test mit realen Konten steht noch aus.

## Entwicklungsfortschritt – 10.11.2026 (Geschenk- und Anlasszentrale)

- **Neu umgesetzt:** Responsive private Geschenk- und Anlasszentrale `amazon-wishlist/occasions.html` und `occasions.mjs` mit Geburtstagen, Jahrestagen und frei benannten Geschenkterminen.
- **Produktivmigration (additiv):** Neue Tabelle `wishlist_occasions` mit Titel, optionalem Personennamen, Datum, jährlicher Wiederholung, Vorwarnzeit in Tagen und privaten Notizen. Keine bestehenden Produktivdatensätze verändert.
- **Sicherheit:** RLS aktiviert; `SELECT`, `INSERT`, `UPDATE` und `DELETE` ausschließlich für den jeweiligen authentifizierten Eigentümer. Serverseitige Datenvalidierung durch Check-Constraints und Feldlängen.
- **Kalenderfunktionen:** Wiederkehrende Jahrestermine, Countdown in Tagen, Erinnerungshinweise im konfigurierten Zeitfenster, Filter „Alle“, „Nächste 30 Tage“ und „Erinnerungen“, Hinzufügen/Bearbeiten/Löschen.
- **Mobile Bedienung:** Responsive Layouts, große Touch-Ziele und Hauptnavigation mit direktem Link.
- **Grenzen:** Erinnerungshinweise erscheinen nur beim Öffnen der Seite; keine automatischen Push-Mitteilungen oder E-Mails. Einmalige Termine in der Vergangenheit werden nicht in der kommenden Terminliste angezeigt. Für den 29. Februar wird in Nicht-Schaltjahren der 28. Februar verwendet. Es werden höchstens 1000 Termine geladen. Browser-End-to-End-Test mit echtem Nutzerkonto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Private Geschenkplanung und Budget)

- **Neu umgesetzt:** Responsive Geschenkplanung `amazon-wishlist/gift-planner.html` und `gift-planner.mjs` mit Geschenkzuordnung zu eigenen Anlässen, Empfänger, Notizen, geplantem und tatsächlichem Euro-Betrag.
- **Status-Workflow:** `idea`, `planned`, `purchased`, `wrapped`, `gifted`; Geschenkstatus editierbar, filterbar und mit Fortschrittsanzeige (verschenkt/gesamt).
- **Budget:** Additives `budget_amount`-Feld auf `wishlist_occasions`, standardmäßig 0 €, je Anlass einstellbar. Dashboard aggregiert Anlassbudgets, geplante Beträge und tatsächlich hinterlegte Ausgaben; Budget-Fortschrittsbalken für gewählten Anlass.
- **Produktivmigration:** Neue `wishlist_gift_plans`-Tabelle mit RLS, Eigentümer-Policies für SELECT/INSERT/UPDATE/DELETE und zusätzlicher Eigentumsprüfung für den zugeordneten Anlass bei INSERT/UPDATE. Keine bestehenden Produktivdaten gelöscht.
- **Navigation:** Verlinkung in mobiler Hauptnavigation und Anlasszentrale.
- **Grenzen:** Aktuell keine gesonderte Budgettabelle pro Empfänger; der Empfängername ist ein optionales Freitextfeld je Geschenk, Budgets werden pro Anlass gespeichert. Beträge werden in EUR dargestellt. Höchstens 1000 Anlässe und 1000 Geschenke pro Seitenaufruf geladen. Browser-End-to-End-Test mit echtem Nutzerkonto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Wunschwelten mit Geschenkplanung verbinden)

- **Neu umgesetzt:** Geschenkplanung bietet eine optionale Verknüpfung zu öffentlichen Wunschwelten über `wishlist_gift_plans.source_list_id`. Additive Migration mit Fremdschlüssel und RLS-Eigentümerprüfung sowie öffentlicher, nicht archivierter Quellsammlung. Bestehende Produktivdaten bleiben erhalten.
- **Kostenlose Empfehlungen:** Aus den neuesten 100 öffentlichen Wunschwelten werden eigene und privat gemerkte Sammlungen berücksichtigt. Ein lokaler Stichwortabgleich mit Anlass, Empfänger und vorhandenen Geschenktiteln sortiert bis zu sechs Vorschläge. Ein Vorschlag kann als Entwurf in das Geschenkformular übernommen und nach Prüfung gespeichert werden. Kein KI-Dienst und keine automatische Preisschätzung.
- **Budgetwarnungen:** Für jeden Anlass mit positivem Budget erscheint eine Warnung, wenn geplante oder tatsächlich erfasste Ausgaben das Budget übersteigen. Mobile Darstellung ergänzt um Empfehlungskarten und direkten Quelllink.
- **Grenzen:** Empfehlungen decken nicht alle älteren gemerkten Sammlungen ab, da nur die neuesten 100 öffentlichen Sammlungen betrachtet werden. Derzeit erfolgt keine automatische Einzelartikel-Übernahme aus Wunschlisten und keine Echtzeitpreisermittlung. Quellen, die später privat oder archiviert werden, sind über den öffentlichen Link nicht mehr verfügbar. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Öffentliche Wünsche und Produkte als Geschenke übernehmen)

- **Neu umgesetzt:** Geschenkplaner mit mobiler Suche nach Produkten aus `wishlist_products` und Anzeige passender öffentlicher Wünsche aus `wishlist_wishes`. Suchtreffer werden als Entwurf in das Geschenkformular übernommen; der Nutzer bestätigt den Speichervorgang.
- **Additive Datenbankmigration:** Optionale Fremdschlüssel `wishlist_gift_plans.source_wish_id` und `source_product_id`. RLS für INSERT/UPDATE erweitert: eigener Anlass, ggf. öffentliche nicht archivierte Quellsammlung, ggf. öffentlicher Wunsch und gültiges Produkt; bei gleichzeitig gesetztem Wunsch und Produkt müssen beide zusammenpassen. Keine bestehenden Produktivdaten verändert.
- **Mobile Bedienung:** Responsive Produktkarten mit Quelle, Amazon-Produktlink (falls gültige ASIN vorhanden), Übernehmen-Schaltfläche und Möglichkeit, eine Produktverknüpfung zu lösen. Der bestehende Status- und Budgetbereich bleibt erhalten.
- **Verbesserung:** Unicode-Stichworttrennung für die vorhandenen regelbasierten Geschenkempfehlungen korrigiert.
- **Grenzen:** Suche derzeit nach Produkttitel, maximal 40 Produkte und bis zu 200 öffentliche Wunschzuordnungen je Suchlauf. Keine automatischen Preisabfragen und keine Push-Mitteilungen. Bei einer später privatisierten Wunschquelle kann eine Bearbeitung des verknüpften Geschenks die RLS-Prüfung nicht mehr erfüllen, bis die Quelle gelöst wird. Browser-End-to-End-Test mit echtem Nutzerkonto steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Sichere Geschenkreservierungen)

- **Neu umgesetzt:** Reservierung einzelner öffentlicher Wünsche in öffentlichen, nicht archivierten Sammlungen. Mobile Schaltflächen für Reservieren und Aufheben auf `collection.html`; Reservierungsstatus für angemeldete Besucher, ohne die reservierende Person offenzulegen.
- **Additive Produktivmigration:** Neue `wishlist_gift_reservations`-Tabelle mit `wish_id` als Primärschlüssel und `reserver_id` als privatem Eigentümer. Der Primärschlüssel verhindert parallele Doppelreservierungen atomar. Bestehende Daten bleiben erhalten.
- **Überraschungsschutz:** RLS aktiv, sämtliche direkten Tabellenrechte für `anon` und `authenticated` entzogen. Drei eingeschränkte `SECURITY DEFINER`-RPCs: `wishlist_reserve_wish`, `wishlist_cancel_wish_reservation` und `wishlist_reservation_status`. Aufruf nur authentifiziert; die Statusfunktion schließt den Wunscheigentümer explizit aus und gibt nur die Zustände `available`, `reserved_by_you` oder `already_reserved` zurück. Keine fremden Reserver-IDs werden ausgegeben.
- **Sicherheitsprüfung:** RLS aktiv, direkte SELECT-Rechte für `anon` und `authenticated` fehlen, alle drei Funktionen sind SECURITY DEFINER; unauthentifizierter Statusabruf liefert keine Zeilen.
- **Grenzen:** Nur Wünsche, die aktuell öffentlich sind und in mindestens einer öffentlichen, nicht archivierten Sammlung ihres Eigentümers stehen, können reserviert werden. Reservierungen sind nicht an einen konkreten Anlass gekoppelt und werden nicht automatisch zu Käufen. Bei einer späteren Privatisierung wird kein Status mehr ausgegeben; der ursprüngliche Reservierer kann die eigene Reservierung weiterhin aufheben. Vollständiger Browser-End-to-End-Test mit zwei angemeldeten Konten steht aus.

## Entwicklungsfortschritt – 10.11.2026 (Meine Geschenkreservierungen)

- **Neu umgesetzt:** `amazon-wishlist/my-reservations.html` und `my-reservations.mjs` als mobile, private Übersicht eigener Reservierungen mit stabiler Keyset-Paginierung (20 Einträge pro Seite), Aufheben über vorhandene eigentümergebundene RPC und Verknüpfung zur Geschenkplanung.
- **Additive Supabase-Migrationen:** `wishlist_my_gift_reservations(p_limit,p_before,p_before_wish_id)` liefert ausschließlich Reservierungen des authentifizierten Reservierers. Produktdaten werden nur angezeigt, wenn Wunsch und mindestens eine Sammlung noch öffentlich sind; andernfalls wird ein neutraler Platzhalter geliefert. `wishlist_my_reservation_for_plan(p_wish_id)` prüft die eigene Reservierung und die öffentliche Sichtbarkeit erneut, bevor ein Geschenkentwurf übernommen wird. Beide Funktionen sind `SECURITY DEFINER`, mit leerem `search_path`, ohne PUBLIC-EXECUTE und ausschließlich für `authenticated` freigegeben.
- **Geschenkplanung:** `gift-planner.html?reserved_wish=<id>` lädt die geprüfte Reservierung serverseitig, füllt Produkt und Wunschtitel als Entwurf vor und verlangt eine bewusste Speicherung. Eine Reservierung wird dadurch nicht aufgehoben; die Übernahme löst keinen Kauf aus.
- **Navigation:** Neue Links in Hauptnavigation, Sammlung und Geschenkplaner. Alle bisherigen Produktivdaten erhalten.
- **Grenzen:** Keine automatische Synchronisierung zwischen Geschenkstatus und Reservierungsstatus. Nach Privatisierung des Wunsches keine Übernahme in die Geschenkplanung. Browser-End-to-End-Test mit angemeldetem Konto steht aus.

## Herkunft und Geltung

Grundlage ist die vom Nutzer am 10.11.2026 hochgeladene vollständige Ideensammlung („Eingefügter Text.txt“, ca. 694 Zeilen) mit der großen Vision, der kostenlosen Feature-Liste, drei Kostenphasen und dem Entwicklungsauftrag. Die vorliegende Datei ist eine strukturierte **vollständige Feature-Referenz**, keine wortwörtliche Transkription der damaligen Unterhaltung. Bei Widersprüchen gelten die **neueren ausdrücklichen Nutzeranweisungen**, insbesondere die Freigabe für eigenständige Veröffentlichungen.

**Für neue Chats:** Lies zuerst diese Roadmap und prüfe dann den tatsächlichen Stand in `amazon-wishlist/`, bevor du Features als umgesetzt bezeichnest. Arbeite möglichst direkt an einem gebündelten Paket, statt die Vision erneut grundsätzlich zu diskutieren.
