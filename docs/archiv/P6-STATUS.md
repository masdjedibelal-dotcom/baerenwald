# P6 — Pattern-Konsolidierung (Status)

Kurzfortschritt Portal-Pattern-Audit.

| Item | Stand |
|------|--------|
| Pattern-Katalog | `docs/PORTAL-PATTERN-KATALOG.md` (Buttons, Status, Loading, Empty, Error, Toast, Tokens) |
| Toast-Entscheidung | **portal-toast** (Sonner nur Runtime) |
| Status-Pill | `RoleStatusPill` → Wrapper um `PortalStatusPill`; Töne über `.role-pill-*` |
| Loading-Copy | „Portal wird geladen…“ → Default von `PortalContentBusy` |
| **Buttons (Foundation)** | `PortalButton` + Alias `ActionBtn` angelegt; ≥15 High-Traffic Call-Sites migriert |
| Tokens | `--p2-` Portal / `--fl-` Website — dokumentiert |

## Button-Migration (dieser Stand)

Neu: `src/components/portal/PortalButton.tsx` — additiv `portal-btn` + `portal-action-btn` (+ Variante).

Migriert u. a.:

- Shared: `PortalSheetConfirm`, `PortalModalShell`, `PortalDetailUi` (Action-Row), `PortalDetailCard`, `PortalInviteMailtoSheet`, `PortalKontoSicherheitPanel`
- Portal: `PortalVorgangDetail`
- Partner: `PartnerAuftragDetail`, `PartnerAbschlussModal`, `PartnerAbnahmeAbschlussSheet`, `PartnerFirmendatenFehlenDialog`, `PartnerDokumentPreviewModal`, `PartnerPositionLebenszyklusList`
- Org/HV: `OrganisationHvVorgangDetail` (lokales ActionBtn → PortalButton), `OrgFreigabeBanner`, `OrgMeldungAktionBanner`, `VorgangStornoDialog`, `OrgHmBefundPanel`, `OrganisationMieterwechselPanel`

Offen: restliche rohe `portal-action-btn`-Klassen und reine `btn-pill-*`+`portal-btn`-Sites schrittweise.
