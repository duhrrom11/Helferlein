# Sicherer Gerätewechsel – Digitaler Nachlass

> **Status:** Anleitung für einen kontrollierten Gerätewechsel. Ein echter Gerätewechsel mit einem produktiven Tresor wurde noch nicht abschließend nachgewiesen. Keine Testdaten in der produktiven Datenbank anlegen.

## Vor dem Wechsel auf dem bisherigen Gerät

1. Den lokalen Tresor öffnen und prüfen, ob Einträge, Vertrauenspersonen, Alarmkontakte und Check-in-Einstellungen vollständig sind.
2. Über **„Verschlüsselten Tresor bei Supabase sichern“** die aktuelle Version bewusst sichern. Dazu im richtigen Supabase-Konto angemeldet sein.
3. **„Supabase-Sicherungsstand prüfen“** ausführen. Nur fortfahren, wenn Inhalt und verschlüsselte Konfiguration übereinstimmen.
4. **„Cloud-Wiederherstellung mit Passwort vorbereiten“** auswählen. Ein eigenes Passwort mit mindestens 16 Zeichen festlegen und sicher getrennt vom Gerät aufbewahren. Das Supabase-Anmeldepasswort allein reicht nicht.
5. Zusätzlich eine **verschlüsselte lokale Sicherungsdatei** an einem sicheren Ort aufbewahren. Nicht unverschlüsselt exportieren oder versenden.
6. Das bisherige Gerät und seine lokalen Tresordaten **nicht löschen**, bevor die Wiederherstellung auf dem neuen Gerät kontrolliert wurde.

## Auf dem neuen Gerät

1. Die offizielle Helferlein-Seite öffnen: https://duhrrom11.github.io/Helferlein/tools/digitaler-nachlass/index.html
2. Sicherstellen, dass dort ein **neuer, noch unveränderter lokaler Tresor** vorliegt. Die Wiederherstellung darf keine bereits vorhandenen Einträge, Kontakte oder individuellen Einstellungen überschreiben.
3. Mit **demselben Supabase-Konto** anmelden, in dem die Sicherung gespeichert wurde.
4. **„Tresor aus Supabase wiederherstellen“** auswählen, das separat aufbewahrte Wiederherstellungspasswort eingeben und die angezeigten Sicherheitsbestätigungen sorgfältig lesen.
5. Nach erfolgreicher Wiederherstellung die Anzahl und den Inhalt der Einträge, Vertrauenspersonen, Alarmkontakte und Check-in-Einstellungen mit dem bisherigen Gerät vergleichen.
6. Erst nach einer erfolgreichen Kontrolle entscheiden, ob das bisherige Gerät außer Betrieb genommen werden soll. Die verschlüsselte Offline-Sicherung weiter aufbewahren.

## Bei Problemen

- **Keine Sicherung vorhanden:** Auf dem bisherigen Gerät die Anmeldung und den Cloud-Sicherungsstand prüfen.
- **Falsche Tresor-ID:** Nicht überschreiben; Konto und Tresorzuordnung klären.
- **Falsches Passwort oder beschädigte Schlüsselhülle:** Nicht wiederholt blind versuchen. Das alte Gerät und die Offline-Sicherung unverändert lassen.
- **Neues Gerät hat bereits Einträge oder geänderte Kontakte:** Wiederherstellung nicht erzwingen. Vorhandene Daten zuerst unabhängig sichern und die Zuordnung klären.
- **Cloud-Sicherung ohne verschlüsselte Einstellungen:** Auf dem alten Gerät eine aktuelle vollständige Sicherung erstellen, solange das noch möglich ist.

## Sicherheitsgrenzen

- Das Supabase-Konto enthält verschlüsselte Tresordaten und ggf. eine passwortgeschützte Schlüsselhülle; der Klartext-Masterkey wird nicht bewusst an Supabase hochgeladen.
- Im lokalen Browser-Speicher liegt der Masterkey neben den verschlüsselten Daten. Ein kompromittierter Browser oder ein kompromittiertes Gerät kann daher die Vertraulichkeit gefährden.
- Die bisherige Firebase-Synchronisierung ist **kein bestätigter Ersatz** für diesen Ablauf.
- Bis zur abgeschlossenen Sicherheits- und Gerätewechselprüfung keine Passwörter, PINs oder sonstige Zugangsdaten im Digitalen Nachlass speichern.
