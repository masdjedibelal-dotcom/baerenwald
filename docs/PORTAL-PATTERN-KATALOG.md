# Portal Pattern-Katalog

Kurzentscheidungen für Portal-UI (Kunde / Partner / HV). Neue Varianten nur nach Freigabe.

## Button

| Kanon | Entscheidung |
|-------|--------------|
| Standard | Komponente **`PortalButton`** (`src/components/portal/PortalButton.tsx`) |
| Klassen | Immer `portal-btn` (Skalierung) + bei Action-CTAs `portal-action-btn` + `--primary` / `--secondary` / `--ghost` / `--danger` / `--block` |
| Alias | **`ActionBtn`** = Re-Export von `PortalButton` |
| Pill (inline) | `PortalButton action={false}` (+ optional `compact`) und `className` mit `btn-pill-*` |
| Sticky / entscheidend | `PortalButton` (Default `action`); CSS-Selektoren auf `.portal-action-btn` bleiben gültig |

`portal-action-btn` ist **kein** zweites System — spezialisierte Action-Variante derselben Familie. Neue Screens: `PortalButton`, keine rohen Klassen-Strings.

Section-Add: `PortalSectionAddButton` (siehe `PortalEinstellungenUi`).

## Timeline

| Kanon | Entscheidung |
|-------|--------------|
| Komponente | **`PortalFlowTimeline`** (`src/components/shared/PortalFlowTimeline.tsx`) |
| Nutzung | Phasen-/Flow-Leiste; z. B. via `PortalAuftragPhasenStrip` |

## Detail-Shell

| Kanon | Entscheidung |
|-------|--------------|
| Entity-Detail | **`PortalEntityDetailLayout`** (`src/components/shared/PortalEntityDetailLayout.tsx`) |
| Seiten-Shell | **`PortalDetailLayout`** (`PortalDetailUi.tsx`) — Kopf/Footer-Kontext |
| Kombination | Detail-Seiten: `PortalDetailLayout` umschließt `PortalEntityDetailLayout` |

## Status

| Kanon | Entscheidung |
|-------|--------------|
| Ableitung | `src/lib/portal2/status-mapping.ts` (`resolvePortalFlowStatus` / FLOW-Chips) |
| Pill-UI | **eine** Komponente: `PortalStatusPill` (`src/components/shared/PortalStatusPill.tsx`) |
| Tone-Helfer | `portalStatusPillClass` / `PortalStatusTone` in `src/lib/shared/portal-status-pill.ts` (Farben via `.role-pill-*`, Design P0-2) |
| Resolver-Semantik | `RoleStatusPill` = dünner Wrapper um `PortalStatusPill` (`semantic` → `tone`) |

Labels nicht frei erfinden — Resolver / `status-mapping` / Label-Quellen.

## Icons (P5-19)

| Aktion | Icon `n` / Asset | Komponente |
|--------|------------------|------------|
| Schließen / Abbrechen | `x` | `PortalIcon` |
| Bestätigen / Erledigt | `check` | `PortalIcon` |
| Speichern / Primär-OK | `check` | `PortalIcon` |
| Hinzufügen | `plus` | `PortalIcon` |
| Bearbeiten | `pencil` | `PortalIcon` |
| Löschen | `trash` | `PortalIcon` |
| Suche | `search` | `PortalIcon` |
| Laden / Busy | `loader` | `PortalIcon` (+ `animate-spin`) |
| Download | `download` | `PortalIcon` |
| Upload | `upload` | `PortalIcon` |
| Info / Hinweis | `info-circle` | `PortalIcon` |
| Warnung | `alert-triangle` | `PortalIcon` |
| Nav (Sidebar/Bottom) | `PORTAL_NAV_ICONS` / Glyph | `PortalNavIcon` → `PortalIcon` |
| Public-SVG (`/public/icons/*.svg`) | `asset="…"` | `PortalIcon` |

Regel: gleiche Aktion = gleiches Icon. Lucide nur in `MockIcon` / `mock-icons`. Custom-SVGs nur in `mock-icon-svgs.tsx` / `situation-icons` / `PdfFileIcon`.

## Loading

| Kanon | Entscheidung |
|-------|--------------|
| Komponente | `PortalContentBusy` (`src/components/shared/PortalContentBusy.tsx`) |
| Default-Titel | „Wird geladen…“ (kein hartes „Portal wird geladen…“ mehr) |
| Varianten | `page` (Route) / `inline` (Shell-Main); inkl. Skeleton-Pulse |

## Empty

| Kanon | Entscheidung |
|-------|--------------|
| Inbox / Panel | `PortalInboxEmpty` (`src/components/shared/PortalEmptyState.tsx`) |
| Seiten-Empty | ggf. `PortalEmptyState` aus PortalStateView — nicht neu erfinden |

## Error

| Kanon | Entscheidung |
|-------|--------------|
| Detail / Inline | `PortalDetailError` (`PortalDetailUi.tsx`) |

## Toast

| Kanon | Entscheidung |
|-------|--------------|
| API | **`portal-toast`** — `@/lib/shared/portal-toast` (`portalToastSuccess` / `Error` / Rollen-Helper) |
| Runtime | Sonner nur intern (`PortalToaster` + Import in `portal-toast.ts`) |
| Begründung | ~70 Call-Sites über `portal-toast`, direkter `sonner`-Import nur Toaster + Wrapper |

Keine parallelen Toast-APIs; Copy aus den Helpern, nicht ad-hoc.

## Tokens

| Fläche | Prefix |
|--------|--------|
| Portal (`.portal-ui`) | `--p2-*` (+ ggf. `--org-*` White-Label) |
| Website / Marketing / Funnel-Landing | `--fl-*` |

**Keine Vermischung** von `--p2-` und `--fl-` in derselben Oberfläche. Keine neuen Hex nahe Markengrün außerhalb Tokens.

## Modals / Sheets

Bestehend: `PortalModalShell` / bestehende Sheets — keine dritte Modal-Variante.

## Detail-Shell / Timeline

| Kanon | Entscheidung |
|-------|--------------|
| Entity-Detail | **`PortalEntityDetailLayout`** / `PortalDetailLayout` (`PortalDetailUi`) |
| Flow-Timeline | **`PortalFlowTimeline`** (+ `PortalAuftragPhasenStrip`) |
| Step-Dots | `VorgangTimeline` nur wo Design-P0-2 es verlangt |

## Batch-Status

| Batch | Stand |
|-------|-------|
| P6 Buttons | ✅ Roh-`portal-btn` auf `<button>` → `PortalButton` (0 Rest); Guard `check-portal-btn-warn.mjs` |
| Timeline/Shell | ✅ im Katalog dokumentiert |
