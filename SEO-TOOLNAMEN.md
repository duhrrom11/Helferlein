# SEO-Toolnamen und URL-Migration

Stand: 8. November 2026. Zielmarkt: Deutschland, Suchsprache Deutsch.

Die Keyword-Auswahl basiert auf Tool-Funktionen, Suchintention und einer Sichtung öffentlicher Suchergebnisse. Die Ahrefs-Keyword-Explorer-API lieferte trotz Verbindung `Insufficient plan`; deshalb wurden **keine** Suchvolumina, Keyword-Difficulty-Werte oder Rankings als gemessen ausgegeben. Die Bezeichnungen sind fachlich begründete Keyword-Kandidaten, keine datenbasiert gerankte Topliste.

| Bisheriger Toolpfad | Neuer Toolpfad | Keyword-Schwerpunkt |
|---|---|---|
| `tools/kassenbon/index.html` | `tools/haushaltsbuch-kassenbon/index.html` | Haushaltsbuch, Kassenbon-Scanner |
| `tools/kisten/index.html` | `tools/umzugskisten-inventar/index.html` | Umzugskisten-App, Inventarliste |
| `tools/wg-kasse/index.html` | `tools/wg-organisator/index.html` | WG-Organisator, WG-Haushaltsbuch |
| `tools/notizen/index.html` | `tools/digitaler-nachlass/index.html` | digitaler Nachlass, Nachlassverwalter |
| `tools/kfz/index.html` | `tools/autokosten-reifenwechsel/index.html` | Autokosten-Rechner, Reifenwechsel |
| `tools/haustier/index.html` | `tools/haustier-gesundheitspass/index.html` | digitaler Impfpass für Haustiere, Gesundheitspass |
| `tools/parken/index.html` | `tools/parkplatz-merker-parkschein-timer/index.html` | Parkplatz merken, Parkschein-Timer |
| `tools/verleih/index.html` | `tools/verliehene-gegenstaende-verwalten/index.html` | verliehene Gegenstände verwalten |
| `tools/pflanzen/index.html` | `tools/pflanzenpflege-giessplan/index.html` | Pflanzenpflege-App, Gießplan |
| `tools/energie/index.html` | `tools/zaehlerstaende-erfassen/index.html` | Zählerstände erfassen, Strom/Gas/Wasser |
| `tools/küche/küchenmathe.html` | `tools/backform-umrechner/index.html` | Backform-Umrechner, Rezeptrechner |

## Migrationsregeln

- Die ursprünglichen URLs bleiben als kleine HTML-Weiterleitungsseiten bestehen, weil GitHub Pages keine frei konfigurierbaren HTTP-301-Weiterleitungen für einzelne Seiten anbietet. Die Weiterleitungen nutzen `meta refresh` und `location.replace` mit Übernahme von Query-String und Hash.
- Tool-IDs (`data-id`), Favoriten-Schlüssel, lokale Speicher-/Supabase-Schlüssel und sonstige persistente Identifikatoren bleiben unverändert.
- Das Erben-Portal wurde zusätzlich nach `tools/digitaler-nachlass/erben.html` übertragen; die bisherige URL leitet weiter. Die Sicherheitswarnung des Nachlass-Tools bleibt sichtbar.
- Die Startseite verlinkt auf die elf neuen kanonischen URLs. Jede neue Toolseite hat einen SEO-Titel, eine Kurzbeschreibung und ein Canonical-Element. `sitemap.xml` führt die neuen Seiten auf.

## Validierung

- Alle elf neuen Toolseiten wurden auf dem Branch per GitHub-Dateizugriff verifiziert.
- Die elf Startseiten-Kacheln verlinken jeweils genau einmal auf die neuen Ziele.
- Die zwölf alten HTML-Seiten (elf Tools plus Erben-Portal) haben überprüfte Ziele, und die zwölf neuen Dateien existieren.
- Eine Live-Browser-Funktionsprüfung von JavaScript, Login, Cloud-Sync und Speicherdaten sowie HTTP-Status-Prüfung nach Veröffentlichung ist zusätzlich erforderlich. Keine Testdatensätze im produktiven Backend erzeugen.

- Zehn bestehende Nachlass-/Tresor-Testdateien wurden nach der Pfadänderung auf `tools/digitaler-nachlass/index.html` umgestellt, damit Sicherheitstests weiterhin den echten Code statt der Alt-URL-Weiterleitung prüfen.
