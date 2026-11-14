# Toolya – nächste Animationsphase: echte Teilbewegungen

## Technische Bestandsaufnahme
Die acht unveränderten Original-PNGs unter `tools/wishlist/` bilden je Figur Begrüßung, Erfolg, Tipp und Fehler ab. CSS kann diese Bilder nur als Ganzes bewegen. Eine unabhängige Animation von Augen, Ohren, Pfoten und Schwanz ist damit nicht realistisch möglich.

## Asset-Vertrag für spätere Ergänzungen
- Originaldateien nie überschreiben. Ergänzende Ebenen nur in `tools/wishlist/toolya-motion-assets/` ablegen.
- Für jede Figur und jeden Zustand dieselben Ankerpunkte, transparente Leinwand und Pixelmaße verwenden. Die originale Figur muss bei deaktivierter Bewegung immer unverändert sichtbar sein.
- Erste Versuchsreihe: **Blinzeln** (Augen-Overlay), **Ohrenneigen** (zwei Ohrenebenen), **Pfotenwinken** (separate Vorderpfote), **Schwanzwedeln** (Schwanzebene).
- Jede Ebene muss ohne sichtbare Schnittkante an das Original anschließen. Keine neue Figur, keine veränderten Accessoires oder Proportionen.
- Nur mit eindeutig passend freigestellten Originalbestandteilen arbeiten; keine generischen Ersatzteile. Wo Originalbestandteile verdeckt sind, ist eine neue visuelle Freigabe der Ergänzungsframes nötig.
- Auf älteren Android-Geräten zunächst jeweils nur eine kurze Bewegung abspielen. Keine Dauerschleifen und keine großen Raster-Animationen.
- Bei `prefers-reduced-motion:reduce`, Ruhemodus oder Bewegungsstufe Aus ausschließlich die statischen Originalbilder zeigen.

## Abnahme vor technischer Aktivierung
1. Türkis und Lila nebeneinander auf 320/360/375 px testen.
2. Ebenen bei 100 % und 200 % Zoom auf Nahtstellen und Transparenz prüfen.
3. Blinzeln, Ohren, Pfote und Schwanz einzeln prüfen; danach kurze Kombinationen.
4. TalkBack, Tastatur, Ruhezustand und Ruhemodus erneut kontrollieren.
5. Erst nach visueller Abnahme die ergänzenden Assets mit explizitem Fallback in den Buddy integrieren.

**Status:** Konzept und Integrationskriterien dokumentiert. Es wurden keine neuen Körperteil-Assets erzeugt oder als fertig ausgegeben.
