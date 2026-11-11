# Nachlass-Besitzeroberfläche: externe Abhängigkeiten und CSP-Grenze

Stand: 2026-11-11. **Nur Dokumentation / Review, kein Deployment.**

## Laufende Browser-Abhängigkeiten
| Quelle | Version | Zweck | Produktionsblocker |
| --- | --- | --- | --- |
| `cdn.tailwindcss.com` | Laufzeit-CDN, nicht gepinnt | CSS-Generierung im Browser | Durch reproduzierbaren lokalen CSS-Build ersetzen; erst dann `style-src 'unsafe-inline'` entfernen |
| `www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js` | 9.22.0 | Firebase-Kompatibilität | Prüfen, ob Firestore noch erforderlich ist; sonst entfernen oder lokales geprüftes Bundle |
| `www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js` | 9.22.0 | Firestore-Kompatibilität | Wie oben; Backend-/Tresor-Funktion vor Entfernen prüfen |
| `cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.js` | 2.57.0, **exakte Version** | Supabase-Anmeldung | Lokales geprüfte UMD-Datei oder reproduzierbarer npm-Build und Subresource Integrity vor Produktivfreigabe |

**Sicherheitshinweis:** Exakt gepinnte URL allein garantiert weder Inhalt noch Integrität. Die UMD-Version wurde in dieser isolierten Umgebung nicht extern abgerufen und daher nicht gegen eine verifizierte Release-Prüfsumme validiert. Vor Freigabe: Paketversion und Artefakt in kontrollierter Build-Pipeline beziehen, Herkunft und Lizenz prüfen, SHA-256/SRI ermitteln, das geprüfte Bundle als lokales Artefakt mit Lockfile bereitstellen, Browser-/Login-/Tresor-Regression ausführen. Keine zufälligen SRI-Werte verwenden.

## Übergangs-CSP
Die echte Besitzerseite blockiert Inline-JavaScript und Eventhandler sowie Plugins; `connect-src` ist auf den konkret benötigten Supabase-Projekthost und Firebase/Google-APIs eingeschränkt. `img-src` und `font-src` erhalten bestehende Darstellungsfunktionen. Die Übergangs-CSP ist ein HTML-Meta-Tag und **keine** vollständige HTTPS-Header-Policy. Die Browser-Prüfung nutzt absichtlich synthetische SDKs und blockiert Drittanbieter-Netzwerkverkehr. Deshalb sind echte CDN-Kompatibilität, Firebase-Netzwerkpfade und Supabase-OAuth-Redirects noch nicht verifiziert.

## Ziel für HTTPS-Ingress (nicht aktiviert)
- HTTPS-only, HSTS nach Host-/Subdomain-Review; kein Token in URL, Logs oder Referrer.
- CSP als **HTTP-Header**, mindestens `default-src 'self'; script-src 'self'; script-src-attr 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`; erst nach lokaler Abhängigkeitsmigration `style-src 'self'`. `connect-src` nur für nachweislich verwendete Auth-/Datenendpunkte, `worker-src` und `img-src` nach Funktionsprüfung.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, geeignete `Permissions-Policy`, Cache-Control `no-store` für Auth-/Erben-API-Antworten.
- Rollout zunächst CSP-Report-Only, dann erzwungene Policy nach realen Chromium-Regressionen, Login/Logout, lokalem Tresor und Mobiltests.
- **Keine** produktive Erbenfreigabe, Migration oder Edge Function ohne getrennte Auth-/RLS-/Berechtigungsprüfung.
