# 50-Schritte-Arbeitsplan – Amazon-Wunschlisten

**Stand:** Implementierung ist nicht gleich bestandener Test. Markierungen der ersten 30 Punkte bezeichnen Code/Einrichtung, nicht Browser-Abnahme. Kein Merge ohne Tests und Review.

## Code & Architektur
- [x] 1. Amazon-Linkparser implementieren
- [x] 2. Affiliate-Linkgenerator implementieren
- [x] 3. Marketplace auf amazon.de begrenzen
- [x] 4. Frontend mit Supabase verbinden
- [x] 5. Öffentliches Profil anlegen
- [x] 6. Profil bearbeiten
- [x] 7. Wunsch hinzufügen
- [x] 8. Wunsch aktualisieren per Upsert
- [x] 9. Wunsch entfernen
- [x] 10. Öffentlichen Feed laden

## Community & Bedienung
- [x] 11. Profil-Suche einbauen
- [x] 12. Profil-Sucheingaben bereinigen
- [x] 13. Folgen implementieren
- [x] 14. Entfolgen implementieren
- [x] 15. Feed: alle Wünsche
- [x] 16. Feed: eigene Wünsche
- [x] 17. Feed: gefolgte Personen
- [x] 18. Öffentliche Wunsch-Notizen
- [x] 19. Mobile Navigation zur Wunschliste
- [x] 20. Feed-Paginierung

## Qualität & Schutz
- [x] 21. Linkparser-Unit-Tests
- [x] 22. Validierungs-Unit-Tests
- [x] 23. CI-Workflow anlegen
- [x] 24. CI auf alle Tests erweitern
- [x] 25. Öffentliche Daten kennzeichnen
- [x] 26. Affiliate-Hinweis anzeigen
- [x] 27. XSS durch textContent vermeiden
- [x] 28. Besitzprüfung bei Wunschlöschung
- [x] 29. RLS auf allen Tabellen aktivieren
- [x] 30. Keine Testdaten in Produktion anlegen

## Vor dem Release prüfen
- [ ] 31. CI-Erfolg nachweisen
- [ ] 32. Browser-Login testen
- [ ] 33. E-Mail-Registrierung testen
- [ ] 34. E-Mail-Bestätigung testen
- [ ] 35. Profiländerungen im Browser testen
- [ ] 36. Wunsch hinzufügen im Browser testen
- [ ] 37. Wunsch löschen im Browser testen
- [ ] 38. Fremde Schreibzugriffe aktiv prüfen
- [ ] 39. Follow-Funktionen im Browser testen
- [ ] 40. Feed-Filter im Browser testen

## Launch-Voraussetzungen
- [ ] 41. Impressum verlinken und prüfen
- [ ] 42. Datenschutzerklärung prüfen
- [ ] 43. Amazon-Partnerprogramm-Text prüfen
- [ ] 44. Moderations- und Meldeweg festlegen
- [ ] 45. Rate Limiting festlegen
- [ ] 46. Spam-Schutz für Produkte implementieren
- [ ] 47. Tastatur- und Screenreader-Test
- [ ] 48. Mobile Cross-Browser-Prüfung
- [ ] 49. Pull Request reviewen und freigeben
- [ ] 50. Erst nach Freigabe mergen und veröffentlichen

**Wichtig:** Die offenen Punkte 31–50 dürfen nicht automatisch als bestanden betrachtet werden. Die Checkliste enthält keine Zusage einer unbeaufsichtigten Weiterarbeit.

## Nachweisregeln für die offenen Schritte 31–50 (10.11.2026)
- **31 – CI:** Nur erfolgreiche, abgeschlossene Wishlist-Checks für den *tatsächlich zu integrierenden Commit* zählen. Ein erfolgreicher älterer Branch-Head, ein Deployment-Status oder eine leere Check-Liste reichen nicht. GitHub-Actions-Lauf und Commit-SHA im PR dokumentieren.
- **32–40 – Browser und Berechtigungen:** Prüfungen mit vorhandenen, berechtigten Konten und ohne neue produktive Testdatensätze durchführen. Fremde Schreibzugriffe nicht durch riskante Änderungen an echten Nutzerdaten testen; wenn ein sicherer Negativtest nicht möglich ist, bleibt der Punkt offen.
- **41–48 – Launch:** Rechtstexte, Affiliate-Hinweis, Meldeweg, Missbrauchsschutz und Barrierefreiheit benötigen jeweils konkrete Nachweise; implementierte UI ist keine Abnahme.
- **49–50 – Freigabe:** Offene Draft-PRs einzeln auf aktuellen `main`-Stand, Konflikte und Überschneidungen prüfen. PR #166 ist keine geeignete Basis für neue Änderungen. Erst nach Review, bestandenen Gates und expliziter Release-Entscheidung mergen bzw. veröffentlichen.

**Übergabe:** Aktuelle, thematisch überschneidende Wishlist-PRs sind [#227](https://github.com/duhrrom11/Helferlein/pull/227), [#229](https://github.com/duhrrom11/Helferlein/pull/229), [#230](https://github.com/duhrrom11/Helferlein/pull/230) und [#231](https://github.com/duhrrom11/Helferlein/pull/231). Ihre Prüfstände sind nicht automatisch Nachweise für `main` oder andere PR-Heads. Diese Ergänzung ändert keine Checkbox und gibt keinen Release frei.
