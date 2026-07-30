# Portal Primary-Matrix (P3-08)

Stand: Juli 2026 · SoT für Sticky/Primary am Vorgang-Detail  
Regel: **genau eine Primary** sichtbar; Banner nur wenn ≠ Primary; Danger im ⋯ oder Confirm.

| Rolle | Situation / Status | Primary | Secondary |
|-------|-------------------|---------|-----------|
| **Kunde** | Angebot gesendet, wartet | Angebot annehmen | Ablehnen |
| **Kunde** | Auftrag-Änderungen | Änderungen annehmen | — |
| **Kunde** | Sonst | — (nur Lesen / Docs) | — |
| **HV** | Meldung neu / Freigabe nötig | Vorgang freigeben | Ablehnen |
| **HV** | Angebot vorgelegt | Angebot annehmen | Ablehnen / Details |
| **HV** | Unter Schwelle | — (Hinweis Banner) | — |
| **HV** | Abschluss / Feedback | Feedback geben | — |
| **Partner** | Offen / Anfrage | Annehmen | Ablehnen |
| **Partner** | Durchführung | Dokumentieren / Position starten | — |
| **Partner** | Abschluss bereit | Abschluss signieren | — |
| **Partner** | Erledigt | — | — |

## Umsetzung

- Sticky: `PortalDetailStickyActions` — max. 1 Primary + optional 1 Secondary
- Shell: `hideMobileChrome` im Detail → keine konkurrierende Bottom-Nav
- Copy-Quellen: `HV_DETAIL_COPY`, Partner Detail-CTAs, `PortalVorgangDetail`

## Offene Audits

Pro Screen Banner vs. Sticky prüfen (OrganisationHvVorgangDetail, PartnerAuftragDetail) — Banner-Text kürzen wenn Primary denselben Job sagt (`P3-06` Coach).
