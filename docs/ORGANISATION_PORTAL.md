# Auftraggeber-Portal (Organisation)

Route: `/portal` mit `kunden.portal_modus = 'organisation'`

## Öffentlich

- `/melden/{org_kennung}` — Objektliste
- `/melden/{org_kennung}/{melde_slug}` — Meldeformular (Mieter)
- `/melden/ergaenzen/{token}` — Melder ergänzt vorerfasste Meldung
- `/melden/bestaetigung` — Erfolgsseite

## APIs

| Route | Zweck |
|-------|--------|
| `POST /api/meldung` | Melder-Lead |
| `GET /api/meldung/kontext` | Branding SSR |
| `POST /api/meldung/upload` | Fotos |
| `POST /api/meldung/ergaenzen` | Token abschließen |
| `POST /api/org/meldung-vorab` | Org lädt Melder ein |
| `GET/POST/PATCH /api/org/objekte` | Objekt-CRUD |
| `POST /api/org/anfrage` | Projekt / Servicepaket |
| `POST /api/org/meldung-einladung-erneut` | Einladung erneut senden |
| `PATCH /api/org/einstellungen` | Freigabe-Einstellungen |
| `POST /api/org/freigabe` | Freigabe / Ablehnung |

## Migrationen

1. `20260527130000_kunden_objekte.sql`
2. `20260703120000_organisation_portal_stamm.sql`
3. `20260703120100_organisation_portal_rls.sql`
4. `20260703120200_organisation_freigabe_log.sql`

## CRM-Voraussetzung

Kunde als Organisation anlegen: `portal_modus = organisation`, `org_kennung` setzen, mindestens ein Objekt mit `melde_slug`.

**Backend-Handoff (CRM-Implementierung):** [ORGANISATION_PORTAL_BACKEND.md](./ORGANISATION_PORTAL_BACKEND.md)
