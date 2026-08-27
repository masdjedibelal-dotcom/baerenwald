# Portal Design — Vereinheitlichung

Checkliste für Handwerker-, HV-, Mieter- und Privat-Portal.  
Bereits erledigt (nicht nochmal anfassen):

- [x] Einstellungen read-only: Klartext statt grauer Boxen (`EinstellungenPfRow`)
- [x] Dokumente: mobil Cards, Desktop Tabelle (`DokumenteTabelle`)
- [x] Stammunterlagen: mobil Cards, Desktop Tabelle (`PartnerStammDokumenteListe`)
- [x] `FileUploadField`: Dropzone statt natives „Dateien auswählen“

---

## Erledigt

### 1. Status-Pills vereinheitlichen
- **Problem:** Mehrere Systeme (`.tag`, Role-Pill, Flow-Chip, lokale Pills) — gleiche Status wirken unterschiedlich.
- **Wo:** `portal-detail-format`, HV-Pills, `RoleStatusPill`, `PortalFlowStatusChip`, Compliance/Fachdoku/Stamm.
- **Ziel:** Ein Pill-Primitive + eine gemeinsame Farbmap für alle Portale.
- [x] Erledigt

### 2. Compliance / Fachdoku mobil als Cards
- **Problem:** Enge Tabellenzeilen (Titel + Pill + Icons) auf Mobil.
- **Wo:** `PartnerComplianceCheckliste`, `PartnerFachdokuSlots`.
- **Ziel:** Wie Dokumente — mobil Cards, Desktop kann Liste/Zeile bleiben.
- [x] Erledigt

### 3. Upload-UX überall angleichen
- **Problem:** Dropzone vs. Icon+hidden Input vs. natives File-Input.
- **Wo:** Compliance/Fachdoku, Logo (`PartnerFirmendatenScreen`, `OrganisationBrandingEditor`), `OrganisationObjektFremdVorgaengePanel`, Nachreich-Foto in `PartnerPositionLebenszyklusList`.
- **Ziel:** Überall `FileUploadField` bzw. kompakte Dropzone-Variante.
- [x] Erledigt (u. a. Logo via `FileUploadField` compact)

### 4. Bestätigungen: kein Browser-`confirm`
- **Problem:** System-Dialog vs. gebrandetes Modal.
- **Wo:** `PartnerComplianceCheckliste`, `PartnerStammDokumenteListe`, `OrganisationObjektePanel`, `OrganisationObjektMieterTab`, `OrganisationObjektEinheitenBewohnerPanel`, `OrganisationAktiveAbosPanel`.
- **Ziel:** Destruktive Aktionen über `PortalConfirmDialog` / Confirm-Modal.
- [x] Erledigt

### 5. Hinweis-Boxen vereinheitlichen
- **Problem:** Drei Looks für dieselbe Rolle (Hinweis).
- **Wo:** `PortalDetailInfoBox`, `EinstellungenInfoBox`, Amber-Banner (`OrgFreigabeBanner`, Fachdoku, Eingang).
- **Ziel:** Shared Info (neutral) + Warning (amber); überall dieselben Components.
- [x] Erledigt (Freigabe-Banner-Actions auf `portal-action-btn`)

### 6. Meta/KeyValues ohne graue Kästen
- **Problem:** Settings schon Klartext; Vorgangs-Metadaten oft noch gefüllte Boxen.
- **Wo:** `PortalDetailKeyValues`, Melder/Preisspanne in `OrganisationEingangPanel`, `PortalHvTerminSection`.
- **Ziel:** Klartext-Rows wie Einstellungen.
- [x] Erledigt

### 7. Button-Regel festziehen
- **Problem:** Mix `portal-action-btn` (Sticky) und `btn-pill-*` ohne klare Regel.
- **Wo:** Sticky Detail-Actions, Freigabe, Abnahme, Kalkulation, Positionen, Confirm-Footer.
- **Ziel:** Sticky/Primary = `portal-action-btn`; sekundäre Inline = `btn-pill-*`.
- [x] Erledigt (`OrgFreigabeBanner` auf `portal-action-btn`)

### 8. Leerzustände vereinheitlichen
- **Problem:** `PortalEmptyState` vs. gestrichelte Box vs. nur Text.
- **Wo:** Listen-Clients, `PartnerPlanerPanel`, Objekt-Dokumente/Akte, `BautagebuchAccordionList`, Eingang, Prüfpflichten.
- **Ziel:** Listen/Panels → `PortalEmptyState` (ggf. compact) oder eine shared Empty-Card.
- [x] Erledigt (Prüfpflichten: `PortalEmptyState` compact)

### 9. Detail-Chrome HV angleichen
- **Problem:** Partner/Mieter nutzen `PortalDetailCard`; HV-Objekt oft eigene `rounded-xl border p-4`.
- **Wo:** `OrganisationObjektPruefpflichtenPanel`, Dashboard, Fremdvorgänge u. a.
- **Ziel:** `PortalDetailCard` bzw. gleiches Section-Chrome.
- [x] Erledigt (`OrganisationObjektPruefpflichtenPanel` → `PortalDetailCard`)

### 10. Section-Header / Edit-Stift
- **Problem:** Settings haben `EinstellungenSectionHeader`; Branding/Org-Panels weichen ab (Doppel-Stift, nur Text).
- **Wo:** `OrganisationBrandingEditor`, Objekt-/Org-Panels.
- **Ziel:** Shared SectionHeader (+ optional Edit) überall.
- [x] Erledigt

### 11. Sticky Primäraktionen auch im HV-Portal
- **Problem:** Partner/Mieter oft Sticky-Footer; HV Freigabe/Abnahme oft nur inline.
- **Wo:** `OrganisationHvVorgangDetail`, Freigabe-/Abnahme-CTAs.
- **Ziel:** Entscheidende HV-Aktionen mit derselben Sticky-Action-Pattern.
- [x] Erledigt (Freigabe-/Angebot-Action-Row sticky mobil)

### 12. HV Prüfpflichten / Objekt-Listen mobil
- **Problem:** Dichte Admin-Listen (`bg-muted`-Zeilen) weit weg von Portal-Cards.
- **Wo:** `OrganisationObjektPruefpflichtenPanel`, `OrganisationObjektEinheitenPanel`, Kontakte.
- **Ziel:** Mobile Card-Rows + gemeinsames Status-Pill; Formulare im Portal-Form-Stil.
- [x] Erledigt (Prüfpflichten: mobil Card-Rows)

---

## Empfohlene Reihenfolge

Alle 12 Punkte sind erledigt.

---

## Phase A+B (2026-08) — Section-Add + HV Objekt-Detail

**Regel (fest):**
- Section-Kopf „Hinzufügen“ → `PortalSectionAddButton` (Accent-Kreis `+`) bzw. `EinstellungenSectionHeader.onAdd` / `PortalDetailCard.onAdd`
- Listen-CTA oben rechts → `btn-pill-primary` (z. B. „＋ Objekt“)
- Sticky/entscheidend → `portal-action-btn`
- Interaktiver Themenblock → `PortalDetailCard` (`responsive`); Stammdaten-Klartext bleibt flach

**Erledigt:**
- [x] Primitive `PortalSectionAddButton` + Header/`PortalDetailCard`-Hooks
- [x] HV Objekt-Detail: Kontakte, Einheiten (+ Personen), Prüfpflichten, Anlagen, Hausmeister (Plus wenn leer / Stift wenn gesetzt)

## Phase C+D (2026-08) — Objekte-Liste + Einstellungen

- [x] C: Objekte-Liste `responsive` (mobil Card, Desktop flach); „＋ Objekt“ bleibt Pill; Leerzustand + Bulk-Aktionen auf Pills
- [x] D: Einstellungen flach mit einheitlichem Section-Header/`gap-8`; Melde/Logo/QR auf `btn-pill-*`; Konto & Sicherheit gleicher Header

## Phase E+F (2026-08) — Vorgangs-Detail + Partner/Eigentümer

- [x] E1: `VorgangDetailBlocks.BlockShell` → `PortalDetailCard` (`responsive`) — gilt für HV/Partner/Privat/Eigentümer
- [x] E2: HV Freigabe-CTAs sticky; HM-Hinweis → `PortalDetailInfoBox`; lokales DetailCard → `PortalDetailCard`
- [x] E3: `OrgFreigabeBanner` / `OrgMeldungAktionBanner` → InfoBox + Action-Row (keine Violet/White-Snowflakes)
- [x] E4: Privat Abnahme-PDF wie HV (`PortalDetailCard` + `PortalDocOpenButton`)
- [x] E5: Partner Auftrag Rechnung/Abschluss → sticky Footer
- [x] F1: `PartnerPflichtenCard` → `PortalDetailCard`
- [x] F3: Eigentümer Einheiten-Stammdaten flach (`PortalDetailKeyValues`); Empty → `PortalInboxEmpty`
