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

## Herkunft und Geltung

Grundlage ist die vom Nutzer am 10.11.2026 hochgeladene vollständige Ideensammlung („Eingefügter Text.txt“, ca. 694 Zeilen) mit der großen Vision, der kostenlosen Feature-Liste, drei Kostenphasen und dem Entwicklungsauftrag. Die vorliegende Datei ist eine strukturierte **vollständige Feature-Referenz**, keine wortwörtliche Transkription der damaligen Unterhaltung. Bei Widersprüchen gelten die **neueren ausdrücklichen Nutzeranweisungen**, insbesondere die Freigabe für eigenständige Veröffentlichungen.

**Für neue Chats:** Lies zuerst diese Roadmap und prüfe dann den tatsächlichen Stand in `amazon-wishlist/`, bevor du Features als umgesetzt bezeichnest. Arbeite möglichst direkt an einem gebündelten Paket, statt die Vision erneut grundsätzlich zu diskutieren.
