# ToolyaBuddy – dauerhafte Master-Roadmap (Stand 2026-11-14)

> **KANONISCHE PROJEKTÜBERGABE FÜR ZUKÜNFTIGE CHATS.** Vor Änderungen den aktuellen GitHub-Stand lesen. Diese Roadmap ist ein Plan, keine Behauptung, dass alle Punkte umgesetzt sind.

## Repository und unverrückbare Grenzen
- Repository: `duhrrom11/Helferlein`.
- **Ausschließlich** Branch `feature/toolya-buddy-wishlist-v4` bearbeiten.
- **Kein** Merge nach `main`, kein Deployment, keine Änderungen an produktivem Supabase, keine produktiven Testdaten, kein TinyFish.
- Nutzer arbeitet mit Android, ohne Computer; Ergebnisse und Vorschauen mobil zugänglich machen.
- Eigenständig entwickeln, zielgerichtet testen, tatsächliche Resultate/Commits nennen; keine Tests als bestanden melden, wenn nicht ausgeführt.

## Produktvision
Toolya soll ein flauschiger, frecher, sympathischer, hilfreicher und zurückhaltender interaktiver Begleiter werden – kein statisches Werbebild. Er begrüßt, jubelt, gibt Tipps, warnt, begleitet echte Nutzeraktionen und respektiert Ruhemodus und Barrierefreiheit.

## VERBINDLICHE Figuren – nicht neu entwerfen
1. **Türkis-weiß:** flauschiges 3D-Fantasiewesen, große rosa Innenohren, Schutzbrille, türkisfarbenes Halstuch mit Zahnrad, Werkzeuggürtel, buschiger Ringelschwanz, zwinkernd/winkend.
2. **Lila-creme:** flauschiges 3D-Fantasiewesen, cremefarbenes Gesicht/Bauch, große rosa Innenohren, Schutzbrille, türkisfarbenes Halstuch, braune Umhängetasche, Schraubenschlüssel, buschiger lila-cremefarbener Schwanz.
Beide als auswählbare Begleiter behalten. Original-Referenzen: `8862.png`, `8863.png`. Kein Ersatz durch generierte andere Figuren. Eventuelle männliche/weibliche Personalisierung später konkretisieren.

Acht Original-PNGs liegen **direkt** unter `tools/wishlist/`, nicht unter `toolya-assets/`:
`toolya_wishlist_{turquoise|purple}_{welcome|success|tip|error}_1024.png`.
Originale niemals überschreiben.

## Technischer Stand (vor jeder Änderung erneut prüfen)
- `tools/wishlist/toolya-buddy.mjs`: Meldungen, Zustände, Priorität/Warteschlange, Charakterwahl, Ruhemodus, asynchrone Bestätigungsdialoge.
- `tools/wishlist/toolya-buddy.css`: responsive Darstellung und ggf. Animationen.
- `tools/wishlist/app.mjs`: Wunschlistenintegration, Einstellungen, Speicherung.
- `tools/wishlist/toolya-mobile-preview.html`: isolierte Android-Vorschau.
- `tools/wishlist/toolya-buddy-browser-test.html`, `toolya-buddy.test.mjs`, `wishlist-app-mock.test.mjs`, `toolya-assets.test.mjs`: Tests.
- `tools/wishlist/TOOLYA-INTEGRATION.md`: ergänzende technische Dokumentation.
- Bildbasis `./` im Wunschlistenordner.
- Keine Behauptung einer vollständigen Android-Browserabnahme ohne tatsächliche Prüfung.

## Priorisierte Roadmap
### P1: Bestehende Animationen prüfen und verbessern
1. Aktuellen Branch/Code/Tests inspizieren: welche Bewegungen und `data-motion`-Regeln existieren bereits?
2. Vier sanfte, passende Zustandsanimationen:
   - Begrüßung: freundliches Winken/Blinzeln/Ohrenbewegung (zunächst glaubhafte Ganzbildbewegung).
   - Erfolg: kleiner Freudenhüpfer/Jubel/Schwanzwedeln.
   - Tipp: Kopfneigung, neugieriges Zeigen.
   - Fehler/Warnung: vorsichtige besorgte Bewegung, Ohren senken.
3. Mit vorhandenen PNGs zunächst CSS-Transforms (Schweben, Neigen, Hüpfen, leichtes Wackeln). **Einzelne Körperteile lassen sich in einem flachen PNG nicht unabhängig natürlich bewegen.**
4. `prefers-reduced-motion`, Ruhemodus (optionale Meldungen und unnötige Animationen aus), Touchbedienung, Android-Layout, Screenreader, Tastatur und Fokus berücksichtigen.
5. Isolierte Vorschau erweitern; echte Browser-/Android-Sichtprüfung getrennt von Quellcode-/Unit-Tests berichten.

### P2: Hochwertige echte Körperteilanimation
- Zusätzliche transparente Layer oder konsistente Animationsframes für Augen, Pfoten, Ohren, Schwanz und Kopf erstellen, **unter strikter Wahrung der beiden Originaldesigns**.
- Geeignete Formate (z. B. animiertes WebP oder Frame-Sequenzen) und Performance/Dateigröße prüfen.
- Übergänge, Idle-Verhalten, Animationsende, kein unnötiges Dauerzappeln.
- Wenige hochwertige Bewegungen vor vielen künstlichen.
- Optionen: Animation aus, Intensität ruhig/normal/lebhaft, Begleiter ausblenden, freiwillige Tipps steuern.

### P3: Kontext und kleine Alltagsszenen (Ideen, noch nicht verbindlich beschlossen)
- Schlafen/Aufwachen nach Inaktivität, Verstecken und Wiederauftauchen.
- Geschenke schütteln/präsentieren, Geschenkplanung begleiten.
- Beim Kochen rühren; bei Finanzen Münzen zählen, Sparziele feiern.
- Nur an **tatsächlich vorhandene** Produktfunktionen und bestätigte Ereignisse koppeln; keine falschen Erfolgsmeldungen.
- Antippen/spielerische Reaktion optional; Häufigkeit und Nutzerkontrolle erst festlegen.

### OFFENE Idee: Comic-Chef
Humorvolle Interaktion zwischen Comic-Chef und Toolya wurde diskutiert, **ist nicht beschlossen**. Nicht ohne neue Entscheidung implementieren.

### OFFENE Gestaltung
Ein früher favorisiertes Toolya-Logo (unten links im zweiten Konzeptbild) später wieder aufnehmen; derzeit nicht Teil der Animationsentwicklung.

## Integration und Sicherheitsanforderungen
- Begrüßung erst nach bestätigtem Login; Erfolg erst nach tatsächlichem Speichern; Teil-Erfolge/Warnungen korrekt unterscheiden.
- Bestätigungsdialoge: Abbrechen als sicherer Standard, Escape und Fokus-Rückgabe, keine stille Datenmutation.
- Keine globale Ersetzung von `window.confirm` oder pauschale Änderung anderer Module.
- Responsive 320/375 px, keine Überläufe, abgeschnittenen Maskottchen oder verdeckten Eingabefelder.
- Nutzerpräferenzen lokal und robust; Ruhemodus unterdrückt freiwillige Meldungen, **nicht** wichtige Fehler/Bestätigungen.

## Nächster Arbeitsauftrag
Aktuellen GitHub-Branch prüfen, vorhandene Animationen und Tests ermitteln, P1 vervollständigen, isolierte Android-Vorschau aktualisieren, zielgerichtet testen und **nur im Feature-Branch** committen. Anschließend P2 mit echten Augen-/Ohren-/Pfoten-/Schwanzbewegungen vorbereiten. Nicht erneut Figuren auswählen lassen.

## Fortsetzung 2026-11-14 ab `8adb8825`

### Umgesetzt
- Bestätigungen verwenden natives `dialog.showModal()`: Browser sperrt den Hintergrund auch für Fokus und assistive Navigation. Abbrechen bleibt vorausgewählt; Escape/Android-Abbruch liefert `false`; Fokus kehrt zum Auslöser zurück.
- Optionale Meldungen laufen während einer offenen Bestätigung nicht ab. Dekorative Bewegung pausiert bis zum Dialogende.
- Neuer isolierter Playwright-Lauf: 320×640 und 640×320 mit Touch, Fokusfalle, Hintergrund-Fokussperre, Fokus-Rückgabe, 200 % Schriftgröße, erreichbaren Aktionen und dynamischem System-Bewegungsmodus. Externe Browseranfragen werden blockiert; keine App-/Auth-/Backend-Initialisierung.
- Acht Original-PNGs durch SHA-256-Manifest geschützt; CI prüft ihre unveränderten Bytes.

### Prüfstand
- 91 isolierte Node-Prüfungen lokal bestanden.
- Lokaler Chromium-Start ist durch die Ausführungsumgebung blockiert (`socket: Operation not permitted`); dies ist keine bestandene Browserprüfung. GitHub Actions führt die sechs neuen Browserfälle auf Ubuntu aus.

### Nächste Prioritäten
1. P1: Reales Android-Gerät mit TalkBack, großer Systemschrift, Bildschirmtastatur und Zurück-Geste prüfen. Chromium-Viewport-Tests ersetzen diese Geräteabnahme nicht.
2. P1: Weitere Browserfälle für echte Meldungswechsel/Live-Regionen und verschiedene Einstellungswechsel ergänzen, sofern Fehler oder Abnahmelücken vorliegen.
3. P2: Separate Layer/Frames für Körperteilanimation erst mit originalgetreuen zusätzlichen Assets; vorhandene acht PNGs bleiben unangetastet. Keine Behauptung echter Ohren-/Pfotenanimation durch Ganzbild-CSS.
4. P3 und Comic-Chef bleiben nachrangig bzw. unbeschlossen.
