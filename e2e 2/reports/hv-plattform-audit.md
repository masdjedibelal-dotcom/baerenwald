# HV-Plattform Audit (Wellen 0–3)

Stand: 2026-08-08 · E2E-Muster-HV (`muster-hv`)

## E2E-Status (schneller API-Lauf)

| TC | Thema | Status | Laufzeit-Hinweis |
|----|-------|--------|------------------|
| TC-01 | Havarie Kernpfad | ✅ grün (11 Schritte, vorherige Session) | CRM + Portal |
| TC-02 | Kleinreparatur | ✅ implementiert | |
| TC-03 | HV-manuell ohne Mieter | ✅ **neu grün** | API-only |
| TC-04 | Katalog Fix | ✅ grün | API |
| TC-05 | m²-Band | ✅ **neu grün** (3 Tests) | API |
| TC-06 | Abo-Lebenszyklus | ✅ 2/3 grün, 1 skip | Cron skip ohne `CRON_SECRET` |
| TC-07–10 | Regression/Status | ✅ laut vorheriger Session | |
| TC-11 | Edge-Cases | ⚠️ teilweise | d/f noch fixme |

**Letzter Lauf TC-03/05/06:** 6 passed, 1 skipped, 0 failed (~30s mit warmem Dev-Server).

---

## Welle 2a — Partner-Befund + HV read-only ✅

| Bereich | Status |
|---------|--------|
| Supabase `eintrag_typ` auf `auftrag_bautagebuch_eintraege` | ✅ Migration `20260808120000` (Portal + CRM) |
| CRM Notmaßnahme → Auftrag + SHK | ✅ `disponiereHavarieNotmassnahme` |
| Partner Befund-Upload | ✅ Action + UI |
| HV read-only Befund | ✅ `OrganisationEingangPanel` |
| Versicherungsakte echte Befunde | ✅ CRM `erzeugeVersicherungsaktePdf` |
| E2E TC-01 Schritt 3 | ✅ |

---

## Welle 2b — TC-03 HV-manuell ✅ (diese Session)

| Bereich | Status |
|---------|--------|
| API `POST /api/org/vorgang-manuell` | ✅ **neu** — kein `melde_tracking_token` |
| Kanal `hv_manuell` | ✅ Enum-Migration `20260808130000` (Supabase angewendet) |
| CRM Migration-Spiegel | ✅ Datei angelegt, **lokal anwenden falls separates Deploy** |
| Portal-UI Formular | ⚠️ API da, **kein dediziertes UI** (bestehendes Meldungsformular nutzt noch Mieter-Link) |
| E2E | ✅ `tc-03-manuell.spec.ts` aktiv |

---

## Welle 2c — Objektstamm / Reporting ⚠️ teilweise

| Bereich | Status |
|---------|--------|
| `kunden_objekte` + `objekt_einheiten` Schema | ✅ |
| API `/api/org/objekte/einheiten` (CRUD m²) | ✅ |
| `OrganisationObjektePanel` | ⚠️ Adresse/Kostenstelle, **keine Einheiten/m²-UI** |
| Katalog m²-Auto aus Einheit | ✅ `bestellen` + `einheitId` |
| Reporting / Export Kostenstelle | ⚠️ TC-11f fixme — LS7 ohne `kostenstelle_nr` |
| Dedizierter E2E Objektstamm | ❌ fehlt |

---

## Welle 3 — Katalog & Abo ✅ Kernlogik

| Bereich | Status |
|---------|--------|
| `resolveM2BandBetrag` (Stufe1 + m²×Satz) | ✅ **neu** |
| Angebotsrouting über Schwelle 2.500 € | ✅ TC-05 GH12 → 2.874 € → Angebot |
| LS7 ohne m² → `preis_unsicher` + Angebot | ✅ |
| Abo `start_am` Folgemonat | ✅ (war schon da) |
| `POST /api/org/abos/kuendigen` + `end_am` | ✅ **neu** |
| Cron Sammelrechnungen `end_am`-Filter | ✅ gekündigte bis `end_am` |
| Abo-Preise in `katalog_preise` | ⚠️ **kein Seed** — Fallback 149 € netto im Code |
| Abo-Kündigung **Portal-UI** | ❌ nur API |
| Katalog-Band **UI** (m²-Anzeige live) | ⚠️ API fertig, UI ungeprüft |
| E2E Cron Monatslauf | ⚠️ skip ohne `CRON_SECRET` in `.env` |

---

## Supabase — offene Punkte

| Item | Priorität | Aktion |
|------|-----------|--------|
| `lead_kanal.hv_manuell` | erledigt | Remote angewendet |
| `katalog_preise` für Abo-Slugs | mittel | Seed-Zeilen `abo-garten` etc. mit `preis_fix` |
| CRM-Migration `20260808130000` | niedrig | Bei CRM-Deploy mitziehen (gleiche DB) |
| RLS/Policy für neue APIs | prüfen | Session über `requireOrganisationSession` — OK |

---

## CRM — offene Punkte

| Item | Status |
|------|--------|
| Partner-Befund in Versicherungsakte | ✅ |
| Notmaßnahme → Auftrag | ✅ |
| Re-Disposition nach Partner-Ablehnung (TC-11d) | ❌ E2E fixme |
| `handwerker_bestaetigt` vs. `handwercher_bestaetigt` Tippfehler | ⚠️ technische Schuld |
| HV-manueller Vorgang im CRM sichtbar | ✅ über Lead `kanal=hv_manuell` (kein Extra-UI nötig) |
| Abo-Sammelrechnung PDF-Versand | ❌ nicht in Scope dieser Wellen |

---

## Verbleibende GAPs (`e2e/helpers/gaps.ts`)

1. **PARTNER_REDISPO** — TC-11d CRM Re-Disposition
2. **EXPORT_KOSTENSTELLE** — TC-11f Export-Fallback
3. **MIETER_FEEDBACK** — optional TC-01 Schritt 13

Zusätzlich **DD-10** Notmaßnahme-Betragsdeckel — **erledigt/revidiert (Juli 2026): Cap entfällt ersatzlos**.

---

## Neu implementiert (diese Session)

- `src/app/api/org/vorgang-manuell/route.ts`
- `src/app/api/org/abos/kuendigen/route.ts`
- `src/lib/katalog/katalog-produkte.ts` — m²-Band, `loadEinheitFlaeche`
- `src/app/api/org/katalog/bestellen/route.ts` — Einheit/m², `preis_unsicher`
- `src/app/api/cron/sammelrechnungen/route.ts` — `end_am`-Logik
- Migration `20260808130000_lead_kanal_hv_manuell.sql`
- E2E: `tc-03`, `tc-05`, `tc-06` aktiv

---

## Empfohlene nächste Schritte (klein → groß)

1. `CRON_SECRET` in `.env.local` → TC-06 Cron-Test grün
2. Abo-Preise in `katalog_preise` seeden (Migration)
3. Portal-UI: Einheiten/m² in `OrganisationObjektePanel` + Kündigen-Button bei Abos
4. HV-manuell Formular im Portal (oder Meldungsformular „ohne Mieter“ an neue API anbinden)
5. TC-11d Partner-Re-Disposition im CRM
6. Optional: Mieter-Feedback nach Erledigt
