# Datenschutz To-dos - Melde-Flow / Auftraggeber-Portal

Stand: Juli 2026

Hinweis: Umsetzungs-Checkliste, ersetzt keine anwaltliche Prüfung.

**Rechtspaket (Entwurf):** [legal/RECHTPAKET_BAERENWALD_ENTWURF.md](./legal/RECHTPAKET_BAERENWALD_ENTWURF.md)  
**CRM-Handoff:** [DATENSCHUTZ_CRM_HANDOFF.md](./DATENSCHUTZ_CRM_HANDOFF.md)

## A) Öffentliches Meldeformular (/melden)

- [x] Art.-13-Kurzhinweis direkt im Formular ergänzt
- [x] Zentrale Komponente `MeldeDatenschutzHinweis` + Copy-Modul
- [x] Modus `ergaenzen` mit gleichem Hinweis
- [x] Org-spezifische Rechts-URLs (`/melden/[org]/datenschutz`, `/impressum`)
- [x] Hinweis zu fotosensiblen Inhalten ergänzt
- [x] Bestätigungsseite um Hinweis "Registrierung optional" ergänzt
- [ ] Optional: „Hinweis gelesen“-Checkbox evaluieren (nicht Pflicht)

## B) Datenschutzerklärung (Website)

- [x] Abschnitt Schadenmeldung HV (/melden)
- [x] Abschnitt Auftraggeber-Portal
- [x] Speicherdauer Melder-Leads und Fotos in Abschnitt 10
- [x] Org-spezifische Mieter-Seiten + Rechtspaket Teile D/E (Variante B freigegeben)
- [x] Anwaltliche Freigabe Rollenmodell Mieter-Impressum/Datenschutz (HV Inhalt / Bärenwald Betrieb)
- [ ] Speicherdauer final mit Löschkonzept abgleichen

## C) Hausverwaltung / Vertrag

- [x] Vertragsvorlagen Gliederung/AVV/Prozess/Onboarding
- [x] AVV-Kernentwurf + TOM + Subprozessoren + Fragenkatalog (Entwurf)
- [ ] Auftraggebervertrag HV finalisieren (Anwalt)
- [ ] AVV-Anlage finalisieren (Anwalt) → `av_version` 1.0
- [ ] Rollenklärung / Handwerker-Einordnung (Anwalt Frage 1)
- [ ] Betroffenenanfragen-Prozess verbindlich (operativ CRM)
- [ ] Notfall-Ausnahme vertraglich finalisieren

## D) CRM / Betrieb

- [x] Hinweise HV-Einladung + Portal-Einstellungen
- [x] CRM-Handoff-Dokument
- [x] VVT-Entwurf + Löschkonzept-Entwurf dokumentiert
- [ ] VVT final im CRM hinterlegen
- [ ] Löschjobs implementieren (nach anwaltlicher Fristen-Freigabe)
- [ ] AVV-Register Subprozessoren laufend pflegen
- [ ] Interne Schulung datensparsame CRM-Nutzung

## E) Rollout je neue HV

- [x] Checkliste Vorlage: [ORGANISATION_ONBOARDING_CHECKLISTE_HV.md](./legal/ORGANISATION_ONBOARDING_CHECKLISTE_HV.md)
- [ ] Vertrag + AVV unterschrieben / digital akzeptiert
- [ ] Org + Objekte angelegt, Gate grün
- [ ] Melde-Link datenschutzkonform (org-URLs)
- [ ] Ansprechpartner Datenschutz festgelegt
- [ ] Testfall Meldung + Abnahme + Löschung
