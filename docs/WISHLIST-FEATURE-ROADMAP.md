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
