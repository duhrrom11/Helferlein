# WG-Eigentümerwechsel über UPDATE: Sicherheitsbefund

## Live-Befund (2026-11-09, nur lesend)

Die produktive Tabelle `public.wg_spaces` enthält `id`, `owner_id`, `payload`, `updated_at`.
Die RLS-Policy `wg_spaces_owner_or_member_update` erlaubt UPDATE, wenn der aktuelle Nutzer Eigentümer **oder** Mitglied ist; dieselbe Bedingung wird als `WITH CHECK` verwendet.

Die Policy allein garantiert **nicht**, dass `owner_id` unverändert bleibt. Ob ein ungewollter Eigentümerwechsel praktisch möglich ist, hängt zusätzlich von Tabellen-/Spaltenrechten und Constraints ab. Der Live-Check der Constraints zeigt einen Fremdschlüssel auf `auth.users`, aber keine Eigentümer-Unveränderlichkeitsprüfung.

## Umsetzung vor produktivem Eingriff

1. Frontend- und Backend-Aufrufe von `wg_spaces.update` untersuchen; legitime Eigentümerwechsel identifizieren.
2. Tabellen- und Spaltenberechtigungen sowie mögliche Trigger inventarisieren.
3. Bevorzugte Härtung: `owner_id` für normale Client-UPDATEs unveränderlich machen, ohne `payload`-Updates von WG-Mitgliedern zu unterbrechen.
4. In isolierter Testtransaktion mit Rollen-Simulation verifizieren: Eigentümer und Mitglied dürfen vorgesehene Payload-Updates; beide dürfen `owner_id` nicht ändern; Fremdnutzer darf nichts ändern.
5. Erst nach bestandener Verifikation rückwärtskompatible Migration produktiv anwenden und RLS-Advisors erneut prüfen.

**Keine Produktionsänderung in diesem PR.** Keine Bestandsdaten, Zugänge oder Tresorinhalte ändern.
