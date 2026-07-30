# Portal Surface-Optimierung — IST / SOLL

Stand: Juli 2026  
Bezug: CRM-Muster (mobil Bottom Sheet · Desktop Side-Over) · Portal-SoT [`PORTAL-UMSETZUNGSPLAN.md`](./PORTAL-UMSETZUNGSPLAN.md) Block B (`P2-04`, `P8-02`) · Audit [`PORTAL-ALLTAG-AUDIT.md`](./PORTAL-ALLTAG-AUDIT.md) · UX-Stand [`PORTAL-UX-STAND.md`](./PORTAL-UX-STAND.md)

**Geltung:** Kundenportal `/portal` · Partner `/partner` · HV Org-Portal · Melde (nur wo Overlay)  
**Nicht im Scope:** Eigentümer-Portal (No-Go) · CRM DocumentCanvas / DocActionBar · Auth-Screens

---

## Leitregel (einmal lernen)

| Kontext | Mobil | Desktop |
|--------|--------|---------|
| **Edit** (Formular, wenige–viele Felder) | Bottom Sheet | **Side-Over** |
| **Confirm / ⋯ / Filter** | kurzes Bottom Sheet | Popover / Context-Menu |
| **Funnel / Wizard** (Create, Objekt-Wizard, Abschluss-Flow) | Fullscreen oder großes Sheet | Center-Modal / Fullscreen ok |
| **Preview** (PDF, QR, Doc) | Sheet / Fullscreen | Side-Over oder Viewer-Panel |
| **Detail lesen** | Fullscreen + **eine** Action-Leiste | Stack + Sticky optional |

Heute: `PortalModalShell` = mobil Sheet ✅ · Desktop **zentriert** ❌.  
Ziel: Shell um Varianten erweitern (CRM-`EditorSheet`-Analog), nicht 15 Sonder-Modals.

---

## Phase 0 — Fundament (einmal, alles hängt dran)

| # | Stelle | IST | SOLL | Nutzen Nutzer |
|---|--------|-----|------|----------------|
| 0.1 | `PortalModalShell` | ✅ Varianten `edit` · `confirm` · `funnel` · `preview` live | — | Ein Verhalten überall |
| 0.2 | Dirty + Back | ✅ `dirty` + Discard-Confirm; History-Back fängt Overlay | — | Kein Datenverlust; Back schließt Sheet zuerst |
| 0.3 | `PortalMobileBottomSheet` | ✅ gelöscht (tot); Shell ist SoT | — | Kein Parallel-Muster |
| 0.4 | `_mobileDetailOpen` | ✅ Entscheidung: **Fullscreen-Replace** (nicht Sheet); toter State entfernt — Detail = `selectedId` | Chrome-Hide BottomNav folgt in 4.1 | Klarer Zurück-Pfad |

**Abnahme:** Eine Shell, drei Layouts; Stichprobe Partner-Leistung, Kunden-Confirm, HV-Settings.

---

## Phase 1 — Handwerker (`/partner`) — höchster Alltagsnutzen

| # | Stelle / Datei | Status |
|---|----------------|--------|
| 1.1 | Leistung dokumentieren | ✅ Shell `edit` |
| 1.2 | Abschluss / Abnahme | ✅ `funnel` (mobil Fullscreen) + Dirty ab Schritt 2 |
| 1.3 | Doc-Vorschau | ✅ `preview` |
| 1.4 | Confirms | ✅ `confirm` ActionSheet-Layout |
| 1.5 | Preis bearbeiten | ✅ Shell `edit` |
| 1.6 | Firmendaten / Stamm-Docs | ✅ `edit` (Einstellungen + Upload) |
| 1.7 | Termine / Rückfrage · `P2-01` | offen (Feature + Shell beim Bau) |
| 1.8 | Listen-Filter / Zeilen-⋯ | offen |

---

## Phase 2 — Kunden (`/portal` Privat/Gewerbe)

| # | Stelle / Datei | IST | SOLL | Nutzen Nutzer |
|---|----------------|-----|------|----------------|
| 2.1 | Neue Anfrage · `PortalCreateFunnelModal` | Shell `funnel` (groß, center) | **Bleibt funnel** (Fullscreen mobil ok) | Create braucht Raum — nicht zu Side-Over zwingen |
| 2.2 | Angebot annehmen · `PortalConfirmDialog` in `PortalVorgangDetail` | Volles Modal | Kurzes Confirm-Sheet / Side-Panel | Schneller Entscheiden, klarer Fokus |
| 2.3 | Angebot ablehnen · `P2-05` (fehlt) | — | Confirm + optional Kurzgrund im `edit`-Sheet | Self-Service ohne Support-Anruf |
| 2.4 | Profil Settings · `PortalEinstellungenPrivat` (+ Mieter-Telefon) | Stift → Center-Modal | Side-Over desktop · Sheet mobil | Weniger „Admin-Feeling“, mehr App |
| 2.5 | Konto/Sicherheit · `PortalKontoSicherheitPanel` | Shell-Modals | `edit` / `confirm` je Job | Passwort/E-Mail ohne Layout-Bruch |
| 2.6 | Detail mobil · Sticky + BottomNav | Zwei Fußleisten möglich | Eine Action-Leiste; Nav aus oder Back (`P2-04`) | Daumen trifft die eine Primary |

**Einschätzung Phase 2:** Kunden brauchen vor allem Klarheit („was jetzt?“) und sichere Confirms — weniger Oberflächen-Dramatik als Partner, aber Ablehnen + eine Primary sind Vertrauensthemen.

---

## Phase 3 — Hausverwaltung (Org-Portal)

| # | Stelle | Status |
|---|--------|--------|
| 3.1 | Neue Anfrage Hub | ✅ `funnel` |
| 3.2 | Objekt-Wizard | ✅ `funnel` |
| 3.3 | QR / Melde-Material | ✅ Shell `preview` |
| 3.4 | Einladen | ✅ Shell `edit` |
| 3.5 | Mieterwechsel OK | ✅ Shell `confirm` |
| 3.6 | Servicepakete OK | ✅ Shell `confirm` |
| 3.7 | Branding / Freigabe-Regeln | ✅ `EinstellungenEditModal` → `edit` |
| 3.8 | Storno | ✅ `edit` + Danger-Primary |
| 3.9 | Objekt-⋯ / Mieter-⋯ | ✅ ActionSheet `confirm` |
| 3.10 | Eingang Detail mobil | ✅ `hideMobileChrome` (4.1) |

---

## Phase 4 — Chrome & Querschnitt (alle Rollen)

| # | Thema | Status |
|---|--------|--------|
| 4.1 | Detail-Chrome `hideMobileChrome` | ✅ |
| 4.2 | Interaktions-Kit-Doc | ✅ [`PORTAL-INTERAKTIONS-KIT.md`](./PORTAL-INTERAKTIONS-KIT.md) |
| 4.3 | Primary-Matrix | ✅ SoT [`PORTAL-PRIMARY-MATRIX.md`](./PORTAL-PRIMARY-MATRIX.md) — Screen-Audit folgt |
| 4.4 | Breakpoint | ✅ `breakpoints.ts` · `useIsPortalMobile` · lg = 1024 |
| 4.5 | Copy Buttons/Hints | offen (screenweise) |

---

## Bewusst nicht ändern

| Thema | Warum |
|-------|--------|
| Funnel Create / Objekt-Wizard | Brauchen Breite & Steps → Center/Fullscreen bleiben richtig |
| Melde-Token-Status (Mieter ohne Login) | Eher Fullscreen-Steps als Side-Over |
| Eigentümer-Portal | Produkt-No-Go |
| CRM Canvas / Positions-Picker | Portal hat keinen Dokument-Editor |

---

## Reihenfolge & Aufwand (grob)

```text
Phase 0  Fundament Shell + Dirty/Back     ~2–4 T  ← Blocker
   └─ Phase 1  Partner Hochfrequenz         ~3–5 T  ← größter Nutzer-Impact
   └─ Phase 2  Kunden Confirms/Settings     ~2–3 T
   └─ Phase 3  HV Overlays                  ~3–4 T
   └─ Phase 4  Chrome/Primary/Breakpoint    parallel ab Phase 0/1
```

Empfohlene erste Bau-Welle (nach Freigabe dieses Plans):

1. Shell-Varianten `edit | confirm | funnel | preview`  
2. Partner Leistung (1.1) + Confirm (1.4) als Pilot  
3. Detail eine Action-Leiste (4.1)  
4. Rest Migration nach Mapping oben  

---

## Definition of Done — je Stelle

1. Layout folgt Leitregel (Tabelle oben)  
2. Mobil: Edit/Confirm = Bottom Sheet (kein Center)  
3. Desktop Edit/Preview = Side-Over (außer `funnel`)  
4. Dirty-Dismiss + Back schließen Overlay korrekt  
5. Eine Primary sichtbar wo Detail betroffen  
6. Stichprobe Desktop **und** Mobile abgenommen  

---

## Kurzfazit Nutzen

| Zielgruppe | Was sich spürbar verbessert |
|------------|-----------------------------|
| **Handwerker** | Schneller dokumentieren mit Auftrag im Blick; Confirms ohne Modal-Theater; Filter/⋯ mit dem Daumen |
| **Kunden** | Eine klare Aktion am Vorgang; Annehmen/Ablehnen ohne Verwirrung; Settings wie eine App |
| **HV** | Edits neben Liste/Objekt; Freigabe mobil ohne doppelte Fußleiste; einheitliche QR/Einladen-Fläche |
| **Team** | Ein Kit statt N Modal-Sonderwege — schneller und konsistenter weiterbauen |

---

## Übernahme aus CRM-Audits (Filter Juli 2026)

Quelle: CRM Themenkarte „alle Audits vs. Spec/Lexware“.  
Regel: **Muster ja · CRM-Jobs nein.** Lexware-Farben/Inter/OCR/Document-Canvas bewusst streichen.

### Schon im Portal-Plan / Umsetzungsplan → nur verknüpfen

| CRM-Thema | Portal-Äquivalent | Ticket / Phase |
|-----------|-------------------|----------------|
| My Work / Tages-Inbox statt Charts | Inbox-first Dashboard | `P2-10` · Block G |
| „Als Nächstes“ / Status→Schritt | Primary/Banner-Matrix | `P3-08` · Phase 4.3 |
| Angebot: Annehmen vs Ablehnen (+ Zustände) | Kunde Confirm + Ablehnen | `P2-05` · Phase 2.2–2.3 |
| Container: Dokument/Fullscreen · Stammdaten Sheet | Leitregel Edit/Funnel/Preview | Phase 0 + Leitregel |
| Nested Sheets / Sheet-Höhen | Shell-Varianten + Dirty/Back | Phase 0.1–0.2 |
| Sticky Bottom Surface / Thumb-Zone | Eine Action-Leiste Detail | `P2-04` · Phase 4.1 |
| Ein Modal/Empty/DetailShell SoT | `PortalModalShell` konsolidieren | Phase 0 + `P8-02` |
| Aktionen entschlacken · ein Primary · Danger im ⋯ | Primary-Matrix + Confirm kurz | `P3-08` · 1.4 · 3.8 |
| Phase-Filter mobil = Segmente, keine Chips | Listen-Filter → Sheet / Segment | Phase 1.8 · Nordstern Listen |
| Desktop flat / Mobile Card | Detail-Tabs auditieren (Partner/HV) | nach Phase 1 Pilot |
| Abnahme Fullscreen, Abschluss nicht erzwingen | Partner Abschluss-Chrome | `P4-04` · Phase 1.2 |

### Neu berücksichtigen (noch dünn im Surface-Plan)

| # | CRM-Muster | Portal-Übersetzung | Nutzen | Prio |
|---|------------|--------------------|--------|------|
| N1 | Guidance-Map (nicht nur Primary-Button) | Pro Rolle kurze „Als Nächstes“-Zeile/Banner nur wenn ≠ Sticky-Primary | Orientierung ohne Dauer-Noise | P0 |
| N2 | Header-Zustände Angebot (Senden/Annehmen/Nachfassen/Ablehnen) | Kunde+HV: sichtbarer Vorgangs-Zustand + eine Primary; Ablehnen nicht verstecken | Self-Service ohne Support | P0 |
| N3 | ⋮-Hierarchie + Disclosure (weniger Boxen) | Partner Leistung/Docs, HV Objekt-⋯: max. 1 Primary sichtbar, Rest Sheet/Popover | Weniger Klick-Chaos | P0 |
| N4 | Create: schwerer Prefill vor Wizard vermeiden | HV/Kunde Create: Kunde/Objekt möglichst erstes Sheet im Flow, nicht Vorab-Gate | Weniger Abbruch | P1 |
| N5 | Success-Toast grüner Fill · einheitliche Toasts | `PortalToaster` / `portal-toast` angleichen („Gespeichert“, Fehler kurz) | Feedback sofort lesbar | P1 |
| N6 | Hairline 0.5px · Token-Shadows · kein `#fff` Hardcode | Portal-Tokens (`--p2-*`) + Shell/Panels auditieren | Ruhigere, konsistente Oberfläche | P1 |
| N7 | Finance-Zahlen: Mono, rechts, € | Partner Konditionen/Preise, HV Beträge, Kunden-Rechnungssummen | Geld auf einen Blick | P1 |
| N8 | Werkzeug-Panel: Titel · Zweck · Primär · Erweitert | Partner Auftrag-Sections, HV Objektakte-Blöcke | Sections lesbar statt Aktions-Salat | P1 |
| N9 | Danger-Zone-Regel (Storno) | HV `VorgangStornoDialog` + Partner Absagen: rot nur im Confirm | Weniger Fehlklicks | P1 |
| N10 | Typo-Skala / weniger Micro-Sizes | Portal Copy-Budget + Font-Stufen (nicht Inter) | Lesbarkeit mobil | P2 |
| N11 | Tab-Anzahl kürzen / „Mehr“ | HV Objektakte 8 Tabs → prüfen; Partner Detail Tabs | Weniger Suchen im Detail | P2 |

### Bewusst nicht übernehmen (CRM-only)

| Thema | Warum Portal irrelevant |
|-------|-------------------------|
| My Work Charts→Inbox **im CRM** | anderes Produkt — nur das **Muster** Inbox-first (`P2-10`) |
| Korrektur-Modus ≠ Neu-Angebot-Wizard | Portale editieren keine Angebote |
| Zahlung-Tab flach · Rate korrigieren · Σ RE > VK | CRM Finance; Portal nur Anzeigen/Zahlen falls Rechnung sichtbar |
| Lexware Sheet-Kette Rechnung / FAB Create CRM | anderes Create-Modell; Portal = Funnel + FAB-Anfrage |
| Partner anfragen (CRM-Anker) | CRM-intern; Portal hat eigenen Partner-Flow |
| Auftrag stornieren UI CRM | HV hat Storno — nur Danger-Muster übernehmen |
| Combobox / Date-Presets / Masken Spec F | nur wenn Portal-Formen es brauchen (Settings/Einladen) |
| Assistent-Lila · Lexware-Farben · grauer Canvas · OCR | Marken/Scope-No-Go |
| Abnahme-Muster-PDF / 7-Schritt-Wizard Inhalt | CRM/PDF; Portal = Einstieg/Fullscreen-Chrome (`P4-04`) |

### Empfohlene Portal-Priorität (breit, analog CRM A–E)

Nicht nur „Sheet vs Side-Over“. Reihenfolge:

| Welle | Inhalt | Deckt |
|-------|--------|--------|
| **A** | Guidance + Zustands-Primary (Kunde Angebot, HV Freigabe, Partner Durchführung) + Inbox-first | N1–N2 · `P3-08` · `P2-10` · `P2-05` |
| **B** | Surface-Kit (Sheet/Side-Over/Confirm) + eine Bottom-Leiste + ⋮ entschlacken | Phase 0–1 · N3 · `P2-04`/`P8-02` |
| **C** | Create ohne Vorab-Gate · Nested Edit-Sheets | N4 · Phase 2.1 / 3.1 |
| **D** | Toast · Finance-Zahlen · Hairline/Tokens | N5–N7 |
| **E** | Typo · Tab-Kürzung · Abnahme-Feinschliff | N10–N11 · `P4-04` |

**Drei Schichten (Portal):**

1. **Jobs & Guidance** — Inbox, Status→eine Aktion, Annehmen/Ablehnen, Storno-Danger  
2. **Surfaces & Create** — Container-Regeln, Shell-Varianten, Bottom-Surface, Flat/Card  
3. **Craft & Tokens** — Toast, Hairline, Mono-€, weniger Micro-Typo
