# Commit-Plan (Portal — Mega-Auftrag Audit)

Belal committed über GitHub Desktop auf **staging**.

---

## Fix — Partner/Portal Foto-Picker iOS (Update + einheitlich) — 2026-09-28

**Commit-Text:** `fix(portal): iOS Foto-Picker ohne multiple + Fehler bei leerer Auswahl`

**Symptom:** Handwerker-Update — Foto gewählt, keine Thumbnails, Speichern ohne Bild.

**Ursache:** `<input multiple>` + Kamera auf iOS liefert oft leere FileList; Picker brach still ab → Datei nie im State → kein Upload.

**Fix (einheitlich):**
- `allowMultipleFilePicker(isMobile)` — mobil kein `multiple` am File-Input (Drag & Drop weiter mehrfach)
- Leere Auswahl → sichtbarer Fehler (Toast-Copy)
- Angewendet auf: `PartnerMultiFotoSlot`, `PartnerDirektKameraSlot`, `FileUploadField`, `PortalDokumentUploadZone`, `PhotoUpload`, `PartnerFachdokuSlots`

**Dateien:** `file-picker.ts` · `PartnerMultiFotoSlot.tsx` · `PartnerDirektKameraSlot.tsx` · `FileUploadField.tsx` · `PortalDokumentUi.tsx` · `PhotoUpload.tsx` · `PartnerFachdokuSlots.tsx` · `toast.ts` · `COMMIT-PLAN.md`

---

## Fix — Regie Start/Ende: stilles OK ohne Speichern — 2026-09-28

**Commit-Text:** `fix(portal): Regie-Kamera-File aus State + Toast bei Validierung`

**Symptom (Frohberger):** Foto erfasst → OK → nichts passiert, keine Fehlermeldung.

**Ursache:**
1. `PartnerDirektKameraSlot` setzt `input.files` per DataTransfer — auf iOS oft leer → FormData ohne Foto → Client-Validierung bricht ab.
2. Validierungsfehler nur als Feldfehler, **ohne Toast** → wirkt wie „nichts passiert“.

**Fix:** File + Capture-Zeit im Sheet-State (`onCaptured`); vor Submit ins FormData; bei Validierungsfehlern Toast mit erstem Fehler.

**Dateien:** `PartnerPositionLebenszyklusList.tsx` · `COMMIT-PLAN.md`

---

## Fix — Partner-Fotos bei Update/Abschluss — 2026-09-28

**Commit-Text:** `fix(portal): Partner-Fotos aus Multi-Slot und Regie-Ende zuverlässig mitsenden`

**Symptom (Frohberger):** Foto hochladen / Update / Abschluss scheitert.

**Ursache:** `PartnerMultiFotoSlot` hält Dateien nur im React-State. Beim Submit wurden sie nur bei **Nicht-Regie** nach `fotos` kopiert — bei Regie-**Update** gingen Fotos verloren. Server sah keine Datei → Fehlermeldung.

**Fix:** State-Fotos immer ins FormData; `foto_ende`/`foto_start` früh auf `foto` mappen; Server akzeptiert zusätzlich `foto_ende`/`foto_start`.

**Dateien:** `PartnerPositionLebenszyklusList.tsx` · `partner-position-eintraege.ts` · `COMMIT-PLAN.md`

---

## Fix — Shared-Domain-Guard auf Netlify/GHA — 2026-09-27

**Commit-Text:** `fix(portal): Shared-Domain-Guard auf Netlify ohne CRM-Sibling überspringen`

**Ursache:** `check-shared-domain-sync` brach ab, weil Netlify (und staging-ci) nur `baerenwald` auschecken — Manifest unter `../baerenwald-system` fehlt.

**Verhalten jetzt:**

| Umgebung | CRM-Manifest fehlt | Ergebnis |
|----------|--------------------|----------|
| Lokal | ja | exit 1 (wie FIX3) |
| Netlify / GITHUB_ACTIONS, `CRM_ROOT` unset | ja | Skip exit 0 |
| Netlify / GHA, `CRM_ROOT` gesetzt aber falsch | ja | exit 1 |

Übrige Build-Guards ohne CRM-Sibling geprüft — nur dieser Guard war betroffen.

**Datei:** `scripts/check-shared-domain-sync.mjs` · `docs/COMMIT-PLAN.md`

---

## FIX7 — Positionen als Partner-Aufgabe gruppiert — 2026-09-26

**Commit-Text:** `feat(portal): Positionen als Partner-Aufgabe gruppiert`

**Branch:** eigener Branch (GitHub Desktop).

### Einhängung

| Schicht | Was |
|---------|-----|
| Daten | `get-partner-data`: `partner_aufgabe_id` + Lookup `auftrag_partner_aufgaben` (Titel/Beschreibung) |
| Blöcke | `buildPartnerAufgabeBloecke` — nur Darstellung |
| UI | `PartnerPositionLebenszyklusList` (offen + erledigt): Gruppenkopf + Positionen darunter; Aktionen unverändert je Position |
| Feed | `PartnerAuftragDetail` mappt die drei Anzeige-Felder |

### Kein Titel gesetzt

`partnerAufgabeGruppenkopfTitel`: Partner-Titel wenn gesetzt; sonst LV der ersten Position; bei mehreren `LV · N weitere` (kein „Aufgabe 1“).

### Summen

Zwischensumme je Gruppe: `partnerSummeBetraege` → `summeBetraege(..., "partner")`. Auftrag-Gesamt unverändert über alle Positionen (Konditionen-Card).

### Guard

`check-preis-seiten`: Kundenseite verbietet jetzt auch `partner_aufgabe_id` / `_titel` / `_beschreibung`.

**Abnahme:** `tsc` · `check-preis-seiten` · `check-shared-domain-sync` grün; `partner_aufgabe_*` nur in Display-Pfaden.

**Dateien:** `get-partner-data.ts` · `partner-aufgabe-display.ts` · `partner-aufgabe-gruppen.ts` · `PartnerPositionLebenszyklusList.tsx` · `PartnerAuftragDetail.tsx` · `supabase.ts` · `check-preis-seiten.mjs` · `COMMIT-PLAN.md`

---

## FIX6 Commit 4 — Unklar + Guard — 2026-09-26

**Commit-Text:** `feat(portal): Guard gegen ungebundene Kennungen in Actions und Routen`

**Branch:** eigener Branch. **FIX6 abgeschlossen.**

### Unklare Fälle (je eine Zeile)

| Stelle | Urteil |
|--------|--------|
| `GET …/einheit-bewohner?objektId=` | **offen → fix:** `assertOrgObjekt` |
| `ki-assist` `hm_befund_notiz` | **offen (8.) → fix:** `requireBefundActor` |
| `ki-assist` `funnel_beschreibung` | **sicher:** öffentlich + Rate-Limit, keine Mandanten-ID |
| Abnahme bestätigen/versenden `protokollId` | **offen → fix:** `assertProtokollIdForAuftrag` |
| CRM-`protokoll_id` lokal | **offen → fix:** Select/Update an Auftrag+HW |

### Guard `check-action-gates.mjs`

- Actions: Gate-Aufruf vor erstem `supabaseAdmin` in exportierter Funktion
- Routen: Client-Kennung + Admin ohne `assert*` und ohne Session-Bindung → Fehler; unsicher → zählen/überspringen
- Allowlist max 18 mit Begründung (Melden, KI-Rechner, ICS, Internal-Notify, Funnel-Lead, RV-Preview)
- In Build vor `audit-status`; Smoke: Action ohne Gate → exit 1

**Abnahme:** `npx tsc --noEmit` + `node scripts/check-action-gates.mjs` grün.

**Dateien:** `einheit-bewohner/route.ts` · `ki-assist/route.ts` · `partner-abnahmeprotokoll.ts` · `check-action-gates.mjs` · `action-gates-allowlist.txt` · `package.json` · `MANDANTENTRENNUNG-…` · `COMMIT-PLAN.md`

---

## FIX6 Commit 3 — Partner-Routen binden Kennungen — 2026-09-26

**Commit-Text:** `fix(portal): Partner-Routen binden Kennungen an den eigenen Betrieb`

**Branch:** eigener Branch. **Anhalten** — Commit 4 wartet.

### 6 · `POST /api/partner/signed-urls`

| | |
|--|--|
| Datei | `src/app/api/partner/signed-urls/route.ts` |
| Bindung | `filterPartnerOwnedStoragePaths(session.entityId, paths)` (gemeinsam mit Commit 1) |
| Ablauf | Fremde Pfade → nicht in `urls`; eigene Keys bleiben Original-Pfade für Client-Lookup |

### 7 · `loadLocalAbnahmeStatus` / GET Abnahme `?protokoll=`

| | |
|--|--|
| Datei | `partner-abnahmeprotokoll.ts` (`fetchRow` byId) |
| Bindung | `.eq("id", byId).eq("auftrag_id", auftragId).eq("handwerker_id", handwerkerId)` |
| Ablauf | Fremde `protokollId` bei eigenem Auftrag → kein Treffer, Fallback auf eigenes Protokoll (bestehende Logik) |

**Abnahme:** `npx tsc --noEmit` grün.

**Dateien:** `signed-urls/route.ts` · `partner-abnahmeprotokoll.ts` · `docs/COMMIT-PLAN.md`

---

## FIX6 Commit 2 — Org-Routen binden Kennungen — 2026-09-26

**Commit-Text:** `fix(portal): Org-Routen binden Kennungen an die Sitzung`

**Branch:** eigener Branch. **Anhalten** — Commits 3–4 warten.

### 3 · `GET /api/org/hausmeister?objektId=`

| | |
|--|--|
| Datei | `src/app/api/org/hausmeister/route.ts` |
| Bindung | `assertOrgObjekt(session.kunde.id, objektId)` vor `loadHausmeisterForObjekt` |
| Ablauf | Fremdes `objektId` → 404 statt HM-Daten; eigene Objekte unverändert. POST/DELETE hatten Objekt-Bindung schon. |

### 4 · `POST /api/org/katalog/bestellen` · `einheitId`

| | |
|--|--|
| Datei | `src/app/api/org/katalog/bestellen/route.ts` |
| Bindung | `assertOrgEinheit` + `kunde_objekt_id === kundeObjektId` (dieselbe Bestellung) |
| Ablauf | Einheit einer anderen Org/Objekts → 404; Bestellung ohne `einheitId` unverändert. |

### 5 · `DELETE /api/org/objekte/einheiten?id=`

| | |
|--|--|
| Datei | `src/app/api/org/objekte/einheiten/route.ts` |
| Bindung | `assertOrgEinheit` wie PATCH |
| Weitere Methoden | GET/POST: Objekt via `kunde_id`; PATCH: Assert schon — nur DELETE fehlte |

**Abnahme:** `npx tsc --noEmit` grün.

**Dateien:** `hausmeister/route.ts` · `katalog/bestellen/route.ts` · `objekte/einheiten/route.ts` · `docs/COMMIT-PLAN.md`

---

## FIX6 Commit 1 — Partner-Actions ohne Anmeldung — 2026-09-26

**Commit-Text:** `fix(portal): Partner-Actions ohne Anmeldung abgesichert`

**Branch:** eigener Branch (GitHub Desktop). **Anhalten** — Commits 2–4 warten.

### 1 · `getPartnerBautagebuchFotoUrls`

| | |
|--|--|
| Datei | `partner-bautagebuch.ts` + `filter-partner-owned-storage-paths.ts` |
| Bindung | `requireAccountSession` + `kind === "handwerker"`; Pfade nur mit Präfix `{handwerkerId}/` **und** Treffer in Bautagebuch/`eintrag_fotos`/`partner_dokumente`/`angebot_handwerker`/`fachdoku` (Zuweisung) |
| Ablauf | Keine bekannten Client-Aufrufer; bei Auth-Fehler oder fremdem Pfad → leeres Array (still) |

### 2 · `acceptPartnerRahmenvertragForEmail`

| | |
|--|--|
| Vorher | Exportierte Server-Action, E-Mail vom Client, keine Session |
| Aufruf | Nur `registerPartnerWithOtp` |
| Fix | Action **entfernt**. Persistenz erst in `confirmPortalSignupCode` (Partner) nach Funnel-OTP → Mailbox-Besitz. Lib: `acceptPortalRahmenvertragAfterVerifiedEmail` + Audit `herkunft: partner_registrierung_otp` |
| Ablauf | Checkbox weiter bei Registrierung; rechtliche Annahme erst nach OTP-Code. Abbruch vor OTP → kein RV mehr in DB (vorher schon angenommen — das war unsicher). Eingeloggt: `acceptPartnerRahmenvertrag` unverändert + Audit `partner_portal_eingeloggt` |

**Abnahme:** `npx tsc --noEmit` grün.

**Dateien:** `partner-bautagebuch.ts` · `partner-vertrag.ts` · `portal-signup-otp.ts` · `filter-partner-owned-storage-paths.ts` · `accept-portal-rahmenvertrag-registration.ts` · `docs/COMMIT-PLAN.md`

---

## FIX3 — Guards brechen ab statt stillschweigend zu überspringen — 2026-09-26

**Commit-Text:** `fix(portal): Guards brechen ab statt stillschweigend zu überspringen`

**Branch:** eigener Branch (GitHub Desktop).

### Entscheidung Punkt 4

| Guard | Entscheidung | Begründung |
|-------|--------------|------------|
| `check-empty-catch-warn` | **bleibt im Build, bricht ab** bei Treffern | Bestand aktuell 0; harte Gate ohne Baseline sinnvoll |
| `check-drift-warn` | **raus aus Build** → `npm run guard:drift` | Aggregat-Metriken (Hex≈300, raw buttons≈119); Zeilen-Grundlinie wäre Rauschen, kein Korrektheits-Gate |

### Punkt 5 — Guard-Inventur (Skip / nie-Abbruch)

| Guard | Befund | Maßnahme |
|-------|--------|----------|
| `check-db-spalten` | Sibling + CI-Skip → exit 0 | **behoben:** nur `src/types/supabase.ts`; fehlt → exit 1; Baseline |
| `check-shared-domain-sync` | kein Manifest → exit 0 | **behoben:** fehlt → exit 1 |
| `check-drift-warn` | immer exit 0 | **behoben:** aus Build-Kette |
| `check-empty-catch-warn` | immer exit 0 | **behoben:** exit 1 bei Hits |
| `check-service-role-gate` / `portal-btn` / `no-hardcoded-supabase-ref` / `status-writes` / `preis-seiten` / `inline-css` / `auswahl-zustand` | exit 0 nur bei Erfolg | OK |
| `check-nav-suche` | nicht in Build | gelistet, unverändert |
| Parser-`skip()` in db-spalten | interne Unsicherheits-Pfad-Zähler, kein Self-Disable | OK (kein „Guard aus“) |

**Hinweis Netlify:** `check-shared-domain-sync` braucht `CRM_ROOT` oder Sibling `baerenwald-system`. Ohne Gegenstück bricht der Build ab (gewollt). Zusätzlich CRM-Commit: Manifest + Sync `supabase.ts`.

### Grundlinie Startwert

`scripts/db-spalten-baseline.txt`: **23** unique Keys (`<datei>:<tabelle>:<spalte>`), aus **25** Fund-Zeilen (Duplikate gleiche Spalte). `BASELINE_MAX_LINES=23`. Lauf: `Grundlinie: 23 offen`.

### CRM (Sibling, eigener Commit)

- `baerenwald-system/scripts/shared-domain-files.json` — Eintrag `src/types/supabase.ts` → Portal, `rewrite: false`
- Sync ausgeführt → Portal `src/types/supabase.ts` mit Sync-Header

### Abnahme

- Typdatei umbenannt → exit 1, Meldung Sync
- `CRM_ROOT=/nonexistent` → exit 1
- Guard-Kette + `tsc --noEmit` grün

**Dateien (Portal):** `check-db-spalten.mjs` · `db-spalten-baseline.txt` · `check-shared-domain-sync.mjs` · `check-empty-catch-warn.mjs` · `check-drift-warn.mjs` · `package.json` · `src/types/supabase.ts` · `docs/COMMIT-PLAN.md`

---

## FIX1 — Auswahl grün, echte Checkboxen — 2026-09-26

**Commit-Text:** `fix(portal): Auswahl grün statt weiß, echte Checkboxen`

**Branch:** eigener Branch (GitHub Desktop).

**Befund:** `--p2-selected` war `#ffffff`; Ghost-Chrome überdeckte Auswahl; Fake-Checkboxen mit `aria-pressed`.

**Tokens:** `--p2-selected: #2e7d52`; neu `--p2-surface-card: #ffffff` (Kartenfläche). Disabled-Pill nutzt surface-card statt selected.

**Auswahl-Klassen (grün + weiße Schrift):** `.portal-liste-chip--active`, `.portal-detail-tab--active`, `.portal-auswahl--active`, `.portal-einstellungen-nav-item--active` — alle über `--p2-selected` / `--org-primary`.

**action={false} + Klassen statt Tailwind/Inline:** EinstellungenShell (mobil+desktop), HwKalk-Modus-Reiter, Mieter-Sprachwahl, NotificationBell-Filter; FilterChip/DetailTabs hatten es schon. Shell-Nav + SearchResults: action={false} (eigene Active-Klassen; Sidebar bleibt inverse Weiß-auf-Dunkelgrün).

**Checkboxen:** `PartnerPositionLebenszyklusList` + `PortalListeFilterBar` → `PortalCheckbox`. Toggle Einstellungen → `role="switch"` + `aria-checked`. Marketing `aria-pressed` → `aria-selected`.

**CSS:** keine `!important`-Sonderregel für `portal-detail-tab--active` (war schon nur in `@layer`; Stil jetzt über `--p2-selected`).

**Guard:** `scripts/check-auswahl-zustand.mjs` + Allowlist max 2 (`.mock-icon--active`, `.portal-notif-row--active`) — in Build vor `audit-status`.

**Ghost-Zuordnung (Punkt 3):** vollständige Tabelle → `docs/FIX1-GHOST-ZUORDNUNG.md` (111 Rest = Schaltfläche). Umgestellt auf Auswahl/Container: Shell-Nav mobil+desktop, SearchResultsGrouped, HwKalk-Reiter, Einstellungen/Mieter/Notif (siehe oben).

**Abnahme:** `aria-pressed` in `src/components/` = 0; `--p2-selected` ≠ weiß; `tsc --noEmit` grün; Guard OK.

**Dateien:**
- `src/app/globals.css` · `src/lib/portal2/tokens.ts` · `layout-chrome.ts` · `section-card-contract.ts`
- `PortalEinstellungenShell` · `PortalEinstellungenUi` · `PortalEinstellungenMieter` · `PortalNotificationBell`
- `PortalListeChrome` · `PortalListeFilterBar` · `PartnerHwKalkulationScreen` · `PartnerPositionLebenszyklusList`
- `PortalShell` · `PortalSearchResultsGrouped` · KiRechnerStarter · PlanCard · PlanComparisonTable
- `scripts/check-auswahl-zustand.mjs` · `scripts/auswahl-zustand-allowlist.txt` · `package.json`
- `docs/FIX1-GHOST-ZUORDNUNG.md` · `docs/COMMIT-PLAN.md`

---

## Paket D-Portal Teil 1: Handwerker-Gesamtsumme — 2026-09-26

**Commit-Text:** `fix(portal): Handwerker-Gesamtsumme rechnet Regie als Menge mal Satz`

**Voraussetzung:** Sync `regie-betrag.ts` aus D-CRM.

**Umgestellt:** Zeilenbeträge/Summen über `positionBetrag` / `summeBetraege` (Adapter `partner-betrag.ts`); Hinweis „n Position(en) in Prüfung, noch nicht enthalten“.

**Dateien:**
- `src/lib/shared-domain/regie-betrag.ts` — Sync (nicht handedit)
- `src/lib/partner/partner-betrag.ts` — Adapter
- `src/lib/partner/partner-leistungen-display.ts` / `partner-portal-display.ts` / `partner-konditionen.ts`
- `src/components/partner/PartnerLeistungenKonditionenCard.tsx` — summeBetraege + in-Prüfung-Zeile
- `src/components/partner/PartnerAuftragDetail.tsx` — inPruefungAnzahl
- `src/components/partner/PartnerPositionLebenszyklusList.tsx` — Zeilenbetrag via Adapter
- `docs/COMMIT-PLAN.md`

---

## Paket B-Portal: Partnersatz / Kundensatz — 2026-09-26

**Commit-Text:** `fix(portal): Partnersatz im HW-Portal, Kundensatz im Kundenportal`

**Zuordnung (Bestandsaufnahme):** siehe Bericht im Chat — Kern:
- Partner (`components/partner`, `lib/partner`, Partner-Actions) → `stundensatz` / `preis_partner`
- Kunde/HV (`get-portal-data`, `kunde-auftrag-aenderung`) → `stundensatz_kunde` (+ Rückfall `stundensatz`), `preis_fix`; kein `preis_partner` mehr laden/anzeigen
- Geteilt: `src/lib/portal/stundensatz-ansicht.ts` mit Pflicht-`ansicht: "partner" | "kunde"`

**Live-Fehler (vorher):** Kundenpfad nutzte `stundensatz` und Fallback `preis_partner` → Einkaufspreis sichtbar.

**Dateien:**
- `src/lib/portal/stundensatz-ansicht.ts` — resolve + Pflicht-ansicht
- `src/lib/portal-copy/preise.ts` (+ index) — „dein Stundensatz“ / „Stundensatz“
- `src/lib/portal/get-portal-data.ts` — Select ohne `preis_partner`, mit `stundensatz_kunde`
- `src/lib/portal/kunde-auftrag-aenderung.ts` — Kundensatz + Rückfall, kein `preis_partner`
- `src/components/partner/PartnerPositionLebenszyklusList.tsx` / `PartnerDokumentPreviewModal.tsx` — Copy + resolve
- `scripts/check-preis-seiten.mjs` + Allowlist (0) + Build-Kette / `check:preis-seiten`

---

## Auftrag A Teil 5: Portal preis_kunde → preis_fix — 2026-09-26

**Commit-Text:** `fix(portal): preis_kunde existiert nicht — auf die richtige Preisspalte`

**Zuordnung (alle kunden-/HV-seitig → preis_fix):**
| Stelle | Zielgruppe | Neu |
|---|---|---|
| get-portal-data.ts Select | Kunde/HV/Eigentümer/Hausmeister via getPortalDataForKunde | preis_fix |
| get-portal-data.ts Mapping | wie oben | preis_fix |
| kunde-auftrag-aenderung.ts Typ/Resolve/Map | Kunden-Anzeige | preis_fix |

Partner: kein `preis_kunde`; bleibt `preis_partner`. Resolve behält `preis_partner` nur als letzten Fallback wenn VK/Stundensatz fehlen.

**Guard:** vorher Verstöße 26 (20 unique) → nachher 25 (19 unique); `preis_kunde` weg. Weitere Treffer nicht repariert.

---


## Auftrag A Teil 2: Guard DB-Spalten — 2026-09-26

**Commit-Text:** `feat(crm+portal): Guard gegen unbekannte DB-Spalten in Abfragen`

Portal: `scripts/check-db-spalten.mjs` + Allowlist (0) + `check:db-spalten` + Build-Kette.
Typen: Fallback CRM-Sibling (siehe OFFENE-FRAGEN). Lauf: geprüft 2169 / übersprungen 338 / Verstöße 26 — nicht repariert.

---


## R5 Schritt 2 — Container stapeln + Box-in-Box — 2026-09-26

**Commit-Text:** `fix(portal): R5.2 Container stapeln, eine Fläche pro Ebene`

**Befund:** Nach chromfreiem `portal-btn` fehlten noch vertikale Stacks und zweite weiße Karten in Section-Cards.

**Dateien:**
- `src/app/globals.css` — `.portal-btn-stack`; `.portal-entity-cards--nested`
- `src/components/shared/PortalEntityList.tsx` — `action={false}` + Stack; Prop `nested`
- `src/components/org/OrgHmBefundPanel.tsx` — Titel/Datum gestapelt
- `src/components/org/OrganisationObjektEinheitenTab.tsx` — Mieterzeile + nested Liste
- `src/components/org/OrganisationObjektKontaktePanel.tsx` / `…PruefpflichtenPanel.tsx` / `…ObjektDetail.tsx` — nested
- `src/components/shared/PortalListCard.tsx` / `OrganisationMehrScreen` / `OrganisationObjektCard` — Stack
- `src/components/shared/PortalListeChrome.tsx` / `PortalListeFilterBar.tsx` / `PortalEinstellungenShell.tsx` / `PortalNotificationBell.tsx` — `action={false}`
- `src/components/shared/PortalEntityCard.tsx` — gelöscht (0 Aufrufe)
- `docs/COMMIT-PLAN.md` / `docs/PORTAL-PATTERN-KATALOG.md`

**Noch offen:** R5.2b Selected=grün; R5.3 Guards.

---

## Shared-Domain Sync (Build-Gate) — 2026-09-26

**Commit-Text:** `chore(portal): shared-domain Sync von CRM (geld-datum, Titel, PDF, Aushang)`

**Befund:** `check-shared-domain-sync` blockierte `npm run build` — Portal lag hinter CRM (Beträge/Daten, Vorgangstitel, PDF-Chrome, Aushang).

**Dateien (nur Sync, nicht handedit):**
- `src/lib/shared-domain/geld-datum.ts`
- `src/lib/crm-vorgang/vorgang-anzeige-titel.ts`
- `src/lib/shared-domain/pdf-chrome.ts`
- `src/lib/shared-domain/aushang-template.ts`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Quelle:** CRM `npm run sync:shared-domain`

---

## D1 Schritt 1 — Design-Skalen durchsetzen — 2026-09-26

**Commit-Text:** `fix(portal): D1.1 Radien/Abstände/Schatten Tokens durchsetzen`

**Befund:** Tokens existierten, wurden aber kaum benutzt (12 Roh-Radien, 3 Pillen-Schreibweisen, ~50 Schatten).

**Dateien:**
- `src/app/globals.css` — 5 Radien; 6 Space + 4 Dichte-Vars; 3 Schatten; list-stack eine Lücke
- `src/lib/portal2/tokens.ts` — Space/Schatten/Dichte in PORTAL_C / PORTAL_VAR / CSS_VARS
- `docs/COMMIT-PLAN.md` — dieser Abschnitt
- `docs/PORTAL-PATTERN-KATALOG.md` — Radien/Abstände/Schatten kurz

**Noch offen (D1 Schritt 2+):** Zustandsmatrix, Fokus, aria-busy, Farben/Fallbacks, Guard.

---

## R5 Schritt 1 — portal-btn chromfrei (Ursache der Klemme) — 2026-09-26

**Commit-Text:** `fix(portal): R5.1 action={false} wirkt — Optik nur noch auf portal-action-btn`

**Befund:** Unlayered `.portal-ui .portal-btn` (feste 46px + Flex-Zentrierung) hat `action={false}` wirkungslos gemacht; Zwillinge pro Klasse waren die Folge.

**Dateien:**
- `src/app/globals.css` — `.portal-btn` chromfrei; unlayered Größen auf `.portal-ui .portal-action-btn`; 12 `.portal-ui .portal-btn.*`-Zwillinge entfernt
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Noch offen (Schritt 2+):** Abstandsskala, Box-in-Box, Selected=grün, Guards/Tests.

---

## Live-Status: Rechnung-Punkt erledigt — 2026-09-21

**Commit-Text:** `fix(portal): Live-Status Punkt 5 Rechnung als erledigt bei Flow rechnung`

**Befund:** Bei Flow `rechnung` war der 5. Balken nur aktiv, nicht erledigt — analog Mieter-Terminal fehlte der ✓-Zustand.

**Dateien:**
- `src/lib/portal2/status-mapping.ts` — `portalFlowTimeline`: letzter Schritt done wenn Index ≥ Rechnung
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Updates-Cards + HW nicht beim Kunden — 2026-09-21

**Commit-Text:** `fix: Updates-Cards Design/Fotos; HW-Updates nur CRM/HV`

**Befund:**
- Card-Header als PortalButton (46px) → zerquetscht; Detail-Load ohne BT-Media → keine Bilder
- Partner setzte `fuer_kunde_freigegeben` + Mieter-Notify → HW-Updates beim Kunden

**Dateien:**
- `src/components/shared/BautagebuchCardFeed.tsx` — action=false + Card-Klassen
- `src/app/globals.css` — `.portal-bt-card-head` / `-foto` Höhe auto
- `src/components/org/OrganisationEingangPanel.tsx` — CardFeed statt Accordion
- `src/lib/portal/get-portal-data.ts` — Detail lädt BT+Fotos; Kunde filtert handwerker_id
- `src/app/actions/partner-bautagebuch.ts` — nicht freigeben; kein Kunden-Notify
- `src/lib/partner/sync-bautagebuch-kunde-timeline.ts` — nur noch HV-Notify
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Festgestellte Mängel doppelt — 2026-09-21

**Commit-Text:** `fix: „Festgestellte Mängel“ aus Details (Doppelt zu Mängel)`

**Befund:** Partner-Details zeigten „Festgestellte Mängel“ zusätzlich zu „Mängel“.

**Dateien:**
- `src/lib/lead-funnel-daten.ts` — Fachdetail-Filter skip festgestellte mängel
- `src/components/partner/PartnerHausmeisterVorbefundCard.tsx` — gleicher Skip im Vorbefund
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Regie → Kunden-Angebot — 2026-09-21

**Commit-Text:** `fix: anerkannte Regie im Kunden-Angebot (Preis + Merge)`

**Befund:**
- Portal las nur `lohn_fix` — Regie hat `preis_kunde`/`stundensatz` → 0 € / wirkte „nicht da“
- Angebot-Tab nahm entweder nur Auftrag- oder nur Angebotszeilen (kein Merge)

**Dateien:**
- `src/lib/portal/kunde-auftrag-aenderung.ts` — Preis aus preis_kunde/stundensatz; Filter in_pruefung/abgelehnt
- `src/lib/portal/get-portal-data.ts` — Select inkl. preis_kunde, stundensatz, anerkennung_status
- `src/lib/vorgang/build-vorgang-detail-vm.ts` — Leistungen Angebot+Auftrag mergen
- `src/components/org/OrganisationHvVorgangDetail.tsx` — Angebot-Tabelle mergen
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Freigabeschwelle-Hinweis nur Angebot + gelb — 2026-09-21

**Commit-Text:** `fix: Freigabe-Info nur Angebotsphase; Warning-Tokens gelb`

**Befund:**
- Infobox „unter Freigabeschwelle“ blieb auch bei Auftrag sichtbar
- `--warning-*` Tokens waren rot (#fff5f5 / #c0392b) statt gelb

**Dateien:**
- `src/components/org/OrganisationHvVorgangDetail.tsx` — Banner nur bei angebot/freigegeben/angefragt
- `src/components/org/OrganisationEingangPanel.tsx` — Schwelle-/Aktions-Banner aus wenn Auftrag existiert
- `src/app/globals.css` — `--warning-bg/border/text` auf Gelb/Amber
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Start-Sheet + Regie erledigbar — 2026-09-21

**Commit-Text:** `fix: Sheet-Felder nicht quetschen; Regie wie Position erledigbar`

**Befund:**
- `PortalField` setzte `.portal-field` auf Komposits → Modal `height:46px` zerquetschte Foto/Beschreibung
- Regie von Bulk-Auswahl und Bulk-Erledigt ausgeschlossen → blockierte Auftrag fertig

**Dateien:**
- `src/components/shared/PortalField.tsx` — `portal-field` nur auf native Controls
- `src/app/globals.css` — Modal-Höhe nur input/select; Dropzone im Wrap geschützt
- `src/components/partner/PartnerPositionLebenszyklusList.tsx` — Regie auswählbar; Sheet-Gap; Erledigt auch aus offen
- `src/app/actions/partner-position-eintraege.ts` — Bulk inkl. Regie; Soft-Start aus offen
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Updates-Liste luftiger — 2026-09-21

**Commit-Text:** `fix: portal-notif-row größer/luftiger (alle Portale)`

**Befund:** Notif-Zeilen als PortalButton (46px) + `portal-text-label` (11.5px) + enges Padding → zu klein/eng.

**Dateien:**
- `src/app/globals.css` — `.portal-notif-row` Höhe auto, Padding, Body/Meta-Typo
- `src/components/portal/PortalNotificationBell.tsx` — globale Klassen; Titel „Updates“; `action={false}`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Foto-Dropzone global größer — 2026-09-21

**Commit-Text:** `fix: portal-file-upload global (MultiFoto/Kamera/FileUpload)`

**Befund:** Nachtrag/Regie nutzte `PartnerMultiFotoSlot` ohne `.portal-file-upload` → PortalButton quetschte auf 46px.

**Dateien:**
- `src/app/globals.css` — `.portal-file-upload` min-height 10rem (compact 8rem); Icon-Größe
- `src/components/partner/PartnerMultiFotoSlot.tsx` — Klasse + `action={false}`
- `src/components/partner/PartnerDirektKameraSlot.tsx` — dito
- `src/components/shared/FileUploadField.tsx` — Kommentar (nutzte Klasse schon)
- `src/components/shared/PortalDokumentUi.tsx` — `PortalDokumentUploadZone` → `.portal-file-upload`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Partner Annehmen → Vorgänge sofort — 2026-09-21

**Commit-Text:** `fix: Partner Annehmen sofort unter Auftrag; force-dynamic; Titel-Slugs`

**Befund:** Nach Annehmen Filter „Auftrag“, lokaler State blieb „neu“ → Liste leer bis Hard-Refresh. `/partner` ohne `force-dynamic`. Titel `fenster_tuer — …` als Platzhalter nicht erkannt.

**Dateien:**
- `src/app/partner/page.tsx` — `dynamic = force-dynamic`
- `src/components/partner/PartnerClient.tsx` — optimistischer State `in_bearbeitung` + pending-Accept gegen RSC-Rollback; `refresh()` statt nur flash
- `src/components/portal/PortalClient.tsx` — Annehmen/HV-Feedback: `refresh()` (sichtbarer Busy)
- `src/lib/crm-vorgang/vorgang-anzeige-titel.ts` — Placeholder auch bei `slug — Rest`
- `src/lib/partner/partner-listen-titel.ts` — Gewerk-Slugs → `BEREICH_LABELS`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Weitere Portale (Muster):** nach Statuswechsel immer `usePortalRefresh().refresh()` (nicht nur `router.refresh` still) + wo Filter wechselt, lokalen Listen-State mitziehen.

---

## Datei-Dropzone Höhe — 2026-09-21

**Commit-Text:** `fix: FileUploadField Dropzone nicht mehr auf 46px quetschen`

### Dateien
- `src/components/shared/FileUploadField.tsx` — kein `primary`-Button mehr; Klasse `portal-file-upload`
- `src/app/globals.css` — Dropzone height:auto, genug Padding, gestrichelter Rand
- `src/components/org/OrgHmBefundPanel.tsx` — Foto-Upload default-Größe statt compact
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## HM-Checkliste flach — 2026-09-21

**Commit-Text:** `fix: HM-Befund-Checkliste flach (keine Card-Borders, Link „Weitere hinzufügen“)`

### Dateien
- `src/components/org/OrgHmBefundPanel.tsx` — Prüfpunkte als Checkliste mit Divider; Trash ohne Danger-Pill
- `src/components/shared/PortalActionMenu.tsx` — Custom-Trigger ohne Ghost-Doppelrahmen (`action={false}`)
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Active-Tabs dunkelgrün — 2026-09-21

**Commit-Text:** `fix: Detail-Tabs Active dunkelgrün statt hellgrün/Ghost`

### Dateien
- `src/app/globals.css` — `.portal-detail-tab--active` fest auf `--p2-green-dark`; Override gegen `portal-btn`
- `src/components/shared/PortalDetailTabs.tsx` — `action={false}`
- `src/components/shared/VorgangDetailSectionNav.tsx` — `action={false}`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

---

## Mehr-Kacheln + Objektkarten Layout — 2026-09-21

**Commit-Text:** `fix: Mehr-Kacheln und Objektkarten nicht mehr durch portal-btn quetschen`

### Dateien
- `src/app/globals.css` — Overrides: height:auto, kein Ghost-Rahmen für `.portal-mehr-tile` / `.portal-objekt-card-body`
- `src/components/org/OrganisationMehrScreen.tsx` — `action={false}`
- `src/components/org/OrganisationObjektCard.tsx` — `action={false}`
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Ursache:** `PortalButton` → `.portal-btn { height: 46px }` + Ghost-Weißrahmen hat Kacheln und Karten-Bodies zerquetscht/überlagert.

---

## Portal Detail schneller (kein Full-CRM-Rundtrip) — 2026-09-20

**Commit-Text:** `perf: Portal Vorgang/Objekt öffnen ohne Full-Pipeline-Warten`

### Dateien
- `src/lib/portal/get-portal-vorgang-detail.ts` — `mode: "list"` statt `"full"` (kein Signed-URL-/Partner-Doku-Rundtrip)
- `src/components/portal/PortalClient.tsx` — Listen-Item sofort zeigen; Shell-Busy nur ohne Listen-Treffer; Parent-Hold früher lösen
- `src/components/org/OrganisationObjektePanel.tsx` — Stale-Objekt während Refresh; Timeout statt ewig „Objekt wird geladen…“
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Ursache:** Jeder Vorgang-Klick lud die komplette `full`-Pipeline inkl. Storage-Signing; UI versteckte die schon vorhandenen Listen-Daten hinter Busy.

---

## Teil 3 — Portal: kein Endlos-Ladezustand — 2026-09-20

**Commit-Text:** `fix: Portal Detail-Laden Timeout + Fehler-UI (kein Endlos-Spinner)`

### Dateien
- `src/components/portal/PortalClient.tsx` — `applyDetailFromUrl` auch bei leerer Liste; Hard-Timeout 12s; `detailFailed` + „Nochmal versuchen“; Prop `listLoadFailed`
- `src/components/portal/EigentuemerPortalClient.tsx` — gleiche Hard-Timeout-/Fehler-Absicherung (Busy endete nur bei Listen-Treffer)
- `docs/COMMIT-PLAN.md` — dieser Abschnitt

**Nicht betroffen:** `HausmeisterPortalClient.tsx` — andere Konstruktion, beendet fehlende Selection nach 350ms (kein `vorgaengeItems.length`-Gate).

**Liste-Fehler:** `listLoadFailed` Prop ergänzt; `page.tsx` liefert bei Totalausfall bisher AuthShell (kein Prop-Durchreich). Prop bereit für Refresh/Teilfehler.

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

