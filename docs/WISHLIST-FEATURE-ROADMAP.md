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

## Herkunft und Geltung

Grundlage ist die vom Nutzer am 10.11.2026 hochgeladene vollständige Ideensammlung („Eingefügter Text.txt“, ca. 694 Zeilen) mit der großen Vision, der kostenlosen Feature-Liste, drei Kostenphasen und dem Entwicklungsauftrag. Die vorliegende Datei ist eine strukturierte **vollständige Feature-Referenz**, keine wortwörtliche Transkription der damaligen Unterhaltung. Bei Widersprüchen gelten die **neueren ausdrücklichen Nutzeranweisungen**, insbesondere die Freigabe für eigenständige Veröffentlichungen.

**Für neue Chats:** Lies zuerst diese Roadmap und prüfe dann den tatsächlichen Stand in `amazon-wishlist/`, bevor du Features als umgesetzt bezeichnest. Arbeite möglichst direkt an einem gebündelten Paket, statt die Vision erneut grundsätzlich zu diskutieren.
