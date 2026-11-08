# Sicherheitsphase 1 – Freigabe- und Migrationscheckliste

**Status: Entwurf. Keine Produktivfreigabe.** Branch `security-phase1-data-isolation` / Draft-PR #71.

## Umfang

- WG-Browser-Daten pro `wgBinId` getrennt: `helferlein_wg_v2_<id>_<key>`. Ursprüngliche `kassenbon_data`-, `budgetbuch_budgets`- und `budgetbuch_goals`-Schlüssel bleiben unverändert.
- Neue WG-Arbeitsbereiche werden lokal ohne Beispieldaten erstellt.
- Die bisherige unautorisierte WG-Cloud wird nicht mehr beim Seitenstart oder automatisch im Hintergrund abgefragt. Bestehende WG-Cloud-Daten können nur nach mehrfacher Bestätigung importiert werden; vor einem Import wird ein lokaler Snapshot erstellt.
- Der letzte Import kann manuell zurückgenommen werden; auch vor dem Zurücknehmen wird ein Snapshot erstellt.
- Neue Nachlass-Tresore: Passwort → PBKDF2/SHA-256 (350.000 Iterationen, 128-Bit-Salt) → AES-GCM. Der abgeleitete Schlüssel wird nicht in den Tresordaten gespeichert.
- Alte Nachlass-Tresore bleiben im bisherigen Format lesbar; eine Umstellung erfolgt ausschließlich nach ausdrücklicher Warnung.
- Angepasste HTML-Ausgabe von untrusted Einträgen und Validierung von IDs sowie Foto-URLs in mehreren Tools.

## Vor einer Produktivfreigabe unbedingt prüfen

1. **Datensicherung:** Die individuellen Benutzerdaten der aktuellen Produktionsversion vor dem Test separat exportieren. Keine realen Bestandsdaten unkontrolliert in Browser-Tests verwenden.
2. **Bestehende WG:** Lokale Altbestände gehören nicht zwingend zu einer bestimmten WG. Nur nach Überprüfung explizit importieren; ein automatischer Import wäre ein Datenschutzproblem.
3. **WG-Browserwechsel:** Lokal erstellte WGs synchronisieren nicht zwischen Geräten. Die bisherige Legacy-Cloud ist nicht als sicher zertifiziert. Ein neuer Dienst muss serverseitig Mitgliedschaft und Zugriffsrechte prüfen.
4. **WG-Snapshots:** Vor einer manuellen Cloud-Übernahme und vor einem Rollback prüfen, dass genug lokaler Speicher verfügbar ist. Snapshot- und Recovery-Schlüssel dürfen nicht unbemerkt gelöscht werden. Ein lokaler Snapshot ersetzt kein externes Backup.
5. **Digitaler Nachlass:** Ein neu eingerichteter Tresor kann nur mit dem separat verwahrten Passwort wieder entsperrt werden. Bei Passwortverlust ist keine Wiederherstellung zugesichert.
6. **Legacy-Nachlass-Migration:** Vorhandene Notfall-Links und QR-Kits nutzen den alten Schlüssel. Die Umstellung auf eine neue Passphrase macht diese unbrauchbar und erfordert das erneute Ausstellen aller Kits. Firebase-Kopien und Notfallzugriffsrechte müssen separat überprüft werden.
7. **Sicherheitsgrenzen:** HTML-Encoding reduziert Skript-Injektionsrisiken, ersetzt aber keine vollständige DOM-/CSP-Prüfung. `on*`-Attribute im Altcode sollten langfristig durch `addEventListener` mit Delegation ersetzt werden.
8. **Prüfstand:** Sicherheitsregressionen und bisherige B3-Workflows erneut auf dem finalen Commit ausführen; Auth-, QR-, OCR-, Firebase- und Rechteprüfungen realitätsnah in isolierter Umgebung nachstellen.
9. **Veröffentlichung:** Nur nach manueller Abnahme und expliziter Freigabe PR #71 nach `main` übernehmen.

## Notfall-Rollback

- **Quellcode:** PR #71 ist ein Entwurf. Solange kein Merge erfolgt, ist `main` unverändert. Nach einem späteren Merge nur nach Rücksprache per gezieltem Revert zurücknehmen.
- **WG-Daten:** „Weitere Tools“ → „Letzten Cloud-Import zurücknehmen“; aktuellen Stand und Wiederherstellungs-Snapshot prüfen. Die Funktion setzt keine privaten Haushaltsbuch-Schlüssel zurück.
- **Nachlass:** Eine bereits abgeschlossene Schlüsselumstellung darf nicht durch blindes Zurückkopieren alter Daten ersetzt werden. Erst Sicherheitskopie und vorhandene Cloud-/Notfall-Links vergleichen. Ohne korrekte Passphrase sind geschützte neue Tresore nicht entschlüsselbar.
- **Keine Datenbank-Operationen:** Dieser Branch enthält keine Supabase-/Firebase-Schemaänderungen und keine Migrations-SQL-Abfragen.
