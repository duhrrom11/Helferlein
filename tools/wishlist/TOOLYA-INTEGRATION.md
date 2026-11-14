# ToolyaBuddy – Entwicklungsbranch

Branch: `feature/toolya-buddy-wishlist-v4`. **Nicht auf main mergen oder deployen.**

## Integriert
- `tools/wishlist/toolya-buddy.mjs`: maskottchenbasierte Meldungen und asynchrone Bestätigungsdialoge.
- `tools/wishlist/toolya-buddy.css`: responsive Darstellung.
- `tools/wishlist/app.mjs`: Anmeldebegrüßung nach bestätigtem Login; bestätigte Wunsch-/Profil-Speicherungen; Teil-Erfolge als Warnung; Formular- und Laufzeitfehler; zwei Cloud-Bestätigungen.
- Bestehende `#status`- und `#wishSaveFeedback`-Meldungen bleiben erhalten. Sicherheitsabfragen sind standardmäßig Abbrechen und erfordern ausdrückliche Zustimmung.
- Keine Änderungen an Supabase-Schema, RLS, Daten oder produktivem Deployment.

## Noch nicht abgeschlossen
**Die acht Original-PNGs sind im Entwicklungsbranch vorhanden** unter `tools/wishlist/toolya_wishlist_{turquoise|purple}_{welcome|success|error|tip}_1024.png`. Die Bildbasis ist `./`, relativ zu `tools/wishlist/`. Keine Ersatzfiguren verwenden.

Weitere Bestätigungen in anderen Wunschlistenmodulen und globale `window.alert`-Dialoge werden noch nicht abgefangen. Keine pauschale Änderung des synchronen `confirm()`-Verhaltens.

## Testplan (noch nicht als bestanden markieren)
1. Branch lokal ohne produktive Schreibzugriffe laden; prüfen, dass alle Module importieren und keine Konsolenfehler auftreten.
2. Beide Originalmaskottchen-Bildpfade und sämtliche Emotionen kontrollieren, sobald Assets hochgeladen sind.
3. Formularvalidierung: ursprünglicher Fokus und `aria-invalid` erhalten; Buddy zeigt vollständigen Text.
4. Erfolgreicher Wunsch-Save und Update: erst nach Serverbestätigung Erfolg anzeigen.
5. Fehlende Listenzuordnung/lokale Zusatzdaten: Warnung statt vollem Erfolg.
6. Cloud-Import/Überschreiben: Escape/Abbrechen = keine Mutation; Bestätigen = bestehender Vorgang.
7. Ruhemodus: freiwillige Meldungen aus, Warnungen/Fehler/Bestätigungen weiterhin sichtbar.
8. Auth: erst nach bestätigtem Login begrüßen; kein Zugriff auf Passwörter.
9. Mobil: 320/375px, virtuelle Tastatur, Screenreader, Fokus-Rückgabe und verschachtelte Dialoge.
10. GitHub Pages Deployment-Konfiguration prüfen, bevor irgendein Merge erwogen wird.

## Ausbau: Animationsphase und lokale Einstellungen (November 2026)

- Vier Originalposen mit kurzen CSS-Ganzkörperbewegungen; keine Körperteile separat animiert.
- Ruhemodus, Android-`prefers-reduced-motion`, Bewegungsstufen Aus/Ruhig/Normal/Lebhaft.
- Optionale Tipps separat abschaltbar; Begleiter zeitweise ausblendbar, während wichtige Warnungen sichtbar bleiben.
- Einstellungen werden unter dem bestehenden lokalen Präferenzschlüssel gespeichert; keine Datenbankmigration.
- Isolierte Smartphone-Vorschau: `toolya-mobile-preview.html`, Android-Anleitung: `TOOLYA-ANDROID-CHECK.md`.
- Automatisierte Tests prüfen Logik und CSS-Verträge. Eine echte Android-Geräteprüfung, TalkBack-Abnahme und Animationen einzelner Körperteile sind noch offen.
- Für Pfoten-/Ohren-/Augen-/Schwanzanimationen zuerst passende transparente Ebenen oder Frames **ergänzend** zu den Originalbildern konzipieren; keine Originaldatei überschreiben.
- Optionale Alltagsszenen und Comic-Chef sind keine beschlossenen Funktionen und werden nicht vorgezogen.
