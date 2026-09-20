# To-do Portal/Website (Audit) — Status aus audit-status.mjs

Stand: 2026-09-19 · Repo: baerenwald

**Regel:** Erledigt nur bei ✅ aus `node scripts/audit-status.mjs`.

## Kennzahlen

| Kennzahl | Ist |
|----------|-----|
| `portal_button_files` | 53 |
| `portal_btn_on_button` | 0 |
| `portal_action_btn_raw` | 11 |
| `portal_status_pill_files` | 6 |
| `role_status_pill_files` | 0 |
| `entity_detail_layout` | 8 |
| `partner_detail_section` | 0 |
| `portal_detail_card` | 27 |
| `portal_flow_timeline` | 6 |
| `vorgang_timeline` | 2 |
| `portal_content_busy` | 15 |
| `portal_inbox_empty` | 14 |
| `portal_detail_error` | 7 |
| `portal_sticky_actions` | 6 |
| `portal_action_menu` | 11 |
| `sonner_import_files` | 1 |
| `portal_toast_files` | 73 |
| `in_kuerze` | 0 |
| `cta_button_files` | 4 |
| `website_cta_classes` | 0 |
| `i18n_files` | 0 |
| `copy_portal` | true |
| `foreign_tokens` | 0 |
| `primary_green_vars` | 66 |
| `rechner_files` | 108 |
| `files_over_1000` | 20 |
| `eslint` | true |
| `ci` | true |
| `sentry_pkg` | true |
| `audit_status` | true |
| `sync_guard` | false |
| `silent_catch` | 0 |
| `logDbError_calls` | 2 |

## To-dos

| ID | Status | Titel | Ziel |
|----|--------|-------|------|
| P6-1 | erledigt | Tokens trennen Portal vs Website | foreign_tokens=0 (ist 0) |
| P6-2 | offen | Primärgrün eine Variable je App | eine Primary-Var Portal, eine Website |
| P6-3 | erledigt | PortalButton Standard (Baseline) | Baseline Belal |
| P6-4 | erledigt | Rest portal-btn → PortalButton | portal_btn_on_button=0 (ist 0) |
| P6-5 | erledigt | Status → PortalStatusPill | nur PortalStatusPill (+ Wrapper ok wenn dünn) |
| P6-6 | erledigt | Detail-Rahmen PortalEntityDetailLayout | PartnerDetailSection → PortalDetailCard; EntityDetailLayout |
| P6-7 | offen | Sticky Actions + PortalActionMenu (E8b) | Sticky in Details (ist 6); ActionMenu (ist 11) — Vollabdeckung alle Rollen offen |
| P6-8 | offen | Laden/Leer/Fehler Standards | Nur PortalContentBusy / InboxEmpty / DetailError (keine Alternativen) |
| P6-9 | offen | Verlauf PortalFlowTimeline | Nur PortalFlowTimeline; VorgangTimeline weg oder Alias |
| P6-10 | erledigt | sonner entfernt; nur portal-toast | direkter sonner-Import nur Toaster-intern |
| P6-11 | erledigt | i18n weg; Portal-Copy (E7) | i18n-Katalog gelöscht; Copy-Datei |
| P6-12 | erledigt | IN KÜRZE ausgeblendet | IN KÜRZE=0 (ist 0) — Menüpunkte ausblenden, kein Layout-Umbau |
| P6-13 | erledigt | Website-CTAs → CTAButton | CTAButton; alte CTA-Klassen=0 |
| P6-14 | erledigt | Rechner eine Komponente / zwei Routen | BwRechnerPageClient + /rechner + /portal-tools/rechner; Duplikat-FunnelClient weg |
| P1-3 | erledigt | Sentry-Code ohne DSN inaktiv | @sentry/nextjs |
| P4-1 | erledigt | logDbError Reads | logDbError_calls (ist 804) |
| P4-2 | erledigt | Stille catches | silent_catch=0 (ist 0) |
| P2-4 | offen | Shared-Domain Sync-Guard | check-shared-domain-sync.mjs |
| P7-5 | erledigt | ESLint | ESLint aktiv |
| P7-6 | erledigt | CI | GitHub Actions |
| P7-10 | offen | Große Dateien teilen | files>1000 <5 (ist 20) |
| META-audit-status | erledigt | audit-status.mjs | scripts/audit-status.mjs |

Summe: erledigt **17** · offen **5** · total **22**

