# Digitaler Nachlass: nutzbarer Freigabeweg v2

Dieser Stand ersetzt die Oberflächen aus PR 394/395 und den reinen Alarm-Entwurf.
Die alten A10-/HPKE-Entwürfe sind keine Aktivierungsanleitung für diesen Freigabeweg.

## Vertrauensgrenze

- Besitzer: bestehendes Supabase-Konto, bestätigte E-Mail, aktive Auth-Session.
- Hauptschlüssel wird im Browser mit PBKDF2-SHA256 (600000), 16-Byte-Salt und AES-256-GCM geschützt. Er liegt nach expliziter Übernahme eines vorhandenen Gerätetresors nicht mehr unverschlüsselt in localStorage. Offen bleibt er nur im Arbeitsspeicher; Schließen, Kontowechsel, Fremdfensteränderung oder zehn Minuten Inaktivität sperren den Tresor.
- Bestehendes Backupformat `vault_cloud_snapshots` bleibt kompatibel. Daten und Kontaktkonfiguration sind getrennt verschlüsselt; die Recovery-Hülle bleibt im bisherigen Format. Ein Konto-Passwortreset ersetzt kein verlorenes Tresorpasswort.
- Vertrauenspersonen bekommen ausschließlich eine **separate Lesekopie der Einträge**. Niemals Besitzerhauptschlüssel, Kontaktdaten, Recovery-Hülle oder `trusteeKeys`. Jede Veröffentlichung erzeugt einen neuen Leseschlüssel. Je Kontakt ist dieser unter einer aus dem persönlichen Zufallsschlüssel abgeleiteten AES-Hülle verschlüsselt.
- Die vertrauenswürdige zeitgesteuerte Komponente ist PostgreSQL hinter der Edge Function `estate-emergency`. Sie hält diese Hüllen in einem nicht exponierten Schema zurück. Zwei unterschiedliche aktive Schlüsselhashes desselben Tresors reichen sofort. Ein Schlüssel reicht nur nach serverseitiger, nicht widerrufener Frist. Das ist eine serververmittelte Freigabe, kein vom Server unabhängiges Shamir-Verfahren. Der Server erhält bei Einlösung persönliche Schlüssel und muss vertrauenswürdig betrieben werden.
- Ein kompromittierter Besitzerbrowser, gestohlene Besitzerzugangsdaten plus Tresorpasswort oder zwei gestohlene Personenschlüssel bleiben außerhalb dieses Schutzes. Bereits ausgehändigte Klartexte/Hüllen lassen sich nicht zurückholen.

## Autorisierung und Parallelität

`estate_release_v2` ist ausschließlich für `service_role` ausführbar. Keine direkten Rechte für `anon`/`authenticated` im privaten Schema; RLS ist zusätzlich aktiviert. Die Edge Function setzt die Besitzeridentität aus `auth.getUser`, nie aus dem Request. Sensible Besitzer-RPCs prüfen eine noch existierende `auth.sessions`-Zeile. Entwarnung verlangt eine weniger als zwei Minuten alte Passwortbestätigung im verifizierten Token.

Publizieren, Entwarnen, Freigeben und Widerruf serialisieren am Besitzer-Datensatz. Widerruf wird nach dem Sperrerwerb erneut geprüft. Besitzerupdates verwenden einen Versionsvergleich; Online-Backups vergleichen zusätzlich den letzten Cloudzeitstempel. Es gibt keine stillschweigende Überschreibung eines anderen Tresors. Kontakte/Schlüsseländerungen heben einen bisherigen Ein-Personen-Alarm auf. Alte Vorbereitungsschlüssel werden beim ersten Öffnen weiterverwendet und registriert; das erfordert die Anmeldung des jeweiligen Besitzers und kann nicht ohne dessen Tresorpasswort serverseitig erfolgen.

## E-Mail und 24 Stunden

Erforderliche Supabase-Edge-Secrets:

- `BREVO_API_KEY`: regulärer Brevo-API-Schlüssel (kein SMTP- oder MCP-Schlüssel).
- `ESTATE_MAIL_FROM`: in Brevo bestätigte Absenderadresse als reine E-Mail-Adresse. Für dieses Projekt: `duhrrom@gmail.com`; Anzeigename ist Helferlein.

Brevo wird verwendet, sobald `BREVO_API_KEY` gesetzt ist. Alternativ bleibt `RESEND_API_KEY` mit einer bei Resend verifizierten Absenderadresse unterstützt. Bei einem Brevo-Fehler wird nicht automatisch auf Resend gewechselt. Geheimnisse ausschließlich im Supabase-Dashboard unter Edge Functions → Secrets speichern, nie im Repository oder Chat. Die Healthantwort zeigt nur Providername und Konfigurationsbereitschaft; sie bestätigt keine erfolgreiche Zustellung. Freemail-Absender können von Brevo umgeschrieben werden und brauchen eine tatsächliche Zustellprüfung sowie gegebenenfalls Kontofreigabe.

Ohne passenden API-Schlüssel und Absender antwortet der Alarm mit `notification_unavailable`; es wird keine Alarmzeile erstellt. Die Zwei-Schlüssel-Freigabe ist unabhängig davon nutzbar. Die Healthantwort zeigt nur die Konfigurationsbereitschaft, niemals Geheimnisse.

Ein Alarm stellt einen idempotenten Zustellauftrag ein. **Erst nach Annahme durch den E-Mail-Anbieter** setzt der Server `alarm_started_at=now()` und `alarm_deadline=now()+24 hours`. Providerannahme garantiert keine Zustellung in den Posteingang; auch Spamfilter/Bounces sind möglich. Ohne bestätigte Providerannahme gibt es keine Ein-Schlüssel-Freigabe. Ein Widerruf oder Lebenszeichen kann durch einen verspäteten Zustellcallback nicht rückgängig gemacht werden. Wiederholte Alarme verlängern keine laufende Frist. Nach Entwarnung gilt eine zehnminütige Alarmsperre.

`pg_cron` ruft minütlich den öffentlichen Worker auf. Dieser nimmt keine Empfänger, Texte oder Fristen an und bearbeitet ausschließlich bereits autorisierte Datenbankaufträge mit Lease, Versuchslimit und Idempotenzschlüssel. Brevo dedupliziert denselben UUID-Schlüssel nur 30 Minuten; nach längeren Unterbrechungen können Wiederholungsmails entstehen. Fehlermeldungen wie `duplicate_parameter` gelten nicht als Zustellbestätigung und geben keinen Schlüssel frei. Die 30-Tage-Erinnerung ist eine getrennte, standardmäßig deaktivierte Einwilligung; sie verändert nie einen Alarmzustand.

Keine produktiven Testkonten, Einträge, Kontakte oder Alarme zum Release anlegen. Realversand erfordert einen ausdrücklich autorisierten Empfänger. Ohne Mailkonfiguration keinen vollständigen Notfallbetrieb behaupten.

## Verifikation

- `tests/security/estate-release-v2.test.cjs`: echte isolierte PostgreSQL-17-Datenbank, zwei Sessions, Frist, Schlüsselprüfung, Berechtigungen, Widerruf, Zustellcallback, Erinnerung.
- `tests/security/estate-browser-v2.cjs`: tatsächliche HTML/JS-Dateien und tatsächlicher Edge-Handler gegen PostgreSQL, ausschließlich künstliche Auth-/Mailadapter. Es geht keine Anfrage an produktives Supabase oder einen realen E-Mail-Empfänger.
- CI `estate-release-v2.yml`: beide Prüfungen, Screenshots und PDF-Prüfung.
- Migrationen sind additiv. Keine bestehenden Nutzer-/Tresordaten werden serverseitig umgeschrieben oder gelöscht. Lokale Übernahme schützt den alten Hauptschlüssel erst nach erfolgreicher Entschlüsselungsprüfung und ausdrücklicher Besitzerbestätigung.

## Bestätigungen für die meldende Vertrauensperson

Beim nächsten Besitzer-Login werden die E-Mail-Adressen der bestehenden Vertrauenspersonen zusätzlich als private Versandmetadaten publiziert. Die Tresorinhalte und persönlichen Schlüssel bleiben verschlüsselt. Ein Alarm akzeptiert weder Empfänger noch Fristen vom Meldenden. Fehlt bei einem alten Kontakt die Versandadresse, muss der Besitzer zuerst synchronisieren; die Zwei-Schlüssel-Freigabe bleibt erhalten.

Der erste gültige Meldende wird pro Alarm gespeichert. Weitere Alarmklicks verlängern die Frist nicht und ändern den Empfänger nicht. Erst der bestätigte Versand an den Besitzer startet die 24 Stunden und legt atomar einen Auftrag `reporter-started` an. Entwarnung (auch vor Versand oder nach Ablauf) legt einmalig `reporter-stopped` an. Kontakt-/Schlüsselwechsel, die den Alarm beenden, erzeugen ebenfalls diese Entwarnung. Wiederholte Lebenszeichen und Zustellcallbacks erzeugen keine doppelten Aufträge. Nicht versandte Startbestätigungen werden nach Entwarnung bzw. einem neuen Alarm verworfen. Nachrichten nennen den Ereigniszeitpunkt und verweisen für den aktuellen Status auf das Portal; eine bereits versandte Mail lässt sich nicht zurückholen.

Bestätigungsmails enthalten keine Schlüssel und keine Freigabeberechtigung. Der Fristablauf wird mit Datum, Uhrzeit und Zeitzone Europe/Paris angegeben. Ein aktiver Countdown in einer E-Mail lässt sich ohne externe Bildabrufe oder eingeschränkt unterstützte Mailtechniken nicht zuverlässig darstellen. Deshalb enthält die Mail die feste Freigabezeit und einen Link zum Portal. Nach Eingabe des persönlichen Schlüssels zeigt dieses einen laufenden Countdown, basierend auf Serverzeit und monotoner Zeitmessung, und prüft den Serverstatus alle 30 Sekunden erneut. Die tatsächliche Freigabe prüft weiterhin ausschließlich PostgreSQL.

Die vorhandene minütliche Outbox verarbeitet auch diese beiden Mailarten mit derselben Lease, demselben Versuchslimit und stabilen Idempotenzschlüsseln. Brevos Versandlimits und Spamfilter gelten weiterhin; die Bestätigung ändert nie die Alarmfrist. Keine echten Alarme oder zusätzlichen Mails für diese Änderung in Produktion auslösen.
