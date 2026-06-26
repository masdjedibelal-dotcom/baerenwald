# Datenschutz To-dos - Melde-Flow / Auftraggeber-Portal

Stand: 25.06.2026

Hinweis: Diese Liste ist eine Umsetzungs- und Projektcheckliste und ersetzt keine
anwaltliche Prüfung.

**CRM-Handoff (vollständig):** [DATENSCHUTZ_CRM_HANDOFF.md](./DATENSCHUTZ_CRM_HANDOFF.md)  
**Vertragsvorlagen:** [legal/](./legal/)

## A) Öffentliches Meldeformular (/melden)

- [x] Art.-13-Kurzhinweis direkt im Formular ergänzt
- [x] Zentrale Komponente `MeldeDatenschutzHinweis` + Copy-Modul
- [x] Modus `ergaenzen` mit gleichem Hinweis
- [x] Links auf `Datenschutzerklärung` (#melden-hv) und `Impressum`
- [x] Hinweis zu fotosensiblen Inhalten ergänzt ("nur schadensrelevant")
- [x] Bestätigungsseite um Hinweis "Registrierung optional" ergänzt
- [ ] Optional: zusätzliche "Hinweis gelesen"-Checkbox evaluieren (nicht Pflicht)

## B) Datenschutzerklärung (Website)

- [x] Abschnitt "Schadenmeldung über Hausverwaltung (/melden)" ergänzt
- [x] Abschnitt "Auftraggeber-Portal (Organisationen)" ergänzt
- [x] Speicherdauer Melder-Leads und Melder-Fotos in Abschnitt 10
- [ ] Anwaltliche Finalprüfung zu Rollenmodell-Formulierung (HV/Bärenwald)
- [ ] Speicherdauer final mit Rechtsberatung und operativem Löschkonzept abgleichen

## C) Hausverwaltung / Vertrag

- [x] Vertragsvorlagen als Gliederung/AVV/Prozess/Onboarding angelegt (`docs/legal/`)
- [ ] Auftraggebervertrag für HV finalisieren (Anwalt)
- [ ] AVV-Anlage nach Art. 28 DSGVO für HV finalisieren (Anwalt)
- [ ] Rollenklärung dokumentieren (HV allein verantwortlich oder Art. 26)
- [ ] Prozess für Betroffenenanfragen verbindlich festlegen (operativ im CRM)
- [ ] Notfall-Ausnahme (sofortige Weiterleitung) vertraglich und textlich finalisieren

## D) CRM / Betrieb

- [x] Hinweis im HV-Einladungsflow ergänzt ("nur mit Rechtsgrundlage")
- [x] Hinweis im HV-Portal Einstellungen
- [x] CRM-Handoff-Dokument mit SQL-Snippets und Prioritäten
- [ ] VVT-Eintrag "Mieter-Schadenmeldungen" in CRM final hinterlegen
- [ ] Löschkonzept für `melder_*`, `funnel_daten.fotos`, Leads finalisieren + implementieren
- [ ] AVV-Register für Unterauftragsverarbeiter laufend pflegen
- [ ] interne Schulung: datensparsame Nutzung im CRM

## E) Rollout-Checkliste je neue Hausverwaltung

- [x] Checkliste als Vorlage: `docs/legal/ORGANISATION_ONBOARDING_CHECKLISTE_HV.md`
- [ ] Vertrag + AVV unterschrieben
- [ ] Org-Kennung und Objekte angelegt
- [ ] Melde-Link in HV-Kommunikation datenschutzkonform eingebunden
- [ ] Ansprechpartner für Datenschutzanfragen festgelegt
- [ ] Testfall: Meldung mit/ohne Foto, Freigabe, Löschung geprüft
