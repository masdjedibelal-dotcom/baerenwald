# Design-Gap-Analyse: Portale-Mockup vs. Live

Stand: Juli 2026  
**Design-Referenz:** `Portale-Mockup.dc.html` / `Baerenwald Portale.html` (Claude Design)  
**Live-Repo:** `handwerks-plattform`  
**Verwandte Docs:** [VORGANG_STATUS_ROLE_MAPPING.md](./VORGANG_STATUS_ROLE_MAPPING.md) · [WAVE_WHITELABEL_KOMMUNIKATION.md](./WAVE_WHITELABEL_KOMMUNIKATION.md)

---

## Grundsatz: Portal-Mock ≠ verbindliche Spec

| | CRM-Mockup | Portal-Mockup (Claude Design) |
|--|------------|-------------------------------|
| Rolle | Verbindliche UI-Referenz | **Optik-Inspiration** |
| Bei Widerspruch | Mock führt | **Live-Funktionalität + Resolver-Spec** gewinnen |
| Übernahme | Vollständig | Nur gemäß Gap-Tabelle (NEU / BEARBEITEN / LÖSCHEN) |

**Nicht übernehmen:** Demo-Rollen-Umschalter, 8-Status als separates Datenmodell, Eigentümer-Portal, Mieter-Login „MeinBärenwald“, Termin-Slot-Buchung im Melde-Wizard.

**Live kann mehr als Design:** z. B. **8 Objektakte-Tabs** — Design nachziehen, nicht kürzen.

---

## Produktentscheidungen (fix)

| # | Thema | Entscheidung |
|---|--------|--------------|
| 1 | **Mieter-Timeline** | **4 Phasen (Live)** — Eingegangen → In Bearbeitung → Beauftragt → Erledigt. Abnahme intern, nicht sichtbar. Design 5-Phasen-Timeline anpassen. |
| 2 | **Termin** | **Zweistufig:** (A) **Wunschtermin/Verfügbarkeit** im Melde-Wizard (Rechner-Optik, ohne Preis); (B) **verbindliche Slot-Bestätigung** auf Status-Seite nach Freigabe/Disposition. Kein gebuchter Slot bei Meldung. |
| 3 | **MeinBärenwald Mieter** | **Streichen** für HV-Mieter. Einziger Zugang: Token-Status-Link (+ Melden/Ergänzen). **Direktkunden-Portal** (`portal_modus=privat`) bleibt Bärenwald-branded. Kein WL-Mieter-Login mocken, kein GPT für Mieter. |
| 4 | **Eigentümer-Portal** | **No-Go.** PDF-Jahresbericht bleibt Backend-only. Aus Design-Scope. |
| 5 | **Status** | **Resolver-führend.** Mapping-Tabelle → [VORGANG_STATUS_ROLE_MAPPING.md](./VORGANG_STATUS_ROLE_MAPPING.md). Design-8-Status = Meilensteine der 4 Phasen. `plattform-status.ts` / `kunde-vorgang-status.ts` mittelfristig nur Mapping-Konsumenten. **P0-2 Status-Design-System erst nach Mapping-Freigabe.** |

**Rechnung Mieter:** Option A — Rechnung immer an HV, kein Mieter-Mahnwesen ([WAVE_WHITELABEL_KOMMUNIKATION.md](./WAVE_WHITELABEL_KOMMUNIKATION.md)).

---

## Rückfrage geklärt: Wunschtermin im Meldeformular

| Ebene | Stand |
|-------|--------|
| **Backend** | ✅ `POST /api/meldung` akzeptiert `dringlichkeit`; `persistMeldungLead` schreibt `leads.zeitraum` (`sofort`, `diese_woche`, `flexibel`, …) |
| **UI Melde-Wizard** | ❌ **Kein Schritt** — `MeldeFormular.tsx` sendet `dringlichkeit` nicht; nur Kategorie-Default via `meldeKategorieToZeitraum()` |
| **Rechner-Flow** | ✅ Volle Dringlichkeits-/Zeitraum-Abfrage (`useFunnelState`, `/portal-tools/rechner`) |

**Folge:** Wunschtermin-Screen im Mock = **NEU** (Wizard-Step + API-Anbindung). Kein neues DB-Feld nötig — `leads.zeitraum` reicht. **Implementierung:** Step überspringbar; gewählte Verfügbarkeit überschreibt `meldeKategorieToZeitraum()`, sonst Kategorie-Default.

---

## Kurzfazit

| Bereich | Gap |
|---------|-----|
| Status-Modell | Kritisch — Design-Layer muss auf `resolveVorgang()` mappen ([Mapping-Doc](./VORGANG_STATUS_ROLE_MAPPING.md)) |
| Layout-Shell | Groß — dunkle Sidebar, FAB, Tokens |
| Mieter WL | Groß — Org-Farben, Leak-Fix, Wunschtermin-Step |
| HV-Portal | Mittel — Timeline auf Detail, Nav-Labels |
| Partner | Mittel — Kalk-Layout, HV-Hinweis |
| Objekte | Live **mehr** als Design (8 Tabs) — Design nachziehen |

---

## 1. Status-Modell (kritischer Bruch)

### Live: mehrere parallele Systeme

| System | Keys | Einsatz |
|--------|------|---------|
| `resolveVorgang()` | 4 Phasen + Unterstatus | Kanonisch (CRM-Parität) |
| `plattform-status.ts` | neu, wartet_freigabe, … | HV Freigabe-Liste |
| `kunde-vorgang-status.ts` | eingegangen … abgelehnt | Kunden-Portal |
| `vorgang-phase.ts` | Mieter 4 Stufen | Token-Status |
| Partner-Labels | Aktion nötig, Geändert, … | Partner-Listen |

### Ziel

```
resolveVorgang(input)  →  roleStatus(role, resolved)  →  UI (Pill, Timeline, Hint)
```

**NEU:** `src/lib/crm-vorgang/role-status.ts`  
**DEPRECATE (schrittweise):** direkte Label-Nutzung aus Legacy-Modulen  
**DESIGN:** 8-Meilenstein-Legende nur als Designer-Referenz — implementiert als Mapping, nicht als DB-Felder

---

## 2. Design-System & Shell

| Design | Live | Aktion |
|--------|------|--------|
| Canvas `#e6e8e6`, weiße Panels | `#f4f4f3`, `--surface-muted` beige | **BEARBEITEN** Tokens |
| Sidebar `#1A3D2B` 212px | Weiße Sidebar / Card-Nav | **NEU** `PortalShell` |
| System-Font | Plus Jakarta + Lora | **BEARBEITEN** `.portal-ui` |
| Mobil FAB 52px | Kein FAB; HV „Neue Anfrage“ auf Übersicht | **NEU** mocken + bauen |
| Farbe nur in Pills | Orange/Rot/Blau Pills + linke Listen-Akzente | **BEARBEITEN** / **LÖSCHEN** Akzente |

**Designer kann sofort:** P0-1 PortalShell, P0-3 Mieter-WL (ohne Status-Legende).

---

## 3. Mieter White-Label

| Screen | Live | Aktion |
|--------|------|--------|
| Objektwahl / Wizard | Org-Logo teils | **BEARBEITEN** — Org-`primary` CSS-Vars |
| Wunschtermin | Backend ja, UI nein | **NEU** Wizard-Step (Rechner-Optik) |
| Status-Slots | ✅ verbindliche Termine | **BEARBEITEN** WL-Copy |
| Bestätigung / Footer | Bärenwald-Leak | **BEARBEITEN** |
| MeinBärenwald Login | Bärenwald + GPT | **LÖSCHEN** aus Scope (HV-Mieter) |

**Zwei Termin-Screens mocken:**
1. Wizard: „Wann sind Sie erreichbar?“ (Wunsch, unverbindlich)
2. Status: Slot-Liste bestätigen/absagen (wie live)

---

## 4. Hausverwaltung

| Design | Live | Aktion |
|--------|------|--------|
| Dashboard, Vorgänge, Objekte, Servicepakete, Einstellungen | Übersicht, Vorgänge, Objekte, Leistungen, Profil | **BEARBEITEN** Labels; Profil/Einstellungen strukturieren |
| Detail-Timeline | Fehlt in `PortalVorgangDetail` | **NEU** |
| Verlauf-Card | Nur Kommentar-Thread | **NEU** (Kommunikations-Log, optional) |
| Bulk-Auswahl Listen | Nein | **Optional** — nur bei Product-Bedarf |
| Freigabe + Aktiv/Erledigt | ✅ | Layout an Shell |
| Objekt-Wizard 3 Steps | Inline-Form | **Optional** UX-Upgrade |
| 8 Akte-Tabs | ✅ Live | **NEU mocken** (Design fehlt) |

---

## 5. Handwerker / Partner

| Design | Live | Aktion |
|--------|------|--------|
| Kalk-Screen | `PartnerOffenDetail` + Preis-Dialog | **BEARBEITEN** Layout |
| Kein Anlegen | ✅ | — |
| „Im Auftrag der HV“ | Fehlt | **NEU** Banner |
| Abnahmeprotokoll | ✅ | **BEARBEITEN** an Design-Cards |
| GPT mobil in Nav | Live ja | Design: Desktop — **BEARBEITEN** optional |

Bärenwald Partner-Branding bleibt.

---

## 6. Eigentümer — aus Scope

PDF `generate-eigentuemer-bericht-pdf.ts` bleibt API-only. Kein Mock, kein Portal.

---

## 7. Direktkunden-Portal (unverändert)

`portal_modus=privat` → `PortalClient` / MeinBärenwald mit Bärenwald-Branding, GPT, Angebot annehmen. **Nicht** White-Label. Design-Mock für diese Strecke nur bei expliziter Anfrage.

---

## 8. Querschnitt-Komponenten

| Komponente | Aktion |
|------------|--------|
| Status-Pill (4 Farben) | **NEU** nach Mapping — P0-2 |
| `VorgangTimeline` (horizontal) | **NEU** |
| Dokumenten-Viewer Vollbild | **NEU** |
| Zustände leer/404/offline | **NEU** je Rolle |
| Modal/Bottom-Sheet | **BEARBEITEN** Radien/Backdrop |
| Listen-Mehrfachauswahl | **Optional** |

---

## 9. Mockup-Priorität (Designer)

| Prio | Deliverable | Blocker |
|------|-------------|---------|
| **P0-1** | PortalShell (Desktop + Mobile + FAB) | — sofort |
| **P0-2** | Status-Legende + Pills + Timeline | ⛔ **Mapping-Tabelle** ([VORGANG_STATUS_ROLE_MAPPING.md](./VORGANG_STATUS_ROLE_MAPPING.md)) |
| **P0-3** | Mieter WL: Objektwahl, Wizard (+ **Wunschtermin**), Bestätigung, Status, Fehler, Mail | — sofort |
| P1 | HV Vorgänge Liste + Detail + Freigabe | P0-1 |
| P1 | Partner Offen/Kalk + In Bearbeitung + Abnahme | P0-1 |
| P2 | Objektakte 8 Tabs | Live-führend |
| — | Eigentümer, Mieter-Login, CRM | **Nicht mocken** |

---

## 10. Implementierungs-Matrix

| | NEU | BEARBEITEN | LÖSCHEN / Scope raus |
|--|-----|------------|----------------------|
| **Status** | `role-status.ts` | Pills, Mapper | Parallele Label-Hacks (schrittweise) |
| **Shell** | PortalShell, FAB | 3 Portal-Clients | Helle Sidebar-Pattern |
| **Mieter WL** | Wunschtermin-Step, Org-CSS | MeldeFormular, Status, Mails | MeinBärenwald HV-Mieter, GPT Mieter |
| **HV** | Timeline, ggf. Verlauf | Nav, Detail | — |
| **Partner** | HV-Auftrag-Hinweis | Kalk-UI | — |
| **Objekte** | Design für 8 Tabs | Card-UI | — |
| **Wave WL** | siehe Whitelabel-Doc | Templates | Bärenwald-Copy Mieter |

---

## 11. Parallel zum CRM (unverändert)

Portal-Design-Welle (Tokens, Mapping, WL) läuft **parallel** im Portal-Repo. Sie ändert **nicht** die CRM-Reihenfolge Schritt 0 → 1 → 2.

Siehe [WAVE_WHITELABEL_KOMMUNIKATION.md § Abgrenzung](./WAVE_WHITELABEL_KOMMUNIKATION.md#abgrenzung-zum-laufenden-go--crm-reihenfolge).

---

## 12. Abnahme Designer → Dev

- [x] Mapping-Tabelle dokumentiert ([VORGANG_STATUS_ROLE_MAPPING.md](./VORGANG_STATUS_ROLE_MAPPING.md))
- [x] P0-2 Status-Seite: `VorgangTimeline` + `RoleStatusPill` + `role-status-ui.ts`
- [x] Mieter-Timeline 4 Schritte (Token-Status + Resolver)
- [x] Zwei Termin-Screens: Wunsch (Wizard) + Slot (Status)
- [x] Kein Eigentümer-, kein Mieter-Login-Mock
- [ ] Objektakte 8 Tabs mocken (Live-führend)
- [x] P0-1 `PortalShell` — HV-Portal; Partner/Kunde folgen gleiche Komponente
- [x] Phase D Abschluss/Abnahme: Partner-Abschluss + HV-Signatur (`OrgVorgangAbnahmeSection`)
