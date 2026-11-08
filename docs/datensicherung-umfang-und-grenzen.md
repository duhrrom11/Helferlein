# Datensicherung: Umfang und Grenzen (Stand 2026-11-08)

## Was die Startseiten-Sicherung tatsächlich enthält
Die Startseite exportiert **nur ausdrücklich freigegebene Schlüssel aus `localStorage` desselben Browser-Ursprungs**. Enthalten sind u. a. lokale Daten zu Kassenbon, Haushaltsbuch, WG, Nachlass, Fahrzeug, Haustier, Pflanzen, Energie, Verleih und Rezepte sowie bekannte Oberflächeneinstellungen. Die vollständige Liste und Importfreigabe liegen in `index.html` unter `HELFERLEIN_BACKUP_KEYS` und `isHelferleinBackupKey`.

Neu berücksichtigt sind insbesondere `wg_kassenbon_data`, `wg_budgetbuch_budgets`, `wg_budgetbuch_goals`, `wg_last_loaded_bin_id` und bekannte `helferlein_ui_*`-Einstellungen.

## Was NICHT gesichert wird
- Daten aus Supabase-Tabellen oder Firebase/Firestore werden **nicht** automatisch exportiert.
- Daten in `IndexedDB`, Cookies, Sitzungsspeicher, anderen Domains oder anderen Browserprofilen werden nicht erfasst.
- Unbekannte lokale Schlüssel werden nicht blind exportiert oder importiert; Anmelde- und Sitzungsschlüssel werden ausdrücklich ausgeschlossen.
- Das Nachlass-Backup kann Schlüsselmaterial enthalten. Die lokale Tresorverschlüsselung ersetzt keine sichere Verschlüsselung der Sicherungsdatei.
- Die Sicherung ist keine verlässliche, vollständige Cloud- oder WG-Migration.

## Empfohlener Ablauf beim Gerätewechsel
1. Auf dem bisherigen Gerät die Helferlein-Startseite öffnen und **„Verschlüsselt“** wählen.
2. Ein langes, einzigartiges Passwort wählen und getrennt von der Sicherungsdatei sicher aufbewahren.
3. Die JSON-Datei geschützt übertragen und auf dem neuen Gerät über „Restore“ einspielen. Vorhandene lokale Einträge können überschrieben werden.
4. Die einzelnen Werkzeuge und ihre Datenstände kontrollieren. Supabase-Anmeldung und Firebase-Tresor-Synchronisierung sind getrennte Vorgänge.
5. Die alte Sicherung erst löschen, wenn die benötigten Daten auf dem neuen Gerät vorhanden sind.

## Sicherheit und Betrieb
- Das bestehende unverschlüsselte Exportformat bleibt aus Kompatibilitätsgründen verfügbar; für vertrauliche Daten ist die verschlüsselte Variante vorzuziehen.
- Die verschlüsselte Variante nutzt AES-256-GCM mit einem per PBKDF2-SHA256 (600.000 Iterationen, zufälliges Salt) abgeleiteten Schlüssel. Ein verlorenes Passwort kann nicht wiederhergestellt werden.
- Backup-Dateien sind auf 20 MiB begrenzt. Die Wiederherstellung lokaler Schlüssel ist nicht vollständig transaktional.
- Die Nachlass-Firebase-Synchronisierung kann fehlschlagen; ein Supabase-Login beweist keinen erfolgreichen Tresor-Upload.
- Der vorhandene Entwurf einer Supabase-Tresor-API ist **keine** produktive, freigeschaltete Tresor-Migration. Bestehende Tresore dürfen nicht ohne gesicherten Eigentumsnachweis umgehängt werden.

Diese Dokumentation ist eine Umfangsbeschreibung und keine Garantie, dass alle Werkzeuge bereits vollständig erfasst sind.
