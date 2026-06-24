# Auftraggeber-Portal — Backend/CRM Handoff

> **Ziel:** Dieses Dokument ist die vollständige Checkliste für das **CRM-Projekt** (`baerenwald-crm-dashboard`).  
> Das **Frontend** (`handwerks-plattform`) ist fertig. SQL-Migrationen sind auf Supabase angewendet.

---

## Kontext & Datenmodell

### Zwei Portal-Modi

| `kunden.portal_modus` | Wer loggt ein | Route |
|----------------------|---------------|-------|
| `privat` | Endkunde | `/portal` → Privat-Portal |
| `organisation` | HV / Gewerbe / Facility | `/portal` → Auftraggeber-Portal |

### Drei Anlässe (`leads.anlass`)

| Anlass | Wer erfasst | Preis | Typischer Kanal |
|--------|-------------|-------|-----------------|
| `meldung` | Mieter (öffentlich) oder Org (Vorerfassung) | Keiner | `hv_melder_link`, `hv_einladung` |
| `projekt` | Organisation | Preisrahmen min/max | `org_portal` |
| `servicepaket` | Organisation | €/Monat | `org_portal` |

### Lead-Zuordnung bei Mieter-Meldungen

```
kunde_id              = Melder (Person, ggf. ohne Account)
auftraggeber_kunde_id = Organisation (HV)
kunde_objekt_id       = Gebäude
erfassung_von         = melder | organisation | crm
```

### Org-Freigabe (`leads.org_freigabe_status`)

| Status | Bedeutung |
|--------|-----------|
| `nicht_noetig` | Partner darf sofort sehen |
| `ausstehend` | Wartet auf Org-Freigabe — **Partner-Portal blendet aus** |
| `freigegeben` | Org hat freigegeben |
| `abgelehnt` | Org hat abgelehnt — Partner sieht nichts |

Log-Tabelle: `org_freigabe_log` (lead_id, angebot_id, aktion, betrag_eur, notiz)

### Kunden-Stammdaten (neu)

```sql
kunden.portal_modus        -- privat | organisation
kunden.org_kennung          -- URL-Slug → /melden/{org_kennung}
kunden.org_anzeigename
kunden.org_logo_url
kunden.freigabe_modus       -- direkt | freigabe
kunden.freigabe_schwelle_eur
kunden.notfall_direkt       -- Notfall umgeht Freigabe
```

### Objekte (erweitert)

```sql
kunden_objekte.melde_slug      -- /melden/{org}/{melde_slug}
kunden_objekte.melde_aktiv
kunden_objekte.einheiten_hinweis
kunden_objekte.notizen_intern
kunden_objekte.created_by      -- crm | portal
```

### Lead-Felder (neu)

```sql
leads.auftraggeber_kunde_id
leads.anlass
leads.erfassung_von
leads.melder_name / melder_einheit / melder_telefon / melder_email
leads.einladung_token / einladung_status   -- offen | ergaenzt | entfallen
leads.org_freigabe_status
leads.service_modus                        -- paket | einzeln
```

### Fotos bei Meldungen

In `leads.funnel_daten.fotos` als URL-Array (öffentlicher Storage-Pfad `meldung/{leadId}/…`).

---

## Migrationen (bereits angewendet)

Spiegeln in `baerenwald-crm-dashboard/supabase/migrations/` falls noch nicht vorhanden:

1. `20260527130000_kunden_objekte.sql`
2. `20260703120000_organisation_portal_stamm.sql`
3. `20260703120100_organisation_portal_rls.sql`
4. `20260703120200_organisation_freigabe_log.sql`

---

## Was das Frontend bereits liefert

| Bereich | Status |
|---------|--------|
| Öffentliches Meldeformular `/melden/...` | ✅ |
| Org-Portal `/portal` (Eingang, Pipeline, Objekte, Einstellungen) | ✅ |
| APIs: Meldung, Org-CRUD, Freigabe, Einladung | ✅ |
| E-Mails M1–M4 (Melder-Bestätigung, Org-Benachrichtigung, Einladung) | ✅ |
| Partner-Gate (keine Anfragen bei `org_freigabe_status = ausstehend`) | ✅ |
| PostHog-Events (`melde_*`, `org_*`) | ✅ |

**Frontend-Doku:** `handwerks-plattform/docs/ORGANISATION_PORTAL.md`

---

## CRM — Implementierungsplan

### Phase 1 — Kunden-Stammdaten & Objekte

**Dateien (Vorschlag):**

- `src/lib/types.ts` — Typen ergänzen
- `src/components/kunden/KundenOrganisationTab.tsx` (neu)
- `src/components/kunden/KundenObjekteCard.tsx` — erweitern
- `src/app/actions/kunden-objekte.ts` — `melde_slug`, `melde_aktiv` etc.
- `src/app/actions/kunden.ts` — Org-Felder speichern

**Aufgaben:**

- [ ] **Tab „Organisation“** im Kunden-Detail (`/kunden/[id]`)
  - Felder: `portal_modus`, `org_kennung`, `org_anzeigename`, `org_logo_url`
  - Freigabe: `freigabe_modus`, `freigabe_schwelle_eur`, `notfall_direkt`
  - Validierung: `org_kennung` unique (lowercase), nur bei `portal_modus = organisation`
  - Button: **MeinBärenwald-Einladung** senden (bestehende Portal-Auth-Flow nutzen)

- [ ] **Tab „Objekte“** erweitern (CRM hat bereits `KundenObjekteCard` + `kunden-objekte.ts`)
  - Spalten: `melde_slug`, `melde_aktiv`, `einheiten_hinweis`, `notizen_intern`
  - Auto-Slug aus Titel (wie Frontend `src/lib/org/slug.ts`)
  - Anzeige: Melde-Link `https://…/melden/{org_kennung}/{melde_slug}`
  - Optional: QR-Code generieren (PNG via API oder Client-Lib)

- [ ] **Kunde anlegen (Gewerbe/HV):**
  - Bei Kundentyp Gewerbe/HV → Default `portal_modus = 'organisation'`
  - `org_kennung` Pflicht vor erstem Objekt

- [ ] **Types** (`src/lib/types.ts`):

```typescript
export type PortalModus = 'privat' | 'organisation'
export type LeadAnlass = 'meldung' | 'projekt' | 'servicepaket' | 'sonstiges'
export type OrgFreigabeStatus = 'nicht_noetig' | 'ausstehend' | 'freigegeben' | 'abgelehnt'
// Kunde + KundenObjekt + LeadDetail um obige Felder erweitern
```

---

### Phase 2 — Anfragen-Liste & Lead-Detail

**Dateien:**

- `src/lib/crm/pipeline-liste-filter.ts`
- `src/components/anfragen/AnfragenListeClient.tsx` (o.ä.)
- `src/components/anfragen/AnfrageDetailClient.tsx`
- `src/lib/anfragen/load-anfrage-detail.ts`
- `src/components/anfragen/LeadOrgKontextBlock.tsx` (neu)

**Aufgaben:**

- [ ] **Filter-Chips** in Anfragen-Liste:
  - `anlass`: Meldung | Projekt | Servicepaket
  - Kanal: `hv_melder_link`, `hv_einladung`, `org_portal`
  - Status: „Wartet Freigabe“ (`org_freigabe_status = ausstehend`)
  - Status: „Wartet Melder“ (`einladung_status = offen`)

- [ ] **Lead-Detail — neue Blöcke** (über `LeadFunnelProjektAnzeige` hinaus):

```
┌─ Auftraggeber ─────────────────┐
│ Org-Name, org_kennung, Link    │
└────────────────────────────────┘
┌─ Melder (nur bei anlass=meldung)┐
│ Name, Einheit, Tel, E-Mail     │
│ einladung_status + Link kopieren│
└────────────────────────────────┘
┌─ Objekt ───────────────────────┐
│ kunden_objekte.titel, Adresse  │
└────────────────────────────────┘
┌─ Fotos ────────────────────────┐
│ funnel_daten.fotos[] Galerie   │
└────────────────────────────────┘
```

- [ ] **Aktionen im Detail:**
  - „Einladungslink kopieren“ → `/melden/ergaenzen/{einladung_token}`
  - „Als Projekt weiterführen“ → neuen Lead mit `anlass=projekt`, gleiches Objekt
  - Auftraggeber-Kunde verlinken (`auftraggeber_kunde_id` → `/kunden/{id}`)

- [ ] **Interne Mail** bei neuer Melder-Meldung (`kanal = hv_melder_link`):
  - Template analog `buildOrgNeueMeldungHtml` in `handwerks-plattform/src/lib/email/meldung-mail-templates.ts`
  - Empfänger: Org-E-Mail + internes Team

- [ ] **SELECT erweitern** in `load-anfrage-detail.ts`:
  - Join `auftraggeber:kunden!leads_auftraggeber_kunde_id_fkey(id, name, org_anzeigename, org_kennung, email)`
  - Join `kunden_objekte` falls noch nicht über Lead

---

### Phase 3 — Angebote, Freigabe & Partner

**Dateien:**

- `src/app/(dashboard)/angebote/actions.ts`
- `src/components/angebote/AngebotDetailPageClient.tsx`
- `src/lib/angebote/send-handwerker-anfrage.ts`

**Aufgaben:**

- [ ] **Status „Wartet auf Org-Freigabe“** in Angebots-Pipeline wenn:
  - `auftraggeber_kunde_id` gesetzt UND `org_freigabe_status = ausstehend`
  - Oder Betrag > `freigabe_schwelle_eur` bei `freigabe_modus = freigabe`

- [ ] **Partner-Zuweisung blockieren** bis `org_freigabe_status IN (nicht_noetig, freigegeben)`
  - Frontend macht das bereits im Partner-Portal; CRM sollte beim „An Handwerker senden“ ebenfalls prüfen

- [ ] **Freigabe-Log anzeigen** im Lead-/Angebots-Detail:
  ```sql
  SELECT * FROM org_freigabe_log WHERE lead_id = $1 ORDER BY created_at DESC
  ```

- [ ] **Nach Org-Freigabe:** automatisch oder manuell Partner-Anfrage auslösen

---

### Phase 4 — Servicepaket im CRM

**Aufgaben:**

- [ ] Lead-Detail Block **Servicepaket** wenn `anlass = servicepaket`:
  - `service_modus`: paket | einzeln
  - `funnel_daten.hausservice_stufe` oder `funnel_daten.einzel_services`
  - `funnel_daten.wohnflaeche`, `garten_qm`
  - `preis_min` / `preis_max` als Monatsband anzeigen

- [ ] Angebot-Wizard: vereinfachter Modus für wiederkehrende Leistung (optional, Phase 4b)

---

### Phase 5 — E-Mail-Templates CRM

**Dateien:**

- `src/lib/mail-templates.ts` / `src/lib/email-templates.ts`
- `src/app/actions/mails.ts`

**Templates (neu oder erweitern):**

| ID | Trigger | Betreff (dynamisch) |
|----|---------|---------------------|
| M3 | Org-Freigabe angefordert | `Freigabe erforderlich — {objekt}` |
| M4 | Org hat freigegeben/abgelehnt | `Freigabe {aktion} — {objekt}` |
| M9 | CRM lädt Org zu MeinBärenwald ein | `Ihr Auftraggeber-Portal` |

- [ ] Betreffzeilen nach `anlass` differenzieren (Meldung vs. Projekt vs. Servicepaket)
- [ ] P.S. in Kunden-Mails: Link zu MeinBärenwald `/portal` (bereits teilweise gefixt)

**Referenz Frontend-Templates:** `handwerks-plattform/src/lib/email/meldung-mail-templates.ts`

---

### Phase 6 — Reporting (später)

- [ ] Dashboard-KPI: Meldungen pro Org / Objekt
- [ ] Conversion Melde-Link → Lead → Angebot → Auftrag
- [ ] PostHog-Funnel `melde_*` + `org_*` Events auswerten

---

## API-Referenz (Frontend — nur zur Orientierung)

| Route | Zweck |
|-------|--------|
| `POST /api/meldung` | Mieter-Meldung |
| `POST /api/meldung/ergaenzen` | Einladung abschließen |
| `POST /api/org/meldung-vorab` | Org erfasst + Einladung |
| `POST /api/org/meldung-einladung-erneut` | Einladung erneut senden |
| `POST /api/org/freigabe` | Org freigibt/lehnt ab |
| `GET/POST/PATCH /api/org/objekte` | Objekt-CRUD Portal |
| `PATCH /api/org/einstellungen` | Freigabe-Einstellungen |
| `POST /api/org/anfrage` | Projekt / Servicepaket |

CRM braucht diese Routes **nicht** — arbeitet direkt auf Supabase.

---

## RLS & Sicherheit

- Portal-RLS in `20260703120100_organisation_portal_rls.sql`
- Org sieht nur Leads mit `auftraggeber_kunde_id = portal_kunde_id()` oder `kunde_id = portal_kunde_id()`
- `org_freigabe_log` — Select nur für eigene Org
- CRM nutzt Service-Role / Admin-Client — unverändert

---

## Test-Checkliste (CRM)

### Stammdaten
1. Kunde als Organisation anlegen (`portal_modus`, `org_kennung`)
2. Objekt mit `melde_slug` anlegen → Link im CRM sichtbar
3. MeinBärenwald-Einladung senden → Login als Org

### Meldung-Flow
4. Melde-Link öffnen (ohne Login) → Lead in CRM mit `anlass=meldung`, `erfassung_von=melder`
5. Org-Felder im Lead-Detail korrekt (Melder, Objekt, Fotos)
6. Vorerfassung + Einladung → `einladung_status=offen` → nach Ergänzen `ergaenzt`

### Freigabe
7. Angebot über Schwelle → `org_freigabe_status=ausstehend`
8. Partner sieht Anfrage **nicht** bis Freigabe
9. Org freigibt im Portal → Partner sieht Anfrage

### Projekt / Servicepaket
10. Org erstellt Projekt-Anfrage → Lead `anlass=projekt` mit Preisrahmen
11. Servicepaket → `anlass=servicepaket`, Monatspreis in Detail

---

## Projektwechsel — Schnellstart

```bash
# Terminal 1: Frontend (fertig)
cd ~/Desktop/Bärenwald/handwerks-plattform
npm run dev

# Terminal 2: CRM (hier weitermachen)
cd ~/Desktop/Bärenwald-Backend/baerenwald-crm-dashboard
npm run dev
```

**Empfohlene Reihenfolge im CRM:**
1. Types + Kunden-Tab Organisation
2. Objekte erweitern (melde_slug)
3. Anfragen-Filter + Lead-Detail-Blöcke
4. Freigabe-Workflow + Partner-Gate in `send-handwerker-anfrage`
5. E-Mail-Templates

---

## Offene Frontend-Nice-to-haves (nicht blockierend)

- Projekt-Funnel: voller Rechner (`useFunnelState`) statt vereinfachter Maske
- Org-Onboarding-Tour (mehrstufig)
- QR-Code-Generator im Portal (CRM kann das auch)

---

*Stand: Juni 2026 — Frontend handwerks-plattform vollständig für Org-Portal MVP.*
