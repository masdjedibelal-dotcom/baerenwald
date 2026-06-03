# Partner-Portal (Bärenwald für Handwerker) — Todos je Phase

Route: **`/partner`** auf `handwerks-plattform` (wie MeinBärenwald `/portal`).

SQL-Dateien nacheinander in Supabase: siehe [SUPABASE_PARTNER_PORTAL_SQL.md](./SUPABASE_PARTNER_PORTAL_SQL.md).

---

## Phase 0 — Basis & Voraussetzungen

- [x] Roadmap & Todo-Liste (dieses Dokument)
- [x] Partner-Routen-Skeleton im Code (`/partner`)
- [ ] Kunden-Portal-Migration `20260602120000` auf Prod (falls noch offen)
- [ ] Entscheidung dokumentiert: Partner auf Website, CRM bleibt Steuerung
- [ ] Supabase Auth: Redirect URLs `/partner/**` ergänzen
- [ ] E-Mail-Templates Partner (Signup/Reset) — optional, gleiche wie Kunde

---

## Phase 1 — Datenbank & Auth

- [ ] SQL `01_portal_auth_handwerker.sql` ausführen
- [ ] SQL `02_portal_handwerker_angebot_einreichung.sql` ausführen
- [ ] SQL `03_portal_handwerker_bautagebuch.sql` ausführen
- [ ] Storage-Bucket `handwerker-uploads` anlegen (Dashboard)
- [x] Storage-Policies (PDF + Fotos) — `20260603120400_portal_handwerker_storage_policies.sql`
- [ ] CRM: bestehende `authenticated`-Policies auf `is_crm_staff()` prüfen (Hinweis in Kunden-Migration)

---

## Phase 2 — Partner-Portal Shell (Website)

- [x] Routen `/partner/login`, `registrieren`, `passwort-vergessen`, `/partner`, `auth/callback`, `signout`
- [x] `linkPortalHandwerkerToAuthUser()` (nur bestehende HW-E-Mail, kein Auto-Anlegen)
- [x] Middleware `/partner/*`
- [x] Layout + Navigation: **Anfragen | Angebote | Aufträge**
- [x] Datenschutz: Abschnitt Partner-Portal
- [x] Registrierung: Hinweis „nur mit bei uns hinterlegter E-Mail“

---

## Portal-UI (wie Kunden)

- [x] Startseite „Übersicht“ mit KPI-Karten, Tabellen-Vorschau, Kontakt
- [x] BärenwaldGPT (Desktop eingebettet, Mobil Overlay + Mittel-Button)
- [x] Navigation: Übersicht · Anfragen · Angebote · Aufträge · GPT

---

## Phase 3 — Anfragen

- [x] Liste `angebot_handwerker` (eigene Zuweisungen)
- [x] Detail: Gewerk, PLZ, Zeitraum, Positionen (ohne Kundennamen)
- [x] Annehmen / Ablehnen (Server Action `respondPartnerAnfrage`)
- [ ] CRM: Einladungs-Mail → `/partner/login` (Backend-Repo)
- [ ] Token-Link `/handwerker/anfrage/{token}` als Fallback behalten

---

## Phase 4 — Angebote einreichen (HW → Bärenwald)

- [x] Portal-UI: Preis (netto/brutto) + PDF-Upload + Notiz
- [x] Storage-Upload + `angebot_handwerker` Update (`hw_*` Felder)
- [x] Rechnungs-PDF (`hw_rechnung_pdf_url`, nach Angebotseinreichung)
- [x] Nur Status `akzeptiert` / nach Annahme
- [x] CRM: Partner-Einreichung im Angebot-Detail (Angebot- + Rechnung-PDF)
- [x] Optional: Mail an intern bei Einreichung (Angebot + Rechnung)

---

## Phase 5 — Aufträge & Bautagebuch

- [x] Auftragsliste (über `auftrag_handwerker` / `auftrag_positionen.handwerker_id`)
- [x] Auftragsdetail: nur eigene Positionen
- [x] Bautagebuch CRUD + Foto-Upload
- [x] `handwerker_id` auf Einträgen setzen
- [ ] CRM: Freigabe `fuer_kunde_freigegeben` unverändert intern
- [x] Optional: Benachrichtigung CRM bei neuem Eintrag (interne Mail Website)

---

## Phase 6 — Feinschliff

- [x] E-Mail bei neuer HW-Anfrage (API + Resend; CRM-Aufruf: [PARTNER_CRM_NOTIFY_API.md](./PARTNER_CRM_NOTIFY_API.md))
- [ ] Compliance-Dokumente (falls `partner_dokumente` relevant)
- [ ] Bewertungen / Statistik (später)
- [ ] E2E-Tests: Login → Anfrage → Annahme → Preis-Upload → Bautagebuch

---

## Backend (CRM) — separate Checkliste

- [ ] Migration-SQL kopieren (gleiche Dateien)
- [ ] `buildPartnerLoginLink()` in Mails
- [ ] Angebot-Detail: HW-Einreichungen anzeigen
- [ ] Bautagebuch: Filter „vom Handwerker“
