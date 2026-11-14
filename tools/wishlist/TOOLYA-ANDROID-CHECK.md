# Toolya – Android-Sichtprüfung ohne Computer

Stand: 14. November 2026. Ausschließlich isolierte Vorschau, keine Anmeldung und keine produktiven Daten.

## Vorschau auf Android öffnen

1. Im Android-Browser den Branch öffnen: https://github.com/duhrrom11/Helferlein/tree/feature/toolya-buddy-wishlist-v4/tools/wishlist
2. Für eine **funktionierende lokale Vorschau** den Branch als ZIP über GitHub (Code → Download ZIP) herunterladen und entpacken. Die Dateien im Ordner `tools/wishlist/` müssen zusammenbleiben.
3. Mit einer lokalen HTTP-Server-App auf Android, die einen Ordner bereitstellen kann, diesen Ordner als Webroot auswählen und den angezeigten lokalen `http://127.0.0.1:PORT/toolya-mobile-preview.html`-Link im Browser öffnen. Beispiel mit Termux und installiertem Python: `cd /pfad/zum/entpackten/Repo/tools/wishlist && python -m http.server 8765 --bind 127.0.0.1`; anschließend `http://127.0.0.1:8765/toolya-mobile-preview.html` öffnen. Der Pfad hängt vom Speicherort ab.
4. **Nicht** direkt per `file://` öffnen: ES-Module werden dort von mobilen Browsern häufig blockiert. Die GitHub-Dateiansicht ist ebenfalls keine lauffähige Vorschau.

## Abnahmecheckliste

- Türkis und Lila jeweils auswählen; für beide alle vier Zustände durchspielen.
- Begrüßung: kurzes Neigen; Erfolg: sanfter Hüpfer; Tipp: ruhiges Kopfneigen; Fehler: kurzes seitliches Warnsignal.
- Ruhemodus einschalten: optionale Meldungen werden unterdrückt; Fehler bleiben lesbar und bewegen sich nicht.
- „Bewegung testweise deaktivieren“ einschalten: Animation verschwindet, Text und Schließen bleiben bedienbar. Dies **simuliert nur** die Abschaltung.
- In Android **Systemeinstellungen → Bedienungshilfen** die Option zum Entfernen/Reduzieren von Animationen aktivieren (Bezeichnung geräteabhängig). Die Vorschau zeigt, ob `prefers-reduced-motion` vom Browser erkannt wird. Wenn dort „Nein“ steht, ist die Systemoption nicht an die Webseite weitergegeben worden.
- Auf schmalen Bildschirmen, bei vergrößerter Schrift und im Querformat: keine abgeschnittenen Bilder, keine horizontale Scrollleiste, alle Bedienelemente erreichbar.
- Mit TalkBack und externer Tastatur (falls verfügbar): Meldungen und Schließen prüfen. Den Bestätigungsdialog direkt in der Smartphone-Vorschau über „Bestätigung testen“ öffnen; `Tab`, `Shift+Tab`, `Escape`, Fokus-Rückkehr und beide Schaltflächen prüfen.
- In Android hohe Kontraste/Farbinvertierung und große Schrift aktivieren: Dialograhmen, Schaltflächen, Fokusumrandungen und Warnungen müssen erkennbar bleiben. Die automatisierte CSS-Prüfung ersetzt keine echte Sichtprüfung.

## Grenzen

Dies ist ein manueller Testplan, **kein Nachweis**, dass ein echtes Android-Gerät bereits geprüft wurde. Die acht Original-PNGs bleiben unverändert. Mit vollständigen PNGs lassen sich Figuren als Ganzes neigen, hüpfen und verschieben, nicht jedoch Pfoten, Ohren, Augen und Schwanz unabhängig animieren.

## Nächste Animationsphase

Für natürliche Teilbewegungen zunächst je Figur freigestellte, sauber ausgerichtete Ebenen oder kurze zusammenhängende Frames erstellen und die Qualität auf Android vergleichen. Originalbilder niemals überschreiben. Erst nach Sichtprüfung zusätzliche Assets in einem separaten Unterordner hinzufügen; `prefers-reduced-motion` und Ruhemodus müssen immer auf die statischen Originalbilder zurückfallen.
