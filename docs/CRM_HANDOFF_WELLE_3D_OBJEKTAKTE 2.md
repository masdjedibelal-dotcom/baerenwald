# CRM-Handoff — Welle 3d Objektakte

Stand: Juli 2026  
Repo Frontend: `handwerks-plattform`  
Repo CRM: `baerenwald-crm-dashboard`

## 1. SQL anwenden

Datei im Frontend-Repo:

```
supabase/migrations/20260810120000_welle_3d_objektakte.sql
```

In Supabase SQL Editor ausführen oder via CLI:

```bash
supabase db push
```

Enthält Tabellen, View `v_hv_kalender_events`, RLS, Funktion `portal_org_can_write()`.

---

## 2. Neue Tabellen (Übersicht)

| Tabelle | Zweck | HV-Portal | CRM |
|---------|-------|-----------|-----|
| `objekt_kontakte` | Hausmeister, Beirat, Notfall … | CRUD | **CRUD** |
| `einheit_bewohner` | Bewohner je `objekt_einheiten` | CRUD | **CRUD** |
| `akten_notizen` | Notizen + Wiedervorlage (Objekt/Vorgang) | CRUD | read-only |
| `objekt_dokumente` | Akte mit Ablauf + 60/30-Tage-Erinnerung | CRUD | read-only |
| `fremd_vorgaenge` | Externe Vorgänge (Badge „extern“, keine KPIs) | CRUD | read-only |
| `hv_calendar_feeds` | ICS-Token je HV-User | via API | — |

View: **`v_hv_kalender_events`** — Wiedervorlagen, Prüfpflichten, Dokument-Erinnerungen, Abo-Termine.

---

## 3. RLS (wichtig für CRM)

- **HV:** `kunde_id = portal_kunde_id()`; Schreiben nur wenn `portal_org_can_write()` (admin/sachbearbeiter, nicht „lesen“).
- **CRM read-only:** Policies `*_crm_select` mit `is_crm_staff()` auf:
  - `akten_notizen`, `objekt_dokumente`, `fremd_vorgaenge`
- **CRM schreiben:** Policies `*_crm` mit `is_crm_staff()` auf:
  - `objekt_kontakte`, `einheit_bewohner`

Service-Role (`supabaseAdmin`) umgeht RLS — CRM kann alternativ über Backend mit service role lesen/schreiben.

---

## 4. CRM — was anpassen

### 4.1 Pflicht (Disposition)

**Objekt-Detail im CRM** — neuer Block „Kontakte & Bewohner“:

- Liste `objekt_kontakte` WHERE `kunde_objekt_id = :objektId`
- Liste `einheit_bewohner` JOIN `objekt_einheiten` WHERE Objekt passt
- **Neu anlegen** für beide Tabellen (Formular: Rolle, Name, Tel, E-Mail, Notiz / Einheit + Bewohner)
- Telefon als `tel:`-Link, E-Mail als `mailto:`

API optional im CRM direkt via Supabase Client (RLS `is_crm_staff()`) oder REST zum Frontend — empfohlen: **direkt Supabase** mit gleichen Tabellen.

### 4.2 Read-only (Transparenz)

Am Objekt oder Lead anzeigen (kein Edit):

- `akten_notizen` (Objekt + Vorgang)
- `objekt_dokumente` (Metadaten + Link `storage_url`)
- `fremd_vorgaenge` (mit Badge **extern**)

### 4.3 DSGVO / Anonymisierung

Erweiterung bestehender Anonymisier-Jobs (`docs/DATENSCHUTZ_CRM_HANDOFF.md`):

```sql
-- Bei Betroffenenanfrage / Löschfrist einheit_bewohner:
UPDATE einheit_bewohner SET
  name = 'Anonymisiert',
  telefon = NULL,
  email = NULL,
  aktiv = false,
  anonymisiert_am = now()
WHERE id = :id AND kunde_id = :kundeId;
```

`leads.melder_*` weiter wie dokumentiert — **kein** Sync zu `einheit_bewohner`.

### 4.4 KPIs / Reporting

- **`v_objekt_kosten`** und Bärenwald-Rechnungen: **keine** Joins auf `fremd_vorgaenge`.
- Fremd-Betrag nur in HV-Dashboard-Kachel „Fremd (extern)“ — optional später eigene HV-Report-View.

### 4.5 Kalender

Kein CRM-UI nötig. ICS-Feed ist rein HV-portal (`/api/org/kalender/ics?token=…`).

---

## 5. Frontend-APIs (HV-Portal)

| Route | Methode | Zweck |
|-------|---------|-------|
| `/api/org/objekte/kontakte` | GET/POST/PATCH/DELETE | Kontakte |
| `/api/org/einheit-bewohner` | GET/POST/PATCH/DELETE | Bewohner |
| `/api/org/akten-notizen` | GET/POST/PATCH | Notizen |
| `/api/org/wiedervorlagen` | GET/PATCH | Startseite „Heute“ |
| `/api/org/objekte/dokumente` | GET/POST/DELETE | Dokumente |
| `/api/org/objekte/fremd-vorgaenge` | GET/POST/DELETE | Fremd-Vorgänge |
| `/api/org/kalender` | GET/POST | Monats-Events + ICS-Token |
| `/api/org/kalender/ics` | GET | ICS-Feed (token) |

UI: **Objekte → Objektakte** (Tabs: Dashboard, Einheiten & Bewohner, Kontakte, Notizen, Dokumente, Fremd, Prüfpflichten, Kalender).

---

## 6. Storage

Upload-Pfad im Bucket `gpt-visualisierungen` (bzw. `GPT_VIZ_STORAGE_BUCKET`):

- `objekt-akte/{kundeId}/{objektId}/…`
- `fremd-vorgang/{kundeId}/{objektId}/…`

CRM: nur URLs anzeigen, Upload erfolgt im HV-Portal.

---

## 7. Checkliste CRM-Team

- [ ] Migration `20260810120000_welle_3d_objektakte.sql` auf Prod/Staging
- [ ] Objekt-Detail: Kontakte CRUD
- [ ] Objekt-Detail: Bewohner CRUD (Einheit aus `objekt_einheiten` wählen)
- [ ] Objekt/Lead: Notizen, Dokumente, Fremd-Vorgänge read-only
- [ ] Anonymisier-Job: `einheit_bewohner` ergänzen
- [ ] Reporting: `fremd_vorgaenge` nicht in Umsatz-KPIs
