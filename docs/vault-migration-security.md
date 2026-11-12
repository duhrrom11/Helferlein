# Helferlein – sichere Migration bestehender Tresore

## A10 echter Chromium-Prozessabbruch waehrend IndexedDB-Write (2026-11-13)

Der isolierte CI-Test `tests/a10-browser-hardkill.cjs` startet Chromium mit einem kurzlebigen Browserprofil auf localhost. Nach dem Speichern eines **synthetischen** V1-aktiven Staging-Datensatzes startet er eine echte `readwrite`-Transaktion mit vielen Schreiboperationen, signalisiert einen Zwischenstand und beendet den Chromium-Hauptprozess mittels `SIGKILL`. Danach wird Chromium mit **demselben** Profil neu gestartet und der Zustand ohne automatische Reparaturschreibvorgaenge gelesen. Ein nicht abgeschlossener Schreibvorgang darf keinen halb aktivierten Datensatz hinterlassen. Das Profil wird nach dem Test geloescht.

**Grenzen:** Ein `SIGKILL` ist kein Stromausfall und simuliert keine Festplatten- oder Controller-Cache-Verluste. Ein CI-Lauf belegt weder alle moeglichen Crash-Zeitpunkte noch die Haltbarkeit auf jedem Browser/Dateisystem. Eine echte Quota-/Disk-Full-Injektion ist nicht enthalten. Die synthetischen V1-Schluessel bleiben im Test absichtlich sichtbar; produktive V1-Daten sind nicht betroffen. Ein extern wiederherstellbares verschluesseltes Backup und die Sicherheitsfreigabe fehlen. **A10 bleibt NO-GO.**


## A10 Chromium-Neustart mit persistentem Testprofil (2026-11-13, isoliert)

`tests/a10-browser-persistent-restart.cjs` verwendet echtes Headless Chromium und dasselbe **temporaere** Browserprofil ueber zwei vollstaendige Browser-Neustarts hinweg. Geprueft werden der dauerhafte Staging-Datensatz, ein spaeterer simulierter V2-Aktivierungsmarker, unveraendertes V1, ein Revisionskonflikt nach Neustart und zwei kontrollierte Transaktionsfehler: eine Ausnahme vor dem Schreiben sowie `abort()` **nach erfolgreichem `put`**, aber vor dem Commit. Beide duerfen den gespeicherten Zustand nicht veraendern. Das temporaere Profil wird nach dem Test geloescht.

**Keine vollstaendige Absturz- oder Quota-Garantie:** Der Test nutzt geordnete Browser-Neustarts, keinen erzwungenen Prozessabsturz waehrend eines Schreibvorgangs, keinen Stromausfall und keine echte Disk-Full-/Quota-Injektion. Die Test-Aktivierung ist kein Produktiv-Go. Ein unabhaengig wiederherstellbares, geschuetztes V1-Backup und weitere Security-Pruefungen fehlen. **A10 bleibt NO-GO.**


## A10 echte Browser-IndexedDB-Pruefung (2026-11-13, isoliert)

Die separate PR-CI `.github/workflows/a10-browser-indexeddb.yml` startet echtes Headless Chromium gegen einen kurzlebigen lokalen HTTP-Server. `tests/a10-browser-indexeddb.cjs` testet mit synthetischem V1-Datensatz: zwei Tabs desselben Origins mit konkurrierendem Revisionsstand, eine explizit abgebrochene IndexedDB-Transaktion ohne persistierten Zwischenstand, Wiederlesen nach Seiten-Reload und Erhalt des V1-Rueckfallstands. Kein produktiver Origin, keine produktiven Konten oder Datenbanken.

**Grenzen:** Reload ist kein Stromausfall; ein neuer isolierter Browserkontext hat absichtlich einen anderen Speicherbereich. Ein echter Kill/Restart mit demselben persistenten Browserprofil, Quota-/Disk-Fault-Injection und unabhaengige kryptografische Wiederherstellung sind separate Freigabevoraussetzungen. Der produktive V1-Klartextschluessel bleibt ungeschuetzt, bis ein sicherer externer Rueckfallweg existiert. A10 bleibt NO-GO.


## A10 isolierter IndexedDB-Transaktionsadapter (2026-11-13, KEINE Aktivierung)

`assets/a10-atomic-idb-store.js` stellt eine **nicht eingebundene** IndexedDB-Transaktionsschnittstelle bereit. Der Adapter liest und schreibt einen Zustand pro Tresor-ID in **einer** `readwrite`-Transaktion; der Revisionsvergleich erfolgt innerhalb derselben Transaktion. Erst das `complete`-Ereignis bestaetigt den Commit, `abort`/`error` fuehren zu einem Fehler. Staging und simulierter Aktivierungsmarker bleiben Teil desselben Datensatzes, V1 wird bei diesen Schritten nicht geloescht. Die Datenbank darf nur explizit mit einem `a10-isolated-...`-Namen geoeffnet werden; kein produktiver Aufrufer existiert.

**Testgrenze:** Die automatisierten Tests verwenden einen synthetischen, serialisierenden Transaktions-Treiber fuer konkurrierende Revisionen, Quota-Fehler und Abbrueche vor Commit. Sie sind **kein realer Browser-IndexedDB-Test** fuer Browser-Absturz, Dauerhaftigkeit, mehrere Tabs oder Stromausfall. Ein IndexedDB-`complete` allein garantiert nicht in allen Browsern die physische Persistenz nach einem Stromausfall. Ein echter isolierter Browser-Test mit Fault Injection und unabhaengig geprueftem Recovery ist vor Aktivierung Pflicht.

**Vertraulichkeitsgrenze:** Der Adapter bewahrt den unveraenderten V1-Datensatz inklusive `masterKeyHex` auf. Damit bleibt das bisherige Klartextschluessel-Risiko waehrend einer Migration bestehen. V1 darf erst nach einem nachweislich unabhaengig wiederherstellbaren, geschuetzten Rueckfallweg entfernt werden. Es gibt **keine** produktive Migration, keine Datenbankmigration und **keine A10-Freigabe**.


## A10 isoliertes Staging-/Aktivierungsprotokoll (2026-11-13, NICHT produktiv)

Das ungenutzte Modul `assets/a10-migration-protocol.js` modelliert **ausschliesslich im Arbeitsspeicher** die Schritte `initial`, `stage`, `activate` und `recoverAfterCrash`. Es prueft Revisionsnummern, laesst den V1-Rueckfallstand unveraendert und aktiviert V2 nur mit einem **synthetischen Test-Flag**. Ein Absturz vor Aktivierung laesst V1 als aktiven Zustand; nach Aktivierung wird nicht automatisch auf V1 zurueckgeschaltet. Die Tests simulieren Unterbrechungen mittels Serialisierung, ohne Browser- oder Produktivdaten zu verwenden.

**Wichtige Grenze:** Dieses Modell ist **noch kein absturzsicheres persistentes Protokoll**. Ein Revisionsvergleich im Arbeitsspeicher ersetzt keine atomare Compare-and-Swap-Operation zwischen Browser-Tabs; das Flag `verified=true` ist kein unabhaengiger Sicherungs- oder Sicherheitsnachweis. Vor jeglicher produktiven Nutzung braucht es ein nachweislich atomares, dauerhaftes Speicherkonzept, einen extern wiederherstellbaren verschluesselten V1-Rueckfallstand, echte Recovery-Pruefungen, Konflikt-/Quota-/Crash-Tests im isolierten Browser und eine gesonderte Freigabe. Weder Legacy-Daten loeschen noch den Aktivierungsmarker im Produktivpfad umstellen. **A10 bleibt NO-GO.**


## A10: Schluesseltrennung und rueckwaertskompatible Migration (2026-11-12, Entwurf, NO-GO)

**Ist-Pfad (Codepruefung):** `initVault()` erzeugt einen zufaelligen 256-Bit-Schluessel und speichert `masterKeyHex` zusammen mit `encryptedData` und unverschluesselten lokalen Kontakt-/Check-in-Feldern in `localStorage.digital_estate_vault`. Bei jedem Start wird der Schluessel aus demselben Datensatz gelesen. `saveLocalConfig()` schreibt den Datensatz erneut. Die Supabase-Wiederherstellung schreibt den entschluesselten Schluessel wieder als `masterKeyHex` in denselben lokalen Datensatz. Das bedeutet: AES-GCM schuetzt derzeit nicht gegen einen Angreifer mit Zugriff auf den Browserspeicher. Cloud-Backups speichern dagegen den Schluessel nur in einer PBKDF2/AES-GCM-geschuetzten Schluesselhuelle, sofern diese bewusst vorbereitet wurde.

**Unabhaengiger Befund zur Wiederherstellung:** Im aktiven `assets/heir-owner-legacy.js` existiert kein nachgewiesener verschluesselter lokaler Datei-Export/-Import. Hinweise auf eine bereits verfuegbare Offline-Sicherungsdatei duerfen deshalb nicht als funktionierende Wiederherstellungsgarantie gelten. Die Anleitung zum Geraetewechsel wurde entsprechend korrigiert.

### Zielbild (noch nicht aktiviert)

1. Neues versioniertes lokales Format, z. B. `formatVersion: 2`: verschluesselter Inhalt und verschluesselte Metadaten, zufaellige Salt-/Nonce-Werte und eine **passwortgeschuetzte lokale Schluesselhuelle**. Kein Klartext-`masterKeyHex` im dauerhaften Datensatz. Masterkey nur waehrend einer entsperrten Sitzung im Speicher. Authentifizierte Verschluesselung (AES-GCM), klar definierte KDF-Parameter und eindeutige Versionskennzeichnung; Passwortstaerke und KDF-Kosten gesondert pruefen.
2. Beim Start zuerst Format erkennen. Legacy-v1-Datensaetze nur lesend und ohne automatische Umschreibung oeffnen; fehlende oder ungueltige Schluesselhuellen niemals durch einen neuen Tresor ersetzen. V2 erst nach erfolgreicher Passwortentsperrung laden.
3. Migration ausschliesslich nach ausdruecklicher Einwilligung, erfolgreicher Entschluesselung des **alten** Tresors, validierter vollstaendiger Konfiguration und Nachweis eines funktionierenden Wiederherstellungswegs. Vor dem Umschalten einen **unabhaengig wiederherstellbaren** verschluesselten Rueckfallstand bereitstellen; keine Klartextschluessel in Exporten. Ein Browserprofil-Backup allein ist kein sicherer Rueckfallweg.
4. Neue V2-Daten in einen **separaten Staging-Key** schreiben, wieder lesen und mit Passwort vollstaendig entschluesseln. Inhalte, Kontakte, Check-in und IDs vergleichen. Erst danach atomaren Aktivierungsmarker umstellen. Legacy-Datensatz bis zur bestaetigten Rueckfallfaehigkeit unangetastet lassen. Fehler, Tab-Konflikte, Abbruch und Speicherplatzmangel muessen fail-closed bleiben.
5. Supabase-Backup und Cloud-Wiederherstellung muessen V1/V2 explizit unterscheiden. Keine ungueltige Kombination aus lokalem V2-Schluesselumschlag, Cloud-`recovery_key` und verschluesselten Cloud-Daten akzeptieren. Keine automatischen Cloud-Ueberschreibungen beim lokalen Formatwechsel; Schluesselidentitaet, Revision und Konto erneut pruefen.
6. Browser-Sitzungen, Cross-Tab-Konflikte, Passwortverlust, KDF-Upgrade, Fehlversuche, Reload und Speicherfehler in **isolierten, synthetischen Tests** abdecken. Vor der Freigabe einen vollstaendigen Export-/Import- und Geraetewechsel-Roundtrip ohne Produktionsdaten nachweisen.

**Freigabesperre:** Keine automatische V1-Migration, keine V2-Aktivierung, keine Freigabe fuer Passwoerter oder Zugangsdaten, solange der isolierte Roundtrip, Rueckfallweg und die Sicherheitspruefung fehlen. Bestehende lokale Datensaetze und produktive Supabase-Tabellen bleiben unveraendert.


## Aktualisierter A10-Release-Gate-Befund (2026-11-12, nur lesende Produktionsprüfung)

**Dieser Befund ersetzt die veraltete Bestandsaufnahme vom 2026-11-08 oben, nicht die dort beschriebenen Sicherheitsanforderungen.**

- In Supabase ist `public.vault_cloud_snapshots` bereits vorhanden; RLS ist aktiv. Vier Richtlinien für `authenticated` begrenzen SELECT, INSERT, UPDATE und DELETE anhand von `auth.uid() = owner_user_id`; UPDATE hat sowohl USING als auch WITH CHECK. Die Tabelle war zum Prüfzeitpunkt leer. Das ist ein begrenzter, rein lesend bestätigter Befund, kein autorisierter End-to-End-Zugriffstest.
- Die Edge Functions `heir-invitations` und `heir-redemption` sind aktiv und haben `verify_jwt=true`. Das ist **kein** Nachweis für eine bereitgestellte `vault-api` oder eine Freigabe von Tresorinhalten an Erben.
- Eine Edge Function `vault-api` war in der Produktionsliste **nicht** vorhanden. Die öffentliche Nachlass-Seite lädt weiterhin Firebase-Kompatibilitätsskripte und zeigt die ausdrückliche Warnung, keine Passwörter, PINs oder Zugangsdaten zu speichern. Ein vollständiger, überprüfter neuer Cloud-Tresorpfad ist damit nicht nachgewiesen.
- Die privaten `nachlass_private.heir_*`-Tabellen sind durch RLS ohne direkte Policies geschlossen; dies ist für einen serverseitig kontrollierten Zugriff nicht automatisch ein Fehler. Die Security Advisors melden außerdem mehrere `SECURITY DEFINER`-RPCs im Wunschlistenbereich sowie deaktivierten Schutz gegen kompromittierte Auth-Passwörter. Diese Befunde benötigen separate fachliche Prüfung; hier wurden keine Produktiveinstellungen verändert.

**Release-Entscheidung: A10 NO-GO für die Speicherung sensibler Geheimnisse und für eine Freigabe des Cloud-Tresors.** Die allgemeine Webseite darf die bestehende Warnung weiter anzeigen; eine grüne CI oder das Vorhandensein der Tabelle hebt diese Einschränkung nicht auf.

**Noch erforderliche Freigaben, ohne Testkonten in Produktion:** (1) den tatsächlich genutzten Client-/Server-Speicherpfad und dessen Autorisierung vollständig im Code prüfen, (2) Verschlüsselung und Wiederherstellung in einer isolierten Nichtproduktionsumgebung nachweisen, (3) Migration bestehender Tresore nur nach Eigentumsnachweis und Rollback-Konzept erlauben, (4) Monitoring, Schlüssel-/Revisionskonflikte und Ausfallverhalten vor dem Aktivieren bewerten. Bis dahin weder Firestore-Regeln öffnen noch unsichere Tresorfunktionen freischalten.


Status: Vorbereitung. **Nicht automatisch ausfuehren.** Firestore-Regeln fuer `vaults` bleiben `allow read, write: if false`.

## Freigabe und aktueller Produktionsbefund (2026-11-08)

Der Projektbetreiber hat die Umsetzung und moeglichst zeitnahe Veroeffentlichung der sicheren Cloud-Anbindung ausdruecklich freigegeben. Das ist eine **Entwicklungsfreigabe**, aber kein Eigentumsnachweis fuer einzelne bestehende Tresore.

Produktiv geprueft: Supabase hat aktuell die Tabellen `user_data`, `wg_spaces` und `wg_members` mit aktivierter RLS. Es ist derzeit **keine Edge Function bereitgestellt**. Die Entwurfs-API `vault-api` ist deshalb noch kein produktiver Speicherweg. Der bestehende Firestore-Zugriff bleibt bis zu einer nachweisbar sicheren Umstellung gesperrt.

**Umsetzungsreihenfolge:** (1) sicheren neuen, benutzergebundenen Cloud-Tresor mit Auth und serverseitiger Autorisierung implementieren; (2) lokale Verschluesselung und Wiederherstellung ohne Datenverlust sicherstellen; (3) vorhandene Tresore erst nach gesonderter Eigentuemerpruefung migrieren; (4) produktive Bereitstellung mit Sicherheitspruefungen, Monitoring und Rollback; (5) die Browseroberflaeche erst dann auf den neuen Speicherweg umstellen. Keine pauschale Freigabe alter Firebase-Regeln.

## Aeltere Cloud-Sicherungen nur nach Entschluesselungspruefung bestaetigen

Bei Cloud-Sicherungen ohne verschluesselte Konfiguration prueft die lesende Statusfunktion vor einer Uebereinstimmungsmeldung jetzt ebenfalls, ob die verschluesselten Tresoreintraege mit dem aktuellen lokalen Masterkey entschluesselbar sind. Ein reiner Bytevergleich von IV und Ciphertext gilt nicht mehr als ausreichender Nachweis. Die Warnung vor fehlenden Cloud-Einstellungen bleibt erhalten.

## Wiederherstellungsschluessel meldet Aenderungen waehrend des Uploads

Nach dem bestaetigten Schreiben der verschluesselten Schluesselhuelle wird nochmals geprueft, ob sich lokaler Snapshot, aktiver Schluessel oder Revision waehrend des Cloud-Aufrufs veraendert haben. In diesem Fall meldet die App, dass der Schluessel nur fuer den vorherigen Stand gespeichert wurde, statt unbesehen einen aktuellen Stand zu bestaetigen. Der Cloud-Schreibvorgang wird dabei nicht rueckgaengig gemacht.

## Wiederherstellungspasswort prueft Schluessel und Revision vor dem Upload

Die Passwortumhuellung des Tresor-Masterkeys verwendet einen zu Beginn festgehaltenen Schluesselwert. Vor dem Speichern der verschluesselten Schluesselhuelle werden localStorage-Snapshot, aktiver Masterkey, lokale Revision und persistierter Stand erneut geprueft. Damit kann ein zwischenzeitlicher Schluessel- oder Revisionswechsel nicht unbemerkt eine veraltete Schluesselhuelle hochladen.

## Cloud-Upload prueft aktiven Schluessel und Revision vor dem Schreiben

Die manuelle Supabase-Tresorsicherung merkt sich Masterkey und lokale Revision vor den asynchronen Schritten. Vor dem Upload werden diese Werte neben dem localStorage-Snapshot und der Persistierungsrevision erneut verglichen. Auch nach dem Upload wird ein inzwischen geaenderter Stand als nicht mehr aktuell gemeldet. Dadurch wird ein Schluessel- oder Revisionswechsel waehrend der Vorbereitung nicht stillschweigend gesichert.

## Cloud-Backup-Status prueft Schluessel und Revision bis zum Abschluss

Die lesende Cloud-Backup-Statuspruefung merkt sich aktiven Masterkey und lokale Speicherversion vor dem asynchronen Entschluesseln. Vor einer positiven oder abweichenden Ergebnisanzeige wird zusaetzlich zum lokalen Snapshot kontrolliert, dass sich Schluessel und Revision nicht geaendert haben. So werden veraltete Statusmeldungen bei zwischenzeitlichen Aenderungen vermieden.

## Lesende Wiederherstellungsprobe prueft aktiven Masterkey bis zum Abschluss

Die lesende Wiederherstellungsprobe merkt sich den aktiven Masterkey vor den asynchronen Cloud- und Entschluesselungsschritten. Vor einer positiven Meldung wird geprueft, dass der aktive Schluessel noch identisch ist, zusaetzlich zu den bestehenden Snapshot- und Revisionspruefungen. So wird eine veraltete Erfolgsmeldung bei einem Schluesselwechsel vermieden.

## Cloud-Backup-Status prueft wiederherstellbare Metadaten

Die lesende Statuspruefung validiert nun auch die entschluesselte Cloud-Konfiguration anhand der Wiederherstellungsanforderungen: Pflichtfelder, Zeitstempel, Intervallgrenzen sowie Kontaktlisten und deren Namen. Ein positives Statusresultat setzt damit voraus, dass die Konfiguration nicht nur entschluesselbar, sondern nach diesen Regeln auch wiederherstellbar ist. Es werden keine Daten geschrieben.

## Cloud-Backup-Status prueft Entschluesselbarkeit der Eintraege

Die lesende Cloud-Backup-Statuspruefung vergleicht nicht mehr nur IV und Ciphertext, sondern entschluesselt die verschluesselten Cloud-Eintraege zusaetzlich mit dem aktiven lokalen Masterkey und erwartet eine gueltige Eintragsliste. Nur danach kann sie die verschluesselte Konfiguration vergleichen und einen positiven Status melden. Keine lokalen oder Cloud-Schreibvorgaenge.

## Lesende Wiederherstellungsprobe prueft Metadaten auf Wiederherstellbarkeit

Die rein lesende Cloud-Wiederherstellungsprobe validiert nach erfolgreicher Entschluesselung auch Pflichtfelder, Check-in-Intervall, Zeitstempel, Kontaktlistenlaengen und Namen entsprechend den Wiederherstellungsregeln. Fehlerhafte verschluesselte Kontakte oder Einstellungen werden als nicht wiederherstellbar gemeldet, statt eine irrefuehrende Erfolgsmeldung zu zeigen. Es werden keine lokalen oder Cloud-Daten geschrieben.

## Schluesselhuellenlaenge vor Passwortableitung validieren

Bei der Cloud-Wiederherstellung wird die AES-GCM-Schluesselhuelle vor der rechenintensiven PBKDF2-Ableitung auf die erwarteten 48 Bytes geprueft (32 Byte Masterkey plus 16 Byte Authentifizierungstag). Zusammen mit den bestehenden Salt- und IV-Laengenpruefungen werden unvollstaendige Schluesselhuellen frueh abgewiesen, ohne lokale Daten zu ersetzen.

## Letzte Wiederherstellungskontrolle gegen asynchrone Aenderungen

Unmittelbar vor dem lokalen Schreiben des entschluesselten Cloud-Tresors werden nun auch die zu Beginn festgehaltene Speicherversion und der aktive Masterkey erneut verglichen. Ausserdem wird die lokale Eintragsliste nochmals auf einen unveraenderten leeren Zustand geprueft. Bei einem Wechsel wird die Wiederherstellung abgebrochen, ohne lokale Daten zu ersetzen.

## Masterkey-Format vor dem Passwortschutz pruefen

Vor dem Verpacken des Masterkeys in die passwortgeschuetzte Schluesselhuelle prueft die Anwendung das 64-stellige hexadezimale AES-256-Schluesselformat sowie das Vorhandensein der verschluesselten lokalen Datenfelder. Fehlerhafte Schluessel werden vor der Verarbeitung der Schluesselbytes abgewiesen.

## Entschluesselbarkeit vor dem Speichern des Wiederherstellungsschluessels

Auch beim Einrichten des passwortgeschuetzten Cloud-Wiederherstellungsschluessels wird der lokale verschluesselte Tresorinhalt zunaechst mit dem aktiven Masterkey entschluesselt und auf eine Eintragsliste geprueft. Wenn dies fehlschlaegt oder sich der lokale Snapshot waehrenddessen aendert, wird kein neuer Wiederherstellungsschluessel in Supabase gespeichert.

## Entschluesselbarkeit vor dem Cloud-Upload verifizieren

Vor einem manuellen Supabase-Backup wird der lokal verschluesselte Tresorinhalt mit dem aktiven Masterkey probeweise entschluesselt und die enthaltene Eintragsliste geprueft. Bei fehlgeschlagener Entschluesselung wird kein Cloud-Snapshot ersetzt. Nach der asynchronen Pruefung werden lokaler Snapshot und Speicherversion erneut verglichen, damit zwischenzeitliche Aenderungen den Upload abbrechen.

## Bewusst geleerte Vertrauenspersonenliste schuetzen

Eine lokale Vertrauenspersonenliste mit `[]` wird bei der Cloud-Wiederherstellung nicht mehr als unveraenderter Standard-Tresor akzeptiert. Nur die exakt initialisierte Standardliste gilt als unveraendert. Dadurch kann eine bewusst vorgenommene Entfernung der Vertrauenspersonen nicht durch die Wiederherstellung eines anderen Cloud-Tresors ueberschrieben werden.

## Wiederherstellbare Metadaten bereits vor dem Cloud-Upload pruefen

Die manuelle Cloud-Sicherung prueft die lokale Konfiguration jetzt **vor** der Verschluesselung und dem Upload auf dieselben grundlegenden Pflichtfelder, Kontaktlisten, Zeitstempel und Intervallgrenzen wie die Wiederherstellung. Ungueltige oder fehlende Angaben verhindern den Upload; ein bestehender Cloud-Snapshot wird dabei nicht ersetzt. Dies reduziert das Risiko, eine Sicherung zu erzeugen, deren Kontakte und Check-in-Einstellungen spaeter nicht wiederhergestellt werden koennen.

## Stabile lesende Cloud-Wiederherstellungsprobe

Die Wiederherstellungsvorschau vergleicht den aktiven lokalen Schluessel mit dem im lokalen Tresor gespeicherten Schluessel. Ausserdem haelt sie den lokalen Ausgangssnapshot und die Speicherversion fest und kontrolliert diese nach der asynchronen Entschluesselung erneut. Bei zwischenzeitlichen Aenderungen wird kein Erfolgsergebnis angezeigt. Es werden weder lokale Daten noch Cloud-Daten geschrieben.

## Stabiler lesender Supabase-Sicherungsstatus

Die Statuspruefung kontrolliert vor der Entschluesselung der Cloud-Konfiguration, dass der aktive lokale Schluessel dem im lokalen Tresor hinterlegten Schluessel entspricht. Nach dem asynchronen Entschluesseln wird der lokale Snapshot erneut auf zwischenzeitliche Aenderungen geprueft. Bei Abweichungen gibt die Pruefung keinen vermeintlich aktuellen Gleichstandsbericht aus. Die Aktion bleibt ausschliesslich lesend.

## Schutz vorhandener Passwort-Wiederherstellungsschluessel

Ist in einer bestehenden Supabase-Sicherung bereits ein passwortgeschuetzter Wiederherstellungsschluessel hinterlegt, prueft ein erneutes manuelles Backup zuerst, ob der bisherige verschluesselte Cloud-Tresor mit dem aktuellen lokalen Masterkey entschluesselt werden kann. Wenn dies nicht gelingt, wird der Upload verweigert. Damit kann ein Backup mit gleicher Tresor-ID, aber anderem Schluessel nicht unbemerkt die bestehende Passwort-Wiederherstellung unbrauchbar machen. Der Abgleich ist keine automatische Schluesselrotation.

## Temporaere Schluesselbytes beim Passwortschutz

Bei der Passwortverschluesselung des zufaelligen Tresorschluessels wird die temporaere `Uint8Array`-Kopie des unverschluesselten Schluessels jetzt in einem `finally`-Block mit Nullen ueberschrieben. Dies reduziert die Lebensdauer einer zusaetzlichen Schluesselkopie im Arbeitsspeicher. Der bereits lokal gespeicherte Schluessel und Browser-interne Kryptografie-Puffer bleiben von dieser Massnahme unberuehrt.

## Fruehe Validierung der wiederhergestellten Kontakte

Entschluesselte Cloud-Konfigurationen werden nun **vor** der abschliessenden Wiederherstellungsbestaetigung auf Pflichtfelder, Intervall und Zeitstempel sowie auf gueltige Kontaktobjekte geprueft. Die Namen der Kontaktobjekte muessen Strings mit begrenzter Laenge sein. Bei fehlerhaften Angaben wird der Vorgang abgebrochen, bevor der lokale Tresor geschrieben wird.

## Zusätzliche Konsistenz- und Formatkontrollen

Vor der manuellen Supabase-Sicherung muss der aktive lokale AES-Schluessel exakt dem im gespeicherten Tresor hinterlegten Schluessel entsprechen. Bei der Cloud-Wiederherstellung werden entschluesselte Metadaten vor dem lokalen Schreiben auf Pflichtfelder, plausibles Check-in-Intervall, parsebaren Zeitstempel und Obergrenzen der Kontaktlisten geprueft. Ungueltige Konfiguration fuehrt zum Abbruch ohne Ueberschreiben lokaler Daten.

## Wiederherstellung nur in einen unbenutzten lokalen Tresor

Ein lokaler Tresor mit null Eintraegen kann bereits echte Kontakte oder geaenderte Check-in-Einstellungen enthalten. Deshalb prueft die Cloud-Wiederherstellung nun auch, ob Name, E-Mail, Intervall, Alarmkontakte und Vertrauenspersonen noch den neutralen Initialwerten entsprechen. Bei angepasster Konfiguration wird der Vorgang ohne Datenueberschreibung abgebrochen. Fuer den Geraetewechsel einen frisch initialisierten Tresor verwenden und die verschluesselte lokale Sicherungsdatei getrennt aufbewahren.

## Erweiterte lesende Cloud-Wiederherstellungsprobe

Die Aktion `Cloud-Wiederherstellung sicher pruefen` entschluesselt jetzt nicht nur die Tresoreintraege mit dem aktuellen lokalen Schluessel, sondern (sofern vorhanden) auch die separat AES-GCM-verschluesselte Konfiguration. Eine fehlgeschlagene Entschluesselung oder ungueltige Kontaktlisten wird angezeigt. Bei erfolgreicher Pruefung werden die Anzahl der Eintraege, Vertrauenspersonen und Alarmkontakte gemeldet. Diese Probe veraendert keine lokalen Daten und ist **kein** vollstaendiger Geraetewechseltest.

## Erweitertes Cloud-Sicherungsstatusfenster

Die Aktion `Supabase-Sicherungsstand pruefen` vergleicht nun neben Tresor-ID, IV und Ciphertext auch die **entschluesselte Cloud-Konfiguration** mit der aktuellen lokalen Konfiguration. Sie meldet Abweichungen bei Eigentuemerdaten, Vertrauenspersonen, Alarmkontakten und Check-in-Einstellungen sowie das Vorhandensein einer verschluesselten Wiederherstellungsschluesselhuelle. Die Pruefung ist lesend und ersetzt weder eine echte Wiederherstellung noch eine Ende-zu-Ende-Probe auf einem zweiten Geraet.

## Verschluesselte Konfigurationssicherung (2026-11-08)

Die Supabase-Tabelle `vault_cloud_snapshots` besitzt jetzt ein optionales Feld `encrypted_config`. Bei **neuen manuellen Cloud-Sicherungen** werden Eigentuemername und -E-Mail, Vertrauenspersonen, Alarmkontakte, Check-in-Intervall und letzter Check-in **im Browser mit dem bestehenden Tresorschluessel AES-GCM-verschluesselt** und separat vom Eintragsinhalt hochgeladen. Diese Metadaten werden nicht im Klartext an Supabase uebertragen. Nach einer Wiederherstellung mit dem separaten Passwort werden diese Einstellungen nur dann uebernommen, wenn der Konfigurationsdatensatz erfolgreich entschluesselt und seine Struktur geprueft wurde. Bei aelteren Sicherungen ohne `encrypted_config` bleiben neutrale Standardwerte und der Hinweis zur Neueinrichtung erhalten. Alarm- und Check-in-Konfiguration nach dem Geraetewechsel immer kontrollieren; die alte Firebase-Anbindung bleibt getrennt.

## Schutz vor falschen Kontakten nach Wiederherstellung

Bei einer Cloud-Wiederherstellung wird **nicht** mehr die Konfiguration des zufaellig lokal erzeugten leeren Tresors in den wiederhergestellten Tresor uebernommen. Die nicht in Supabase gesicherten Metadaten (Eigentuemername und -E-Mail, Vertrauenspersonen, Alarmkontakte, Check-in-Einstellungen) werden auf neutrale Standardwerte gesetzt. Die Benutzeroberflaeche weist auf die notwendige Neueinrichtung hin. Das verhindert die versehentliche Zuordnung falscher Alarmkontakte zu einem wiederhergestellten Tresor. Fuer eine vollstaendige geraeteuebergreifende Wiederherstellung fehlt weiterhin eine eigens verschluesselte Metadaten-Sicherung.

## Optionale passwortgeschuetzte Cloud-Wiederherstellung (2026-11-08)

Die produktive Tabelle `vault_cloud_snapshots` besitzt nun ein optionales `recovery_key`-Feld. Die Aktion `Cloud-Wiederherstellung mit Passwort vorbereiten` verschluesselt den zufaelligen 256-Bit-Tresorschluessel im Browser mit AES-256-GCM und einem separaten Wiederherstellungspasswort (PBKDF2-SHA256, 600.000 Iterationen, zufaelliges Salt). Hochgeladen wird nur die verschluesselte Schluesselhuelle. Das Passwort und der unverschluesselte Schluessel werden nicht uebertragen. Das Passwort muss stark und separat aufbewahrt werden.

`Tresor aus Supabase wiederherstellen` ist ausschliesslich fuer einen **leeren lokalen Tresor** vorgesehen, liest nur den Datensatz des angemeldeten Kontos, entschluesselt den Schluessel mit dem Passwort und prueft den verschluesselten Inhalt, bevor der lokale Datensatz ersetzt wird. Vorhandene Eintraege werden nicht automatisch ueberschrieben. Die Wiederherstellung betrifft derzeit den verschluesselten Eintragsinhalt; lokal verwaltete Konfigurationsmetadaten (z. B. Personen, Alarm- und Check-in-Einstellungen) sind nicht Bestandteil der Cloud-Kopie und muessen kontrolliert bzw. neu eingerichtet werden. Die Funktion wurde noch nicht mit realen produktiven Benutzerkonten Ende-zu-Ende geprueft; lokale verschluesselte Backups bleiben zwingend empfohlen.

## Lesende Wiederherstellungsprobe

Die Aktion `Cloud-Wiederherstellung sicher pruefen` liest den verschluesselten Datensatz des angemeldeten Kontos und versucht die Entschluesselung mit dem **bereits lokal vorhandenen** Tresorschluessel. Sie kontrolliert die Tresor-ID und die Struktur der Eintragsliste und zeigt nur deren Anzahl an. Sie veraendert keine lokalen Daten und ist keine vollstaendige Migration. Auf einem neuen Geraet ohne lokalen Schluessel kann diese Probe die Daten nicht wiederherstellen. Fuer echte geraeteuebergreifende Wiederherstellung ist ein separat geschuetztes Schluessel-Wiederherstellungskonzept erforderlich, bevor Cloud-Backups als alleinige Datensicherung empfohlen werden.

## Cloud-Sicherungspruefung (2026-11-08)

Die Nachlass-Seite bietet zusaetzlich die Aktion `Supabase-Sicherungsstand pruefen`. Sie liest ausschliesslich den dem angemeldeten Konto zugeordneten Datensatz und vergleicht Tresor-ID, IV und Ciphertext mit dem lokal gespeicherten Stand. Die Pruefung schreibt keine Daten und importiert keine Tresore. Unterschiedliche IV/Ciphertext-Werte beweisen nicht, dass die Klartextinhalte unterschiedlich sind; die Anzeige vergleicht lediglich den exakt gespeicherten verschluesselten Stand. Eine Wiederherstellungsprobe ist damit **nicht** ersetzt.

## Neuer Supabase-Sicherungspfad (2026-11-08)

Produktiv ist die zusaetzliche Tabelle `public.vault_cloud_snapshots` mit RLS und vier eigentuemergebundenen Policies angelegt. Sie speichert nur `owner_user_id`, `vault_id`, `encrypted_data` und `updated_at`. Ein neuer manueller Knopf in der Nachlass-Seite erlaubt eine ausdruecklich bestaetigte, verschluesselte Kopie des lokalen Tresors in das aktuell angemeldete Supabase-Konto. Ein vorhandener, anders benannter Tresor im Konto wird nicht ueberschrieben.

**Grenze:** Dies ist noch keine vollstaendige Cloud-Wiederherstellung oder Migration des alten Firebase-Tresors. Der lokale `masterKeyHex` wird absichtlich nicht hochgeladen. Ohne lokal aufbewahrten Schluessel bzw. verschluesselte lokale Sicherungsdatei ist der Cloud-Datensatz allein nicht entschluesselbar. Die bisherige Firebase-Synchronisierung und Alarmfunktionen sind davon getrennt. Bestehende Firestore-Regeln bleiben gesperrt. Die neue Supabase-Kopie muss vor einer allgemeinen Cloud-Freigabe mit echten Benutzerkonten kontrolliert und ein sicherer Wiederherstellungsweg implementiert werden.

## Voraussetzungen

1. Firestore-Datenbank durch den Projektadministrator gesichert; Wiederherstellbarkeit geprueft.
2. Supabase-Migration `20261107000100_vault_ownership.sql` in einer Testumgebung ausgefuehrt und RLS/Rechte geprueft.
3. Edge Function `vault-api` in einer Testumgebung bereitgestellt; Authentifizierung, Fehlerpfade und Service-Role-Secrets geprueft.
4. Firestore-Zugriff ausschliesslich durch vertrauenswuerdigen Server mit minimalen IAM-Rechten. Niemals Service-Account-Schluessel in GitHub oder im Browser hinterlegen.
5. Audit-Log und Wiederherstellungsplan vorhanden.

## Migration pro bestehendem Tresor

1. Eigentuemerkonto ueber Supabase Auth identifizieren (auth.users.id).
2. Bestehenden Firestore-Tresor durch einen autorisierten Administrator serverseitig auffinden. Keine allgemeine Client-Leseerlaubnis aktivieren.
3. Eigentuemernachweis **unabhaengig** von frei eingebbaren Metadaten und bekannten Erben-Links pruefen. Besitz von vaultId, E-Mail-Adresse oder bereits ausgegebenem #key allein ist **kein** ausreichender Nachweis. Bei Zweifeln manuell klaeren und Zuordnung verweigern.
4. Nach dokumentierter Pruefung die Zuordnung `vault_id -> owner_user_id` mit `verification_method='admin_verified_migration'` durch eine privilegierte, auditierte Serveroperation anlegen. Keine direkte Client-INSERT-Policy.
5. Bestehende Zuordnungen nie stillschweigend ueberschreiben. Konflikte separat untersuchen.
6. Mit Testkonten pruefen: Eigentuemerkonto erkannt; fremdes Konto erhaelt 404; fehlende Anmeldung 401; Fehler 503; **kein** Tresorinhalt wird ausgegeben.
7. Erst nach separater Implementierung und Abnahme der serverseitigen Tresor-API Cloud-Funktionen schrittweise wieder aktivieren.

## Neue Tresore

Neue Tresore duerfen ausschliesslich durch eine authentifizierte Serveroperation erzeugt und im selben kontrollierten Ablauf dem authentifizierten Benutzer zugeordnet werden (`server_verified_creation`). Eine vom Client frei vorgegebene Tresor-ID darf keine fremden Datensaetze uebernehmen.

## Datenschutz der bisherigen Firebase-Synchronisierung

Der aktuelle Browser-Client schreibt bei einer bestaetigten Synchronisierung neben `encryptedData` auch `vaultId`, `ownerName`, `ownerEmail`, `lastCheckIn`, `checkInIntervalDays`, `alarmPersons` und einen serverseitigen Zeitstempel in Firestore. Diese Metadaten sind **nicht** durch die Verschluesselung von `encryptedData` geschuetzt. Die produktiven Firestore-Regeln verweigern derzeit Client-Zugriffe; deshalb ist eine erfolgreiche Synchronisierung nicht vorauszusetzen.

Vor einer neuen Cloud-API: Datenminimierung und Zweckbindung fuer Metadaten festlegen; personenbezogene Alarmkontakte nur bei ausdruecklich erforderlichem Zweck verarbeiten; serverseitige Autorisierung, Loeschung und Aufbewahrungsfristen definieren. Bestehende Firestore-Datensaetze nicht ohne Eigentuemernachweis uebernehmen oder loeschen.

## Offene Sicherheitsanforderungen

- Check-in-Zeitpunkt und Notfallstatus muessen serverseitig gegen Manipulation geschuetzt werden.
- Die Erbenfreigabe muss **vor** Ausgabe von Schluessel oder entschluesselbaren Daten serverseitig durchgesetzt werden.
- Bereits verteilte Links mit Schluesseln koennen nicht rueckwirkend geheim gemacht werden; ein neues Schluessel-/Freigabekonzept ist erforderlich.
- Supabase-Edge-Function-Deployment, CORS, Secrets, Ratenbegrenzung, Monitoring, Tests und Datenschutz sind noch offen.
- Bestehende Firestore-Daten koennen wegen der frueheren offenen Regeln manipuliert worden sein; Plausibilitaet und Integritaet vor Migration pruefen.

## Produktiv-Freigabekriterien

Die bestehende Nachlass-Seite darf nur als **lokaler Tresor mit nicht garantierter Cloud-Sicherung** beschrieben werden, solange die Firebase-Schreibregeln gesperrt sind und keine abgenommene serverseitige API existiert. Ein erfolgreicher lokaler Speichervorgang ist kein Beleg fuer Cloud-Speicherung.

Eine spaetere Cloud-Freigabe erfordert nachweisbar: authentifizierte und unabhaengig verifizierte Eigentuemerschaft, strikte Mandantentrennung, keine Uebernahme fremder Tresore, datensparsame Metadaten, Wiederherstellungsproben mit kontrollierten Testkonten ausserhalb der Produktivdaten, dokumentierten Rollback und Sicherheitsabnahme. Ohne diese Nachweise **keine Migration, keine neuen Cloud-Schreibrechte und keine automatische Zuordnung bestehender Tresore**.

## Verbotene Abkuerzungen

- Niemals `allow read, write: if true` reaktivieren.
- Niemals Eigentuemerdaten anhand `ownerEmail`, `vaultId` oder Erben-Link automatisch zuweisen.
- Niemals Service-Role- oder Firebase-Admin-Schluessel in statische GitHub-Pages-Dateien schreiben.
- Niemals den aktuellen Client-Check-in als Sicherheitsnachweis akzeptieren.
