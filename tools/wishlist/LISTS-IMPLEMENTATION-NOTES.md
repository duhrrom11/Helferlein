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

## Nächste Entwicklungsrunde
- Listenauswahl im Wunsch-Editor: beim Anlegen eines Wunsches optional sofortige Zuordnung; Fehler der Zuordnung wird separat angezeigt, der gespeicherte Wunsch bleibt erhalten.
- Dashboard-Zähler und responsive Karten-Optik; ausgewählte Liste visuell markiert.
- `DEFAULT-LIST-BACKFILL-PROPOSAL.sql`: ausschließlich vorbereitete, nicht ausgeführte Übernahme vorhandener Wünsche in `Meine Wünsche`.
- Die Standardliste wird erst nach ausdrücklicher Freigabe des Schemas und der Übernahme tatsächlich erstellt; für neue Konten gibt es noch keine automatische Anlage.
- Bestehende öffentliche Wünsche bleiben weiterhin öffentlich, auch wenn ihre Sammlung privat heißt.
- Keine Live-DB-Änderung, kein Merge, kein Deployment. Browser- und CI-Prüfungen nicht bestätigt.

## Listen-Editor und Dashboard-Schnellaktionen
- Bearbeitungsformular für Titel, Beschreibung, Symbol und Farbe mit Speichern/Abbrechen.
- Farbig gestaltete Karten, ausgewählte Karte hervorgehoben, kompakte Kartenaktionen.
- Schnellaktionen für neue Liste, Wunsch hinzufügen und ausgewählte Liste öffnen.
- Zurücksetzen des Editors und der Dashboard-Zähler bei Kontowechsel.
- JavaScript-Syntax des Listen-Dashboard-Moduls geprüft; keine Browser- oder Live-Datenbankprüfung durchgeführt.
- SQL-Entwürfe unverändert und nicht ausgeführt; kein Merge, kein Deployment.

## Vorlagen, Wunschkarten und Schnellfilter
- Sieben kostenlose Vorlagen mit Namen, Beschreibung, Symbol und Farbe.
- Kartenansicht der Wünsche je Liste mit Priorität und Notiz, Zuordnung direkt per Checkbox.
- Suche, Prioritätsfilter, Zuordnungsfilter und Sortierung ohne neue Datenbanktabellen.
- Listen- und Vorlagenfunktionen setzen die bisher nur vorbereiteten SQL-Tabellen voraus.
- Syntaxprüfung der beiden betroffenen JavaScript-Module erfolgreich; kein Browser-Test.
- Keine Produktivdatenbankänderungen, kein Merge und kein Deployment.

## Persönliche Wunschwelt und Favoriten
- Neue Dashboard-Startseite mit Schnellaktionen und Lieblingslisten.
- Favoriten werden ausschließlich im Browser gespeichert (localStorage), pro Benutzer-ID getrennt; keine geräteübergreifende Synchronisierung.
- Listenübersicht mit Suche, Ansichten für aktive, archivierte und favorisierte Listen sowie Sortierung.
- Kontowechsel lässt Filterelemente im DOM bestehen; Favoriten werden bei Wechsel neu eingelesen.
- Kurze Syntax- und HTML-ID-Prüfung erfolgreich; keine Browser- oder Produktivdatenbanktests.
- Kein Merge, kein Deployment und keine Änderung an der produktiven Supabase-Datenbank.

## Persönliche Zentrale, Fortschritt und Mobilansicht
- Übersicht: geladene Wünsche, Listen, Lieblingslisten und Zahl der Wünsche mit mindestens einer Listenzuordnung.
- Fortschrittsbalken zeigt den Anteil zugeordneter Wünsche unter den maximal 200 geladenen Wünschen; kein Kauf-, Erfüllungs- oder Geschenkfortschritt.
- Listenkarten zeigen die Zahl ihrer Zuordnungen und den Anteil relativ zu den geladenen Wünschen; bei mehr als 200 Wünschen sind Kennzahlen nicht vollständig.
- Zuletzt geöffnete Listen werden kontogetrennt im lokalen Browser gespeichert (maximal fünf), ohne Server-Synchronisierung.
- Mobile Schnellaktionsleiste und responsive Statistiken/Karten; keine Produktivdatenbankänderungen.
- Kurze JavaScript-Syntax- und DOM-ID-Prüfung erfolgreich; keine vollständigen Browser- oder CI-Tests.

## Persönliche Kategorien und Wunschdetails
- Kategorien Technik, Gaming, Bücher, Wohnen, Mode, Reisen und Sonstiges, pro Benutzerkonto im lokalen Browser gespeichert; keine Synchronisierung zwischen Geräten.
- Kategorie-Schnellfilter inklusive ohne Kategorie, zusätzlich Sortierung nach ältesten Wünschen sowie Titel A–Z/Z–A.
- Detaildialog zeigt Titel, Priorität, Notiz und Hinzufügedatum; Kategorien lassen sich dort lokal setzen oder entfernen.
- Kein zusätzliches Supabase-Schema, keine Änderung der produktiven Datenbank. Wunschtexte bleiben öffentlich; Kategorien sind lokale Metadaten.
- Kurze Syntax- und DOM-ID-Prüfung erfolgreich, kein vollständiger Browser-Test. Kein Merge und kein Deployment.

## Wunschmarkierungen und mobile Detailansicht
- Pro Wunsch genau eine lokale Markierung: Favorit oder für später; erneutes Antippen entfernt die Markierung. Speicherung pro Benutzerkonto in localStorage, keine Synchronisierung.
- Markierungsfilter (alle, Favoriten, später, ohne), Schnellaktionen auf Karten und Filter-zurücksetzen.
- Detaildialog auf kleinen Bildschirmen als unteres Panel mit größeren Touch-Zielen und Rücksicht auf Safe-Area.
- Kein neues Schema und keine Änderung der produktiven Supabase-Datenbank; keine Änderungen an öffentlichen Wunschdaten.
- Kurze Syntax- und DOM-ID-Prüfungen erfolgreich, kein vollständiger Browser-Test, kein Merge und kein Deployment.

## Sammelauswahl und Mehrfachzuordnung
- Mehrfachauswahl einzelner Wünsche und aller sichtbaren Wünsche; Auswahl bleibt beim Filtern erhalten, kann explizit geleert werden.
- Bestätigte Mehrfachaktionen fügen Zuordnungen zu der aktuell gewählten Liste hinzu oder entfernen sie, ohne Wünsche zu löschen. Eigentümer- und Listenprüfung vor jedem Eintrag, Fehlerzählung und Rest-Auswahl bei Fehlschlägen.
- Übersicht und Filter für Wünsche, die keiner Liste zugeordnet sind. Der Zähler bezieht sich auf maximal 200 geladene Wünsche; keine Vollständigkeitsgarantie für größere Sammlungen.
- Das Listen-Schema bleibt ein nicht angewendeter Vorschlag. Keine Produktivdatenbankänderungen, kein Merge, kein Deployment.
- Kurze JavaScript-Syntax- und DOM-ID-Prüfung erfolgreich; keine vollständigen Browser- oder Integrationstests.

## Große Wunschsammlungen und Sammelaktionen
- Wunschdaten und Zuordnungen werden mit Supabase `.range()` in 1000er Seiten geladen statt der bisherigen 200er Begrenzung.
- Wunschkarten werden in 100er Schritten dargestellt; die Auswahl aller sichtbaren Filtertreffer umfasst auch noch nicht gerenderte Karten.
- Kategorieauswahl wählt passende Filtertreffer; vor Mehrfachaktionen zeigt ein Dialog Zielliste, Anzahl und bis zu fünf betroffene Wünsche.
- Die Bestätigung führt ausschließlich Änderungen an Listenzuordnungen aus; pro Eintrag werden Konto und gewählte Liste geprüft. Auswahl wird beim Kontowechsel zurückgesetzt.
- Kein vollständiger Browser-/Integrationstest, nur Syntax- und DOM-ID-Prüfung. Keine Produktivdatenbankänderungen, kein Merge, kein Deployment.

## Fortschritt und Sicherheit bei großen Sammelaktionen
- Fortschrittsbalken zeigt verarbeitete Zuordnungen und Erfolg-/Fehleranzahl; Stoppsignal beendet die Schleife nach der laufenden Netzwerkanfrage.
- Fehlgeschlagene und nicht bearbeitete Wünsche bleiben ausgewählt. Bereits erfolgreiche Änderungen werden nicht rückgängig gemacht; Stopp ist keine Transaktion.
- Auswahlaktionen werden während des Vorgangs gesperrt; Konto- und Listenwechsel brechen weitere Verarbeitung ab. Kontoreset invalidiert den Lauf.
- Wunsch-Pagination nutzt zusätzlich zur Zeitstempelsortierung eine ID-Sortierung für deterministische Reihenfolge.
- Nur kurze Syntax- und DOM-ID-Prüfungen, keine vollständigen Browser-/Integrationstests; kein Merge, Deployment oder produktive Supabase-Schemaänderung.

## Gezielt fehlgeschlagene Sammelaktionen wiederholen
- Ergebnisübersicht unterscheidet geplante, erfolgreiche, fehlgeschlagene und wegen Unterbrechung nicht bearbeitete Zuordnungen.
- Wiederholung verwendet ausschließlich IDs fehlgeschlagener Wünsche, prüft den aktuellen Zuordnungszustand und verlangt erneut eine Bestätigung. Nicht bearbeitete Wünsche können separat ausgewählt werden.
- Ergebnisse werden beim Listen-/Kontowechsel invalidiert; asynchrone Ergebnisse prüfen Run-ID und Benutzerkonto, um veraltete UI-Aktualisierungen zu verhindern.
- Bereits erfolgreiche Datenbankänderungen werden nicht rückgängig gemacht. Keine automatischen Wiederholungen oder zusätzlichen Produktivdatenbankänderungen.
- JavaScript-Syntax und DOM-IDs kurz geprüft; vollständige Browser-/Integrationstests stehen aus. Kein Merge und kein Deployment.

## Aktionshistorie und Wiederaufnahme (Feature-Branch)
- Maximal zehn Sammelaktionen im Arbeitsspeicher der laufenden Sitzung, ohne Datenbank- oder Browserpersistenz; Kontoreset löscht den Verlauf.
- Ergebnis zeigt erfolgreiche, fehlgeschlagene und nicht bearbeitete Änderungen; verständliche Kategorien für Berechtigungs-, Duplikat-, Rate-Limit- und Netzwerkfehler.
- Fehlgeschlagene und offene Aktionen können aus der Ergebnisübersicht bzw. Historie erneut zur Bestätigung vorbereitet werden. Der aktuelle Zuordnungszustand wird berücksichtigt; nach Listenwechsel ist zunächst ein erneuter Aufruf nach dem Laden erforderlich.
- Bereits erfolgreich ausgeführte Zuordnungen bleiben bestehen. Es gibt kein automatisches Retry, keinen Rollback und keine Transaktion über alle Wünsche.
- Nur kurze JavaScript-Syntax- und HTML-ID-Prüfung, kein vollständiger Browser-/Integrationstest. Keine Produktivdatenbankänderung, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Performance, Mobilbedienung und Ladefehler
- Die beim vollständigen Laden paginierten `wishlist_list_items` werden zusätzlich pro Liste in `membershipByList` zwischengespeichert. `showItems()` verwendet diese Zuordnungen, statt bei jedem `render()` eine neue Abfrage auszuführen.
- Während des Ladens sind Sammelaktionen gesperrt; unvollständige Mitgliedschaftsdaten werden nicht für Mehrfachänderungen verwendet.
- Zugängliche Statusanzeige für Laden/Fehler mit erneutem Ladeversuch; Fehler beim Laden weiterer Wünsche oder Zuordnungen werden nicht als vollständiger Erfolg angezeigt.
- Auf Mobilgeräten bleibt die Sammelwerkzeugleiste am unteren Bildschirmrand erreichbar; Touch-Flächen sind vergrößert.
- Nur Syntax- und DOM-ID-Kurzprüfung. Noch kein vollständiger Browser-/Integrationstest; kein Merge, Deployment oder Änderung der produktiven Supabase-Datenbank.

## Automatisierte Regressionstests und Performance
- Neue rein funktionale Hilfen in `bulk-helpers.mjs`: deduplizierte Zielauswahl, Ergebniszusammenfassung, Kontokontextprüfung, Fehlerklassifikation und paginiertes Laden mit Generation-Guard.
- `bulk-helpers.test.mjs` verwendet `node:test` ohne externe Pakete. Lokal ausführbar mit `node --test amazon-wishlist/bulk-helpers.test.mjs`.
- Tests prüfen Filter und Sortierung, Sammelaktionen und Unterbrechungen, Berechtigungen/Kontowechsel, Fehlermeldungen, mehrseitiges Laden, Netzwerkfehler und veraltete Antworten.
- Mitgliedschafts-Pagination hat eine deterministische Sortierung nach Listen- und Wunsch-ID. Ergebnisbildung bei Sammelaktionen verwendet `Set` statt wiederholter linearer `includes`-Suche.
- In dieser Entwicklungsrunde wurden 15 direkte Kurzprüfungen über die extrahierten Funktionen, JavaScript-Syntax und HTML-IDs erfolgreich ausgeführt. Der vollständige `node --test`-Lauf sowie echte Browser- und Supabase-Integrationstests wurden nicht ausgeführt.
- Keine produktive Datenbankänderung, kein Merge, kein Deployment und keine kostenpflichtigen Dienste.

## Simulierte Workflows und parallele Abläufe
- `bulk-workflows.test.mjs` enthält simulierte In-Memory-Datenbankabläufe für mehrseitiges Laden, Filtern, Zuordnen, gezieltes Retry, Stoppen/Fortsetzen, Kontowechsel während eines Writes und konkurrierende Ladeantworten.
- `executeBulkJob` in `bulk-helpers.mjs` ist die gemeinsame, injizierbare Ausführungslogik von Dashboard und Tests; kein automatisches Retry. Nach jeder Netzwerkanfrage wird der aktuelle Benutzer-/Laufkontext geprüft, bevor UI-Fortschritt fortgeschrieben wird.
- Ein bereits beim Server angekommenes Schreiben kann durch einen Kontowechsel nicht rückgängig gemacht werden. Das Ergebnis wird dann bewusst nicht im anderen Konto angezeigt; bei Bedarf ist ein erneutes Laden erforderlich.
- Testbefehle (ohne externe Pakete): `node --test amazon-wishlist/bulk-helpers.test.mjs amazon-wishlist/bulk-workflows.test.mjs`.
- Sieben zusätzliche Szenario-Kurzprüfungen (inkl. Syntax und DOM-ID-Abgleich) erfolgreich. Vollständiger Node-Testlauf und Browser-/Supabase-Integrationstests nicht ausgeführt.
- Ausschließlich Feature-Branch-Code, keine produktiven Supabase-Datenbankänderungen, kein Merge, Deployment oder kostenpflichtige Dienste.
