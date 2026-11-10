# Sicherheits-Audit und Maßnahmenplan – Nachlass & Erben
Stand: 2026-11-10

## Geltungsbereich
- `tools/digitaler-nachlass/index.html`: lokaler Tresor, Schlüssel, Cloud-Sicherung und Check-in
- `tools/digitaler-nachlass/erben.html`: Erben-Portal, Notfallalarm und Entschlüsselung
- `tests/b3-nachlass.test.cjs` und `.github/workflows/b3-nachlass.yml`

## Bestätigte Befunde

### P0: Clientseitige Freigabe
Das Erben-Portal liest verschlüsselte Daten aus Firebase und erhält den AES-Schlüssel aus einem Erben-Link (`#key=`). Inaktivität und 24-Stunden-Alarm werden in JavaScript anhand von Cloud-Zeitstempeln ausgewertet. Die Anzeige „gesperrt“ verhindert daher technisch nicht die Entschlüsselung bei Besitz von Schlüssel und Ciphertext. **Kein serverseitiger Zugriffsschutz nachgewiesen.**

### P0: Masterkey im lokalen Browser-Speicher
Der Haupt-Tresor speichert `masterKeyHex` mit der lokalen Konfiguration unter `digital_estate_vault`. Ein kompromittiertes Gerät, Browserprofil oder vollständiges lokales Backup kann Schlüssel und Ciphertext offenlegen.

### P0: Firebase-Regeln nicht auditiert
Das Portal liest `vaults/{vaultId}` und schreibt `emergencyTriggers.{personKey}` clientseitig. Ohne verifizierte Firebase Security Rules und serverseitige Identitätsprüfung kann keine belastbare Aussage über Lese-/Schreibberechtigungen getroffen werden. Eine Kontaktprüfung im Browser ist nur UI-Härtung, keine Autorisierung.

### P1: Alarmzustellung
Der Notfallalarm wird in Firebase geschrieben; die Benachrichtigung über EmailJS ist ein separater Vorgang. Erfolgreiche Zustellung und wirksame Eskalation sind nicht garantiert.

### P1: Gerätewechsel und Datenkonsistenz
Eine Supabase-basierte verschlüsselte Sicherung ist implementiert; ein realer Wiederherstellungsdurchlauf mit produktivem Tresor ist laut Gerätewechselanleitung nicht abschließend nachgewiesen. Firebase- und Supabase-Zuständigkeiten müssen eindeutig dokumentiert werden.

## Bereits in diesem Paket umgesetzt
1. Erben-Portal kennzeichnet die Freigabe ausdrücklich als clientseitig und nicht sicherheitsverbindlich.
2. Tresor-ID und 64-stelliger AES-Schlüssel werden vor Verwendung auf ein erwartetes Format geprüft.
3. Cloud-Fehler werden nicht mehr ungefiltert in HTML bzw. Alarm-Rückmeldungen angezeigt.
4. Unbekannte Kontakt-IDs können in der normalen Oberfläche keinen Alarm mehr auslösen; dies ersetzt **keine** Firestore-Regel.
5. Regressionsprüfungen ergänzt und Nachlass-Workflow für `main` sowie `erben.html` aktiviert.

## Priorisierte Umsetzung

### Paket A – verbindliche Sicherheitsarchitektur (P0)
- Firebase-Regeln, Cloud-Zugriffsrechte und Datenfelder **nur lesend** prüfen.
- Threat Model: Link-Diebstahl, Browser-Kompromittierung, manipulierte Zeitstempel, gefälschte Alarme, Replay und Widerruf.
- Freigabe **serverseitig** erzwingen, ohne den Masterkey vorab an Erben zu verteilen. Entweder serverseitig kontrollierte Freigabe einer separat verschlüsselten Erben-Schlüsselhülle oder neues, überprüftes Key-Sharing-Protokoll.
- Bestehende Links nicht stillschweigend invalidieren. Migrations-/Widerrufsplan und Rollback dokumentieren.

### Paket B – Tresorschlüssel (P0)
- Passwort- oder passkey-gestützte Schlüsselhülle mit dokumentiertem KDF und Salt; keine Speicherung des Klartext-Masterkeys neben Ciphertext.
- Wiederherstellungscodes, Offline-Backup und sichere Sperr-/Entsperr-Zustände.
- Altdaten-Migration ausschließlich nach überprüfter Wiederherstellbarkeit und ausdrücklicher Freigabe.

### Paket C – Alarm und Erben (P0/P1)
- Authentisierte Vertrauenspersonen, serverseitige Autorisierung, Ratenbegrenzung, Protokollierung und Widerruf.
- Serverzeit statt lokaler Gerätezeit; nachvollziehbarer Zustandsautomat mit Check-in, Alarm, Einspruch, Freigabe.
- Zustellstatus und Wiederholungsstrategie für Benachrichtigungen.

### Paket D – Verifikation und Release (P1)
- Negative Berechtigungs- und Zeitmanipulations-Tests, AES-GCM-Roundtrips und Browser-End-to-End-Tests ohne produktive Testdaten.
- Verifizierte Gerätewechsel-Wiederherstellung in einer isolierten Umgebung.
- Rechtliche Hinweise: kein automatischer Nachweis der Erbenstellung, keine rechtliche Beratung, klare Datenverantwortlichkeit.

## Betriebsregel
Keine produktiven Datenbankänderungen, keine Testdaten in Produktivsystemen, keine stillschweigende Migration von Schlüsseln oder bestehenden Tresoren. Bis P0 abgeschlossen ist: keine Passwörter, PINs oder sonstige hochsensible Geheimnisse im Nachlass speichern. GitHub-Commit und Vercel-Build sind **kein** Sicherheitsfreigabenachweis.
