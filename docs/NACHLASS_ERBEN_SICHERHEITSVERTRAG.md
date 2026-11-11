# Nachlassverwaltung / Erben-Portal – Sicherheits- und Freigabevertrag

**Stand: 2026-11-10. Status: Architekturvertrag, keine produktive Freigabe.**

## Ausgangslage und unmittelbare Schutzmaßnahme

Das bisherige `tools/digitaler-nachlass/erben.html` las verschlüsselte Tresordaten über Firebase/Firestore und leitete die Erbenfreigabe aus Browserzeit, Check-in- und Alarmfeldern ab. Bisherige Links konnten einen Master-Key über `?key=` oder `#key=` transportieren. Ein Linkinhaber mit Ciphertext und vollständigem Schlüssel kann unabhängig von jedem Countdown entschlüsseln. Diese Kombination kann **nicht** durch eine geänderte Anzeige oder eine nachträgliche serverseitige Frist sicher gemacht werden.

Der neue Erben-Portal-Einstieg ist daher bewusst **fail-closed**: kein Firebase, keine Cloudabfrage, keine Schlüsselannahme, keine Alarmauslösung, keine Entschlüsselung, kein Freigabe-Countdown. Er entfernt Query und Fragment beim Laden. Dies schützt **nicht** rückwirkend vor bereits versandten Schlüssel-URLs, Browser-/Serverlogs oder gespeicherten alten Links. Die noch vorhandene Besitzer-Oberfläche und ältere, anderweitig erreichbare Firebase-Datenpfade sind **nicht** als saniert zu betrachten.

## Verbindliche Rollen und Vertrauensgrenzen

1. **Eigentümer**: durch Supabase Auth `getUser` nachweisbar; Tresorzugriff ausschließlich für die zugehörige `owner_user_id`. Browserseitig übergebene User-IDs und Anzeigenamen begründen niemals Berechtigung.
2. **Eingeladene Person**: an eine vorher bekannte und serverseitig verifizierte Supabase-User-ID gebunden. Einladungstoken ist zufällig, kurzlebig, einmalig und nur gehasht gespeichert; Besitz eines Tokens allein berechtigt nicht zur Freigabe.
3. **Akzeptierte Vertrauensperson**: Akzeptanz erfolgt atomar unter DB-Sperren und nach Eigentümer-, Identitäts-, Ablauf- und Widerrufsprüfung. Akzeptanz ist **keine** Einsichtsfreigabe.
4. **Erbe mit freigegebenem Zugriff**: benötigt zusätzlich eine aktive, zum Lesezeitpunkt erneut geprüfte Berechtigung, serverseitig erreichten Freigabezustand **und** eine eigens für diese Person verschlüsselte Schlüsselhülle (Envelope). Das Freigabeereignis enthält niemals einen unverschlüsselten Tresor-/Master-Key.
5. **Server**: prüft Identitäten, Berechtigungen, Zeitbedingungen und Widerruf. Keine Klartextschlüssel in SQL, Logs, Analytics, E-Mail oder URLs; `service_role` niemals im Browser. Bevorzugt private Datenbankschemas, minimale EXECUTE-Rechte und kein vom Client steuerbarer `p_verified_user_id`-Parameter in einer erreichbaren privilegierten RPC.

## Schlüsselmodell (vor Implementierung verbindlich zu konkretisieren)

- Tresor-Inhalte werden clientseitig mit einem zufälligen Datenverschlüsselungsschlüssel (DEK) durch einen geprüften AEAD-Algorithmus verschlüsselt. Pro Schreiboperation sichere Nonce-Erzeugung und authentifizierte Metadaten; Versionierung für spätere Schlüsselrotation.
- Der Eigentümer hält den Zugriff auf die DEK über einen separat gesicherten Wiederherstellungsweg. Keine Ableitung aus einer E-Mail-Adresse oder öffentlichem Token.
- Für jeden Erben wird **vorab** eine individuelle, authentifizierte Schlüsselhülle für dessen geprüften öffentlichen Schlüssel erzeugt. Private Schlüssel verlassen dessen vertrauenswürdiges Endgerät nicht. Der Server speichert ausschließlich Hüllen und öffentliche Schlüssel, nie den Klartext der DEK.
- Die verschlüsselte Hülle und der verschlüsselte Tresor werden **erst nach** serverseitiger Autorisierungs- und Freigabeprüfung geliefert. Diese Freigabe ist ohne Hüllenrotation nach bereits erfolgter Herausgabe **nicht kryptografisch rückholbar**: Widerruf sperrt künftige Abrufe; nach Offenlegung muss für vertrauliche Zukunftsdaten neu verschlüsselt/rotiert werden.
- Alte vollständige Master-Key-Links müssen als bereits offengelegte Geheimnisse behandelt werden; die Besitzeroberfläche darf solche Links nicht neu ausgeben. Sichere Migration vorhandener Ciphertexts/Schlüssel ist ein gesonderter, benutzerkontrollierter Vorgang ohne serverseitige Klartextverarbeitung.

## Serverzustände, Race- und Rollbackregeln

- Einladung: `pending -> accepted` oder `pending -> revoked/expired`; keine Reaktivierung. Ein Widerruf invalidiert ggf. aktive Vertrauenspersonen-Zuordnung und noch nicht herausgegebene Schlüsselhüllen in **einer** Transaktion.
- Notfall: `idle -> alerted -> grace_period -> eligible -> released` oder `alerted/grace_period/eligible -> cancelled`; Zustandswechsel erfolgen nur serverseitig nach verifizierter Berechtigung und Datenbankzeit. Kein Client-Countdown löst eine Freigabe aus.
- Jede Freigabeanfrage sperrt und prüft die maßgeblichen Einladungs-, Eigentümer-, Berechtigungs- und Freigabezeilen in einer dokumentierten einheitlichen Sperrreihenfolge. Bei Konflikt oder Unsicherheit: keine Hülle herausgeben.
- Eigentümerwechsel und Widerruf müssen dieselben Sperren respektieren; veraltete oder doppelte Requests sind idempotent oder eindeutig abzulehnen.
- Ereignisse protokollieren nur notwendige IDs, Zeit und Ergebnis, keine Tokens, Inhalte oder Schlüssel. Fehlerantworten dürfen fremde und unbekannte Tresore nicht unterscheidbar machen.

## Konkrete Implementierungsreihenfolge / Freigabe-Gate

1. Besitzer-Firebase-Altpfade, vorhandene verschlüsselte Datenformate und Recovery-Möglichkeiten inventarisieren. Verträglichkeit und sicheren Migrationspfad vor Codeumschaltung definieren.
2. Einladungs- und Freigabe-Schema in nichtproduktiver PostgreSQL-17-Instanz mit tatsächlicher `vault_cloud_snapshots`-Eigentümerstruktur implementieren; nicht die alten Review-only-Drafts unverändert deployen.
3. Atomare interne SQL-Prozeduren mit engem Funktionsinhaber/EXECUTE-Audit und serverseitiger JWT-Prüfung implementieren; Missbrauchsschutz für Einladungs- und Alarmversuche ergänzen.
4. Clientseitige AEAD-Verschlüsselung, personengebundene Schlüsselhüllen und kontrollierte Recovery integrieren; erst dann Besitzer-UI und Erben-Portal an die freigegebene API anbinden.
5. Mit zwei unabhängigen PG17-Sessions Widerruf gegen Einlösung/Schlüsselabruf, Rechte-RLS, falsche Identitäten und Eigentümerwechsel testen. Zusätzlich einen echten Besitzer-zu-Erben-Flow und Rotation bei Widerruf prüfen.
6. Backup und Rollback bereithalten, Migration und Edge Function kontrolliert deployen; **Freigabe erst danach gesondert aktivieren**. Bis dahin bleibt die statische Erben-Seite gesperrt.

## Bewusste Grenzen dieses Schritts

Die Seite verhindert ab ihrer Veröffentlichung den bisherigen browserseitigen Zugriff **über genau diesen Portalpfad**. Sie widerruft keine vorher herausgegebenen Schlüssel und sperrt nicht automatisch andere Firebase-/Hostingpfade. Der Architekturvertrag ist kein implementiertes Schlüsselprotokoll, kein Datenbankschema und keine bestandene Ende-zu-Ende-Prüfung.
