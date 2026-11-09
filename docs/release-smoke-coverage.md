# Release-Smoke: Abdeckung und Grenzen

Der Offline-Check `node scripts/release-smoke.cjs` validiert die Startseite und die elf verlinkten Tools ohne Netzwerk, Anmeldung oder produktive Daten.

## Geprüfte Punkte

1. Die Startseite deklariert `lang="de"`.
2. Die Startseite besitzt einen nichtleeren Seitentitel.
3. Ein Viewport-Metatag ist vorhanden.
4. Eine nichtleere Meta-Beschreibung ist vorhanden.
5. Ein HTTPS-Canonical-Link ist vorhanden.
6. Mindestens elf eindeutige Tool-Seiten werden verlinkt.
7. Tool-Links folgen dem erwarteten relativen Pfadschema.
8. Jede verlinkte Tool-Seite existiert im Repository.
9. Startseite und Tool-Seiten besitzen DOCTYPE und HTML-Element.
10. Jede Seite besitzt einen nichtleeren Titel.
11. Inline-JavaScript wird auf Syntax geprüft; Inline-JSON wird geparst.

## Grenzen

Diese statischen Prüfungen ersetzen weder Browser- und Accessibility-Tests noch eine erfolgreiche CodeQL-Analyse. Sie prüfen keine externen CDN-Downloads, Authentifizierung, Supabase-Live-RLS, produktive Datensätze oder Verschlüsselung. Ein HTTP-504-Fehler beim Herunterladen von CodeQL wird hierdurch nicht behoben.

## Ausführen

```sh
node scripts/release-smoke.cjs
```

Ein fehlgeschlagener Check beendet den Prozess mit Fehlercode, sodass CI den Fehler sichtbar machen kann.
