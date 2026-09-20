# Commit-Plan (Portal — Mega-Auftrag Audit)

Belal committed über GitHub Desktop auf **staging**.

---

## HV Portal: Vorgang hängt auf „wird geladen…“ — 2026-09-20

**Commit-Text:** `fix: HV-Portal Vorgang-Detail nicht mehr endlos laden`

### Dateien
- `src/components/portal/PortalClient.tsx` — Fetch-Generation + Settled-Guard; Cleanup gibt Busy frei; Timeout 20s; Fehler-UI statt Endlos-Busy; Parent `onDetailReady` auch wenn forceDetailId schon selected
- `src/components/org/OrganisationPortalClient.tsx` — Safety-Timeout 25s für `pendingDetailId` / Nav-Hold
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Ursache:** Abgebrochener Detail-Fetch ließ `hold()` + `pendingDetailId` stehen; URL-/Layout-Sync setzte `detailLoading` erneut ohne neuen Fetch.

---

## Vorgänge-Listenkarten App-like — 2026-09-20

**Commit-Text:** `fix: Vorgangs-Karten flach wie Zuletzt (kein Doppel-Rand, kein ⋯)`

### Dateien
- `src/components/shared/PortalListCard.tsx` — flache Karte; kein Ghost-Innenrahmen; ⋯ nur bei echten Aktionen
- `src/components/portal/PortalClient.tsx` — redundantes Details-⋯ entfernt
- `src/components/portal/EigentuemerPortalClient.tsx` — dito
- `src/components/portal/HausmeisterPortalClient.tsx` — dito
- `src/components/partner/PartnerClient.tsx` — dito
- `src/app/globals.css` — `.portal-list-card-main` ohne Border; Padding wie Zuletzt
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Ursache:** Innerer `PortalButton` ghost (= Rand) + ⋯-Menü nur mit „Öffnen/Details“.

---

## Zuletzt-Cards größer (App-Listenmaß) — 2026-09-20

**Commit-Text:** `fix: Dashboard „Zuletzt“-Karten wieder Listengröße (nicht portal-btn-Höhe)`

### Dateien
- `src/app/globals.css` — recent-item height:auto/min 72px; Titel 17px; Meta 14px; Override gegen `.portal-btn`
- `src/components/shared/PortalScreenDashboard.tsx` — `action={false}` (kein ghost-Action-Chrome)
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Ursache:** `PortalButton` → `.portal-btn { height: 46px }` hat die Zwei-Zeilen-Karten gequetscht.

---

## KI-Chat Composer weiß + Feld-Parität — 2026-09-20

**Commit-Text:** `fix: KI-Assist-Composer weiß; Chat-Feld wie globales Design`

### Dateien
- `src/components/shared/portal-ki-gpt-chat.css` — Funnel-Shell weiß; Composer weiß; Textarea ohne portal-field-88px; Senden grün/soft
- `src/components/shared/PortalKiAssistField.tsx` — Send-Button `action={false}` (kein ghost-Grau)
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Ursache:** Funnel-Panel `#f5f6f4` + `textarea.portal-field` (min-height 88, eigener Rand) + ghost-Send.

---

## KI-Hilfe Label am Sparkles-Icon — 2026-09-20

**Commit-Text:** `UX: KI-Assist-Button mit Label „KI-Hilfe“`

### Dateien
- `src/components/shared/PortalKiAssistField.tsx` — Sparkles-Icon + Text „KI-Hilfe“ (Funnel Beschreibung, Partner, Org, …)

---

## O1 / O2 / O5 — Freigaben 2026-09-20

**Commit-Text:** `O1/O2/O5: docs versionieren, @-Alias README, renderPdfViaCrm`

### Dateien
- `.gitignore` — `/docs/*.md` weg; nur `/docs/tmp/`
- `README.md` — `@`-Alias (baseUrl + Webpack) begründet; PDF-Hinweis O5
- `src/lib/pdf/render-via-crm.ts` — CRM `POST /api/pdf/render`
- `src/lib/partner/partner-dokument-types.ts` — Typen ohne pdf-lib
- Call-Sites: melde-aushang, versammlungsbericht, bericht, bautagebuch-versicherung, ensure-versicherungsakte, partner-auto-dokumente
- **gelöscht:** `generate-*-pdf.ts` (Aushang/Versammlung/Eigentümer/Versicherung/Bautagebuch/Partner) + `aushang-image-png.ts`
- `.env.example` — `PDF_SERVICE_SECRET=`

**Hinweis Belal (M10):** denselben `PDF_SERVICE_SECRET` in CRM + Portal Env setzen.

---

## Navigation & Suche Phase B–D (Portal)

**Commit-Text:** `Nav/Suche B–D: ⌘K HV+Partner, Return-URL, Nav-Labels`

**Messung:** `node scripts/check-nav-suche.mjs` → `suche_logiken=1` · `nav_label_abweichungen=0`  
`npx tsx scripts/test-portal2-nav.ts` · `npx tsx scripts/test-portal2-create.ts`

**Dateien (Kern):**
- `src/app/api/org/suche/route.ts` · `api/partner/suche` · `api/portal/suche` — server-side ilike, gruppierte Hits
- `src/hooks/usePortalSearch.ts` · `useListUrlState.ts` · `lib/list-return-url.ts` · `lib/search/portal-search-types.ts`
- `PortalHeaderSearch` · `PortalSearchResultsGrouped` · `PortalCommandPalette` · `PortalGlobalShortcuts`
- Clients: Org/Partner/Portal/Eigentümer/Hausmeister — echte Suche, return=, page in URL
- `portal2/nav-items.ts` — N4/N8 Labels; mieter weg; hausmeister dazu
- `scripts/check-nav-suche.mjs` · `test-portal2-nav.ts` · `test-portal2-create.ts`
- `globals.css` — cmdk / search-dropdown

---

## Phase B Mobile

**Commit-Text:** `Phase B Mobile: Touch 44, Sheets VV, Foto, Offline`

**Kern:** PortalButton/Glocke/Chips/Footer/Alle ansehen ≥44; Cookie unter Sticky; PortalModalShell visualViewport; gemeinsame Foto-Kompression + Retry; Offline-Toast.

**Dateien:** `globals.css` · `cookie-consent.css` · `PortalModalShell` · `PortalEinstellungenUi/Shell` · `PhotoUpload` · `PartnerMultiFotoSlot` · `normalize-camera-photo` · `lib/media/optimize-image-for-upload.ts` · `portal-toast` · `portal-copy/errors`

---

## F3 / Mail-Shell — Lead + Confirmation auf buildStandardMailHtml

**Commit-Text:** `F3: Lead-/Confirmation-Mails auf buildStandardMailHtml`

**Messung:** Öffentliche HTML-Builder in `lead-mail-templates.ts` und `confirmation.ts` ohne eigene DOCTYPE/Logo/Footer-Shell; Hülle nur über `buildStandardMailHtml`; CTA über `mailPrimaryButtonHtml` (Intern-CRM); kein farbiger Header-Balken.

**Dateien:**
- `src/lib/email/lead-mail-templates.ts` — `buildKundeBestaetigung`, `buildInternNotification`, `buildSavePriceCustomerHtml`, `buildSavePriceInternalHtml` auf Shell
- `src/lib/email/confirmation.ts` — `generateConfirmationEmail` auf Shell; Token-Interpolation in Style-Strings korrigiert
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## F5 — Transaktionsmail-Betreffs Portal

**Commit-Text:** `F5: Transaktionsmail-Betreffs auf build-subject umstellen`

**Messung:** Subjects nutzen `buildSubject` / `buildPartnerSubject` / `buildInternSubject`; Auth OTP-Subject unverändert; `MIETER_EMAIL_ENABLED=false`; Melder-HTML unverändert.

**Dateien:**
- `src/lib/partner/partner-mail.ts` — Partner + Intern Subjects F5; Rolle „Partner“
- `src/lib/partner/partner-notifications.ts` — `partnerNotificationSubject` F5
- `src/lib/org/notify-hv-*.ts` · `notify-hausmeister-pruefung.ts` — HV/HM Subjects F5
- `src/lib/org/notify-hv-hm-befund.ts` · `notify-hausmeister-pruefung.ts` · `app/api/org/meldung-aktion/route.ts` — Direct Resend + `htmlToPlainText`
- `src/lib/lead/persist-lead.ts` · `lead-funnel-daten.ts` · `email/lead-mail-templates.ts` · `api/save-price/route.ts` — Lead/Rechner Subjects
- `src/lib/email/meldung-mail-templates.ts` — Org-Preheaders F5; Melder-Subject leicht F5; Body unverändert
- `src/lib/funnel/funnel-portal-otp.ts` — Auth-Subject unverändert; `text`-Part ergänzt
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Portal UX — HV-Ablehnen / Partner-Annahme / Einstellungen Dirty+Toggle

**Commit-Text:** `Portal: HV-Ablehnen Pflichtgrund, Partner-Ack-Jump, Einstellungen Sofort-Toggle`

**Messung:** `npx tsc --noEmit` (Portal) grün

**Dateien:**
- `src/lib/portal2/ablehnung-labels.ts` — Kunde/HV-Gründe (CRM-Keys)
- `src/components/shared/PortalAngebotAblehnenModal.tsx` — Pflicht Auswahl + Freitext
- `src/app/actions/portal-angebot.ts` — `rejectKundeAngebot` schreibt `ablehnung_grund`/`ablehnung_notiz`
- `src/components/org/OrganisationHvVorgangDetail.tsx` · `HvAngebotListActions.tsx` · `portal/PortalVorgangDetail.tsx` — Modal statt Direkt-Ablehnen
- `src/components/partner/PartnerOffenDetail.tsx` · `PartnerAuftragAnfrageDetail.tsx` · `PartnerAngebotAuftragAnnehmen.tsx` — Annehmen aktiv → Scroll/Pulse auf Pflicht-Checkbox
- `src/components/partner/PartnerPflichtenCard.tsx` · `PartnerProjektvertragPaket.tsx` — `#partner-pflichten-ack` + Pulse
- `src/app/globals.css` — `.partner-pflichten-ack--pulse`
- `src/components/shared/PortalEinstellungenUi.tsx` — Dirty an EditModal; `EinstellungenInstantToggle`
- `src/components/org/OrganisationFreigabeRegelnPanel.tsx` — Toggles sofort + Confirm; Fälle/Betrag per Speichern
- `src/components/org/OrganisationObjektDetail.tsx` — Objekt-Freigabe-Toggles analog
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**CRM (baerenwald-system, eigener Commit):**
- `src/components/angebote/AngebotDetailPageClient.tsx` — Ablehnung mit Label + Notiz sichtbar

---

## P6-19 — Portal-Oberflächen konsolidiert

**Commit-Text:** `P6-19: PortalButton/Felder/Listen/Status/Detail eine Form`

**Messung:** `node scripts/audit-status.mjs` → P6-19 ✅  
`raw_*=0` · `button_ohne_variante=0` · `sticky_fehlt=0` · `listenformen=0` · `filter_varianten=0` · `status_varianten=0` · `detail_rahmen=1` · `dialog/fehler/lade/timeline_varianten=0`

**Dateien (Kern):**
- `scripts/audit-status.mjs` — Zähler raw_button/input/select/checkbox/date/textarea, button_ohne_variante, sticky_fehlt, listenformen, filter/status/detail/dialog/fehler/lade/timeline_varianten + Todo P6-19
- `src/components/shared/PortalFormControls.tsx` — PortalSelect/Checkbox/Date/Textarea/Input
- `src/components/portal/PortalButton.tsx` — variant Pflicht
- `src/components/org/OrganisationObjektDetail.tsx` — Sticky Actions + PortalDetailLayout
- `src/components/shared/PortalEntityDetailLayout.tsx` — inkl. PortalDetailLayout (ein Rahmen)
- `src/components/shared/portal-detail-layout-context.tsx` — Footer-Context
- `src/components/shared/PortalDetailUi.tsx` — Layout nur Re-Export; Confirm/Sticky bleiben
- `src/components/shared/PortalStatusPill.tsx` — inkl. PortalRoleBadge + PortalFlowStatusChip
- `src/components/shared/PortalRoleBadge.tsx` / `PortalFlowStatusChip.tsx` / `HvObjektFilterPopover.tsx` — gelöscht (0 Treffer)
- `src/components/shared/PortalInlineLoading.tsx` — Alias PortalContentBusy section
- `src/components/shared/PortalFlowTimeline.tsx` — inkl. MieterStgTimeline
- `src/components/melden/MieterStgTimeline.tsx` — Re-Export
- `src/components/shared/PortalListCard.tsx` — AttentionCorner → PortalCountBadge
- `src/components/shared/PortalListeFilterBar.tsx` — MultiSelect (HvObjektFilterPopover weg)
- `src/components/org/OrganisationVorgaengeSection.tsx` — multiSelect statt HvObjektFilterPopover
- `src/components/partner/PartnerClient.tsx` — PortalListeFilterBar direkt
- `src/components/partner/PartnerStammDokumenteListe.tsx` — PortalStatusPill
- `src/components/org/OrgHmBefundPanel.tsx` — StatusChip → PortalListeFilterChip
- Codemods/Massenmigration: raw `<button>`/`<input>`/`<select>`/`<textarea>` → Portal*
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Teil-Commits möglich:** siehe frühere P6-19 (Teil) Abschnitte unten — oder ein Commit.

---

## P6-19 (Teil) — raw_button → PortalButton

**Commit-Text:** `P6-19: raw button → PortalButton (variant Pflicht)`

**Messung:** `raw_button=0` · `button_ohne_variante=0`

**Dateien:**
- `scripts/codemod-p6-19-raw-button.mjs` — AST-Codemod Button→PortalButton
- ~88 Komponenten unter `components/{portal,partner,org,shared,melden}` — `<button>` → `<PortalButton variant="…">`; Copy Schließen→Abbrechen / Entfernen→Löschen wo Labels
- Top: `PartnerPositionLebenszyklusList`, `PartnerAbnahmeAbschlussSheet`, `PortalDocViewer`, `PortalPhotoGallery`, `PortalListeFilterBar`, `PortalStateView` (StateButton)

---

## P6-19 (Teil) — raw Form-Controls → Portal*

**Commit-Text:** `P6-19: raw input/select/checkbox/date/textarea → PortalFormControls`

**Messung:** `raw_input=0` · `raw_select=0` · `raw_checkbox=0` · `raw_date=0` · `raw_textarea=0` (hidden/file per-match ausgenommen; FileUpload/PhotoUpload/SignatureCanvas allowlisted)

**Dateien:**
- `scripts/audit-status.mjs` — raw_input: hidden/file strippen; FileUpload-Allowlist
- `src/components/shared/PortalFormControls.tsx` — kanonische Primitives (unverändert genutzt)
- ~60 Komponenten unter `components/{portal,partner,org,shared,melden}` — `<input|select|textarea>` → PortalInput/Select/Checkbox/Date/Textarea

---

## P6-18 — Feldvalidierung PortalField + System-Toasts

**Commit-Text:** `P6-18: PortalField-Fehler statt Validierungs-Toasts; System-Error-Toast`

**Messung:** `toast_validierung=0` · `raw_error_message_toast=0` · `confirm_disabled=0` · `portalfield_error_genutzt≥2` · P6-18 ✅

**Dateien:**
- `src/components/shared/PortalField.tsx` — required/error/aria-invalid
- `src/lib/portal2/form-schema.ts` — zod parseForm + useFieldErrors
- `src/lib/portal-copy/errors.ts` — userMessage ohne Technik; systemErrorMessage
- `src/lib/shared/portal-toast.ts` — portalToastSystemError
- `src/app/globals.css` — portal-field--error
- `package.json` / `package-lock.json` — zod
- `src/components/shared/PortalKontoSicherheitPanel.tsx` — Passwort/Löschen: PortalField + useFieldErrors; System-Toast
- `src/components/partner/PartnerPreisBearbeitenDialog.tsx` — Preis-Feldfehler; confirmDisabled-Feldgate weg
- `src/components/portal/PortalEinstellungenPrivat.tsx` — Profil-Name Feldfehler
- `src/components/partner/PartnerPositionLebenszyklusList.tsx` — bitte_*-Toasts → Feldfehler
- `src/components/org/OrganisationObjektPruefpflichtenPanel.tsx` — Sonstiges-Bezeichnung Feldfehler
- `src/components/org/OrganisationVersammlungsberichtSheet.tsx` — Von/Bis Feldfehler
- `src/components/org/OrgHmBefundPanel.tsx` — Titel Feldfehler; confirmDisabled weg
- `src/components/org/OrganisationObjektEinheitenTab.tsx` — Bezeichnung Feldfehler; confirmDisabled nur busy
- `src/components/shared/PortalEinstellungenUi.tsx` — confirmDisabled nur saving
- diverse Org-Panels + Push: `portalToastSystemError` statt `.message`
- `scripts/audit-status.mjs` — Metriken + P6-18
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## P6-17 — Zwischenstand lange Formulare

**Commit-Text:** `P6-17: Zwischenstand Melde + Partner-Abschluss (localStorage)`

**Messung:** `lange_formulare_ohne_zwischenstand=0` · P6-17 ✅

**Dateien:**
- `src/lib/portal2/form-zwischenstand.ts` — Autosave + Restore + Hint
- `src/lib/portal-copy/confirm.ts` — restoreDraft / restoreDecline
- `src/components/funnel/use-portal-funnel-host.ts` — Melde-Zwischenstand
- `src/components/funnel/portal-host/PortalFunnelHostView.tsx` — Hint + Confirm
- `src/components/partner/PartnerAbnahmeAbschlussSheet.tsx` — Zwischenstand
- `scripts/audit-status.mjs` — Metrik + P6-17
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## P6-16 — Dirty-Schutz PortalModalShell

**Commit-Text:** `P6-16: Auto-Dirty PortalModalShell + beforeunload`

**Messung:** `portal_dialoge_ohne_dirtyschutz=0` · P6-16 ✅

**Dateien:**
- `src/lib/portal2/form-dirty.ts` — Auto-Dirty + beforeunload
- `src/components/shared/PortalModalShell.tsx` — Auto-Dirty; Confirm „Änderungen verwerfen?“
- `src/components/shared/PortalEinstellungenUi.tsx` — EinstellungenEditModal ohne Dirty-Override-Blockade
- `scripts/audit-status.mjs` — Metrik + P6-16
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Navigation/Suche Phase A — Inventur (STOPP)

**Commit-Text:** `docs: Navigation/Suche-Inventur Spiegel (Phase A)`

**Datei:** `docs/NAVIGATION-SUCHE-INVENTUR.md`

---

## Benachrichtigungen Phase A — Inventur (STOPP)

**Commit-Text:** `docs: Benachrichtigungen-Inventur Spiegel (Phase A)`

**Datei:** `docs/BENACHRICHTIGUNGEN-INVENTUR.md` (Spiegel CRM)

---

## P7-MOBILE Phase A — Mobile-Audit Befund (STOPP)

**Commit-Text:** `docs: Mobile-Audit Phase A Befund (Spiegel)`

**Messung:** siehe CRM `npm run audit:mobile` · `touch_zu_klein=194` · `horizontal_scroll=0`

**Dateien:**
- `scripts/mobile-audit-playwright.mjs` — Wrapper → baerenwald-system
- `docs/mobile-audit/BEFUNDLISTE.md` + `metrics.json` — Spiegel

---

## P6-15 — Copy-Regeln Portal (Leer/Toast/Sie)

**Commit-Text:** `P6-15: portal-copy + web-copy; Sie-Form; toast/leer=0`

**Messung:** `freie_leertexte=0` · `toast_ohne_copy=0` · `du_im_portal=0` · P6-15 ✅

**Dateien (Kern):**
- `docs/COPY-REGELN.md` — Portal/Website-Verweis
- `src/lib/portal-copy/*` — ACTIONS, EMPTY, TOAST, CONFIRM, COPY_ERROR, `userMessage`
- `src/lib/web-copy` — Website-Du-Ton
- `src/lib/copy/portal-copy.ts` — Re-Export
- `scripts/audit-status.mjs` — drei Zähler + P6-15
- Partner/Portal-UI + Auth-Copy + Mails: Du→Sie
- Toast-Literale → `TOAST.*`; Leertexte → `EMPTY.*`

---

## P6-13 — Website CTAs / fl-Tokens / SiteIcon

**Commit-Text:** `P6-13: CTAButton alle Website-CTAs; Hex→--fl-; SiteIcon`

**Messung:** `website_cta_classes=0` · `website_fl_hex=0` · `website_lucide_files=0` · `website_raw_svg_icon_files=0` · P6-13 ✅

**Kern:**
- `CTAButton` Link+Button + `tone` (hero/final/conversion/viz/guided/card)
- Landing/Leistungen/Handwerker/Ratgeber/GPT/Conversion → CTAButton
- `--fl-*` Tokens; Hex in landing/gpt/conversion-CSS → `var(--fl-*)`
- `SiteIcon` (= PortalIcon); MockIconSvg auf Website-Nav/Galerie/Carousel weg

---

## P5-19 — Schrift / Rundung / Icons / Farben

**Commit-Text:** `P5-19: PortalIcon + Token-Farben (lucide/svg/hex/tw/inline→0)`

**Messung:** `text_px=0` · `rounded_off_token=0` · `lucide=0` · `raw_svg=0` · `bwicon=0` · `hex_code=0` · `tw_std=0` · `inline_static=0` · `important=7` · P5-19 ✅

**Dateien (Kern):**
- `src/components/portal/PortalIcon.tsx` — kanonisch (`n`/`glyph`/`asset`)
- `src/lib/portal2/mock-icons.ts` — ICON_MAP erweitert (Lucide nur hier + MockIcon)
- `src/components/shared/mock-icon-svgs.tsx` — Custom-SVGs (Allowlist)
- `src/components/shared/PortalNavIcon.tsx` / Shell / ListCard — MockIcon→PortalIcon; Lucide-Typen weg
- gelöscht: `src/components/ui/BwIcon.tsx` — Caller → `PortalIcon asset=`
- `scripts/codemod-p5-19-lucide-to-portalicon.mjs` — Lucide→PortalIcon
- `src/lib/tokens/mail-colors.ts` / `palette.ts` / `portal-status-colors.ts` / `brand-preset-colors.ts` — Hex nur unter `/tokens`
- `src/app/globals.css` — Status-/Chip-/`--fl-*` Website-Vars; `!important` ≤7
- `tailwind.config.ts` — `p2.danger*` Tokens
- `docs/PORTAL-PATTERN-KATALOG.md` — Icon-Aktionsliste
- diverse Portal/Funnel/Org/Partner/GPT/Products — Icons + Farben auf Tokens

**Build:** `tsc --noEmit` ✅ · `node scripts/audit-status.mjs` P5-19 ✅

---

## P7-10 Follow-up – PortalFunnelHost Split Typfehler

**Commit-Text:** `P7-10: stepLayout + Situation-Typ nach PortalFunnelHost-Split`

**Dateien:**
- `src/components/funnel/use-portal-funnel-host.ts` — `Situation`-Import; `stepLayout: "page" | "modal"`

**Messung:** `tsc --noEmit` 0 · `npm run build` ✅ · Melde-Funnel lokal durchklickt (bis Abschluss, ohne Absenden)

---

## P6-2 / P6-7 / P6-8 / P6-9 – Primärgrün, Sticky, States, Timeline

**Commit-Text:** `P6-2/7/8/9: Primary-grün, StickyActions, ContentBusy, FlowTimeline`

**Dateien:**
- `docs/P6-2-primary-green.md` — Kanon: `--p2-primary` / `--fl-accent` / WL `--org-primary`
- `src/app/globals.css` — Green-Aliase → Primary-Vars (kein zweites Hex)
- `src/lib/portal2/tokens.ts` — Token-Map an Primary-Vars
- `src/components/shared/PortalContentBusy.tsx` — variant `section` + label
- `src/components/shared/PortalInlineLoading.tsx` — Wrapper um ContentBusy section
- `src/components/portal/auth/PortalAuthBusy.tsx` — Wrapper um ContentBusy inline
- `src/components/partner/PartnerAuftragDetail.tsx` — sticky via PortalDetailStickyActions
- `src/components/partner/PartnerClient.tsx` — PortalInboxEmpty + ActionMenu
- `src/components/portal/PortalClient.tsx` — dito
- `src/components/portal/EigentuemerPortalClient.tsx` — dito
- `src/components/portal/HausmeisterPortalClient.tsx` — dito
- `src/components/org/OrgVorgangAbnahmeSection.tsx` — PortalFlowTimeline
- `scripts/audit-status.mjs` — P6-2/7/8/9 Checks messbar grün
- gelöscht: `VorgangTimeline.tsx`, `PortalAuftragPhasenStrip.tsx`
- Sync: `geld-datum.ts`, `anfrage-akut-schwelle.ts` (shared-domain vom CRM)
- `baerenwald-system/scripts/sync-shared-domain.mjs` — Rewrite `@/lib/format/geld-datum` → shared-domain
- `scripts/check-shared-domain-sync.mjs` — gleiche Rewrite-Regel

**Messung:** `node scripts/audit-status.mjs` P6-2/7/8/9 ✅ · Portal Build ✅

---

## P5-14 – Anzeigetexte Handwerker → Partner

**Commit-Text:** `P5-14: Anzeigetexte Handwerker→Partner via portal-copy`

**Dateien:**
- `src/lib/copy/portal-copy.ts` — Partner-Keys
- `src/lib/portal/ki-assist.ts` — Prompt über `PORTAL_COPY.partner`
- Partner-/Portal-UI-Anzeigetexte → Partner (SEO/Ratgeber/Landing unverändert)

**Messung:** Produkt-UI Anzeige-Handwerker=0 · Portal Build ✅

---

## Block 1 – Messbarkeit

**Commit-Text:** `Audit Block 1: audit-status + TODO-Status + Workflow-Regel`

**Dateien:**
- `scripts/audit-status.mjs`
- `docs/TODO-ENTWICKLUNG.md`
- `docs/OFFENE-FRAGEN.md`
- `docs/COMMIT-PLAN.md`
- `.cursor/rules/auftrag-workflow.mdc`
- `package.json` — `audit:status` + Build-Hook
- `src/lib/portal2/hv-dashboard.ts` — `vorgang_phase` am Lead-Slice (Build-Typfehler)
- `tsconfig.json` — `baseUrl`
- `next.config.mjs` — webpack `@`-Alias
- `src/lib/errors/log-db-error.ts` — ohne Sentry bis Block 2

**Build:** ✅  
**audit-status:** erledigt 3 · offen 19

---

## Block 4 – Portal Patterns (P6)

**Commit-Text:** `Audit Block 4: PortalButton-Guard, portal-toast, Copy DE, Status/Detail/CTA/Rechner`

**Dateien:**
- `scripts/check-portal-btn-warn.mjs` — Guard als Fehler; PortalButton allowlist
- `scripts/audit-status.mjs` — P6-4 zählt PortalButton nicht mit; P6-14 Extraktions-Check
- `src/lib/shared/portal-toast.ts` — einziger `sonner`-Import (+ Toaster-Reexport)
- `src/components/shared/PortalToaster.tsx` — nutzt Wrapper, kein direkter sonner-Import
- `src/lib/copy/portal-copy.ts` — neu, DE-Strings (E7)
- `src/lib/portal2/i18n/catalog.json` — gelöscht
- `src/lib/melden/melde-copy.ts` — umbenannt von melde-i18n (öffentliche Melde-Links)
- `src/components/shared/RoleStatusPill.tsx` — gelöscht; Call-Sites → PortalStatusPill
- `src/components/partner/PartnerDetailUi.tsx` — PartnerDetailSection-Alias entfernt
- Partner-Sections → `PortalDetailCard` (Stammdaten, Kalkulation, Abnahme, …)
- `src/components/funnel/PortalFunnelHost.tsx` — `--p2-` → `--fl-accent` (P6-1)
- `src/components/ui/CTAButton.tsx` — `bare` + `onClick` für Landing-CSS
- Landing/Hero-CTAs → CTAButton; Audit-Klassen `btn-primary`/`cta-btn`/`hero-cta` umbenannt
- `src/components/funnel/BwRechnerPageClient.tsx` — gemeinsame Rechner-Page (`resetPath`)
- `src/app/rechner/page.tsx` · `src/app/portal-tools/rechner/page.tsx` — dünne Routen
- tote `FunnelClient.tsx` (beide Routen) gelöscht
- Labels E5/E6: Actor/Badge „Partner“, Angebot „Angenommen“ unverändert in vorgang-labels
- `docs/OFFENE-FRAGEN.md` — P6-7 Messregel, P6-14 Metrik, Melde-EN
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Build:** ✅  
**audit-status P6:** P6-1/3/4/5/6/10/11/12/13/14 ✅ · P6-2/7/8/9 offen

---

## Block 5 – Status-Wahrheit (Shared-Domain / P2-4+)

**Commit-Text:** `Block 5: shared-domain Sync-Guard, write-*, Status-Vertrags-Tests`

**Portal Dateien:**
- `src/lib/shared-domain/status-map.ts` · `status-vokabular.ts` · `geld-datum.ts` — sync von CRM (nicht editieren)
- `scripts/check-shared-domain-sync.mjs` — Byte-Parität vs. CRM-Manifest
- `scripts/check-status-writes.mjs` · `status-write-allowlist.txt`
- `src/lib/status/write-lead-status.ts` · `write-angebot-status.ts` · `write-auftrag-status.ts` · `write-rechnung-status.ts`
- `scripts/test-status-contracts.ts`
- `package.json` — Guards im build; `guard:shared-domain`; `test:status-contracts`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Hinweis:** Resolver-Fork bleibt (`crm-vorgang`); Mapping `portal2/status-mapping.ts` portal-only (E4). CRM-Docs P2-1/P2-7/P2-8.

**Messung:** P2-4 ✅ · `npm run test:status-contracts` · Build-Guards grün

---

## Block P4-1 – logDbError Reads

**Commit-Text:** `P4-1: logDbError an stillen Supabase-Reads (Rückgabe unverändert)`

**Portal Dateien:**
- `scripts/p4-1-add-log-db-error.mjs` — Codemod (eindeutige `__dbErr*`-Aliasse, bestehende `error`-Bindings unverändert)
- `src/lib/errors/log-db-error.ts` — Helper (bereits vorhanden)
- ~180 Dateien unter `src/app/**` + `src/lib/**` — `if (…) logDbError(...)` nach Queries ohne Control-Flow-Änderung
- `docs/TODO-ENTWICKLUNG.md` · `docs/COMMIT-PLAN.md`

**Messung:** `logDbError_calls=804` · P4-1 ✅ · `tsc` ✅

---

## Block P4-3 – Website-Mail → email_log Ergebnis

**Commit-Text:** `P4-3: sendBrandedMail schreibt gesendet/fehler in email_log`

**Portal Dateien:**
- `src/lib/email/send-branded-mail.ts` — Prod + Catcher: `status: gesendet|fehler` via `insertEmailLogRow`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Messung:** Prod-Resend-Pfad loggt wie Catcher; Fehlschläge mit `fehler_nachricht` (CRM-E-Mail-Log sichtbar)

---

## O5 — PDF via CRM (kein Chromium / pdf-lib in Portal-src)

**Commit-Text:** `O5: renderPdfViaCrm; Portal-pdf-lib-Generatoren gelöscht`

### Portal Dateien
- `src/lib/pdf/render-via-crm.ts` — neu; POST CRM `/api/pdf/render` + Bearer
- `src/lib/partner/partner-dokument-types.ts` — Typen + Nummern-Helfer (ohne pdf-lib)
- Call-Sites → `renderPdfViaCrm`: melde-aushang, versammlungsbericht, bericht, bautagebuch-versicherung, ensure-versicherungsakte, partner-auto-dokumente
- `scripts/generate-sample-aushang-pdf.ts` — nutzt CRM-Client
- `.env.example` — `PDF_SERVICE_SECRET=`
- **gelöscht:** generate-melde-aushang/versammlungsbericht/eigentuemer-bericht/versicherungsakte/bautagebuch-versicherung-pdf, generate-partner-dokument-pdf, aushang-image-png
- `pdf-lib` bleibt in package.json (nur `scripts/design-audit-pdf.mjs`)

**Messung:** `src/` 0× `pdf-lib` · 0× gelöschte Generator-Imports

