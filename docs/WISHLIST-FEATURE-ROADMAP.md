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
