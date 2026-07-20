# Wave: White-Label-Kommunikation

Stand: Juli 2026  
Repo: `handwerks-plattform` (Portal) · CRM: `baerenwald-crm-dashboard` (separat)

## Zielbild

**Mieter denkt:** „Ich melde mich bei meiner Hausverwaltung.“  
**Realität:** Meldung → HV-Portal → Bärenwald operiert → Handwerker im Auftrag.  
**Sichtbar für Mieter:** nur HV-Marke (Logo, Name, Sprache).  
**Technisch:** Keine E-Mails an Mieter — Status-Link auf der Bestätigungsseite + HV koordiniert. HV-Mails dürfen Bärenwald-branded sein.

```
Mieter  →  Meldeformular, Status-Link (speichern!), Termin-Slot optional
HV      →  Freigaben, Status-Link kopieren, Mieter per eigenen Kanälen informieren
Bärenwald (CRM)  →  operiert im Hintergrund, nicht im Mieter-UI
Handwerker  →  Bärenwald Partner-Branding; vor Ort „im Auftrag der Hausverwaltung“
```

**Designer-Mockups:** [DESIGN_GAP_ANALYSE_PORTALE.md](./DESIGN_GAP_ANALYSE_PORTALE.md) · Status-Mapping: [VORGANG_STATUS_ROLE_MAPPING.md](./VORGANG_STATUS_ROLE_MAPPING.md)

---

## Abgrenzung zum laufenden Go / CRM-Reihenfolge

Die **Sofort-Punkte** dieses Waves laufen **parallel im Portal-Repo** und sind **nicht blockierend** für die CRM-Implementierung:

| Parallel (Portal-Repo) | Ändert nicht |
|------------------------|--------------|
| DB-Felder Org-Branding / Mieter-Kontakt / AV | CRM-Reihenfolge **Schritt 0 → 1 → 2** |
| Leak-Audit Mieter-Touchpoints | Reihenfolge der CRM-Phasen (Types, Objekte, Freigabe, Templates …) |
| Mail-Templates mit Org-Kontext | Bestehende Portal↔CRM-APIs und Resolver-Parität |

**CRM-Reihenfolge (unverändert):** Schritt 0 (Stammdaten/Setup) → Schritt 1 (Kern-Workflows) → Schritt 2 (Erweiterungen). White-Label ist ein **eigenes Wave-Paket** neben Wave 2 / CRM-Backlog — kein Ersatz oder Umordnung dieser Schritte.

**CRM-Reihenfolge:** Es gibt **nur einen** Plan — [CRM_TRACK_PLAN.md](./CRM_TRACK_PLAN.md) (Schritt 0 → 1 → 2 → Phasen A–D). Die frühere „5-Punkte-Liste“ unten ist als **Phase D** einsortiert, kein paralleler Track.

Referenz CRM-Phasen: [CRM_TRACK_PLAN.md](./CRM_TRACK_PLAN.md) · Portal-Handoff-Details: dieses Dokument.

---

## Festlegungen (Produkt)

| Thema | Entscheidung |
|-------|--------------|
| **E-Mails an Mieter** | **Nein** — `MIETER_EMAIL_ENABLED = false`. Keine neutrale Domain nötig. |
| Mail-Reply Mieter → System | entfällt (kein Mieter-Mail) |
| Freitext-Kanal Mieter ↔ Bärenwald | **Nein** — nur strukturierte Aktionen (Meldung, Status, Termin, Feedback) |
| Mieter-Status-Zugang | Link auf Bestätigungsseite (kopieren!) + HV „Status-Link kopieren“ im Portal |
| Terminfixierung | Primär telefonisch (Wunschzeiten aus Meldung); Slot-Bestätigung auf Status-Seite optional |
| Kleinreparatur / Rechnung | **Option A** — siehe unten |

### Kleinreparatur & Rechnungen (Option A)

**Rechnung geht immer an die Hausverwaltung** — nie direkt an den Mieter.

- Kein Mieter-Rechnungsversand im Portal/CRM-Flow
- Kein Mieter-Mahnwesen
- White-Label bleibt durchgängig: Mieter sieht **keine** Rechnungs-PDFs, keine Zahlungsaufforderungen, keine „überfällig“-Signale auf Mieter-Kanälen
- HV erhält Rechnung / Abrechnung und regelt Kostenumlage zum Mieter **außerhalb** des Systems (Vertrag, NK-Abrechnung, eigene HV-Prozesse)

**Konsequenz für UI/Copy:** Mieter-Status endet bei „Erledigt“ + Feedback; Rechnungsphase existiert nur in HV-Portal und CRM (bereits über Resolver `role: 'hv'` / `kunde` abgedeckt, nicht für Mieter sichtbar).

---

## Was schon da ist (Ist-Stand Portal)

| Bereich | Stand |
|---------|--------|
| Org-Branding Basis | `kunden.org_anzeigename`, `org_logo_url` |
| Melde-URLs | `/melden/{org_kennung}`, `/melden/{org_kennung}/{melde_slug}` |
| Melde-UI | Org-Logo + Name im Formular |
| Mieter ohne Login | Status-Seite `/melden/status/{token}` |
| HV-Mieter eingeloggt | Preise/Leistungen ausgeblendet, vereinfachte Status |
| Termine | Slot-Auswahl, kein Chat |
| HV-Resolver | `hvPortalMode` + `role: 'hv'` in Vorgangsliste |

**Bekannte Leaks (Mieter):** ~~Footer/Copy/Mails~~ → Web-Touchpoints bereinigt. **Kein** Mieter-Mail-Versand mehr.

---

## Deploy-Reihenfolge

1. Migration `20260815120000_org_whitelabel_stamm.sql` auf Supabase (Staging → Prod)
2. Dann Code deployen (liest WL-Spalten)

---

## Abnahme-Smoke-Test (4 Klicks)

| # | Test |
|---|------|
| a | Meldung durchspielen: Wunschtermin skip → Kategorie-Default; auswählen → überschreibt. Bestätigung: großer Status-Link, kein MeinBärenwald |
| b | HV-Mail bei neuer Meldung: enthält Mieter-Status-Link zum Weitergeben (keine Mieter-Mail) |
| c | Bestands-HV-Admin: WL-Gate → AV + Kontakt. **Nicht-Admins:** arbeiten ohne Gate weiter (nur Admins sehen Gate) |
| d | Partner: HV-Meldungs-Auftrag → Banner „im Auftrag der Hausverwaltung“ |

---

## Arbeitspaket 1 — Datenmodell (Sofort, Portal-Repo)

### Neue / zu ergänzende Felder auf `kunden` (Organisation)

| Feld | Typ | Pflicht ab | Zweck |
|------|-----|------------|--------|
| `org_anzeigename` | text | Live | ✅ vorhanden |
| `org_logo_url` | text | Live | ✅ vorhanden |
| `org_primary_color` | text | optional | Melde-/Status-UI |
| `mieter_kontakt_telefon` | text | Onboarding | Fußzeile „Bei Rückfragen …“ |
| `mieter_kontakt_email` | text | Onboarding | oder explizit nur Telefon |
| `mieter_kontakt_hinweis` | text | optional | z. B. „Mo–Fr 8–17 Uhr“ |
| `av_akzeptiert_am` | timestamptz | Onboarding | AV-Vertrag |
| `av_version` | text | Onboarding | Version der akzeptierten AV |
| `av_akzeptiert_von` | uuid | Onboarding | Auth-User bei AV-Akzeptanz |
| `av_text_snapshot` | text | Onboarding | Archivierter AV-Volltext |
| `wl_ansprache_am` | timestamptz | Rollout | Start 30-Tage-Übergang Bestands-Orgs |
| `impressum_url` | text | optional | pro Org, sonst zentrales Template |
| `datenschutz_url` | text | optional | pro Org, sonst zentrales Template |

**Migration:** im Portal-Repo anlegen; Supabase wie üblich (`supabase db push`).

**Validierung:** Neue Orgs: ohne Mieter-Kontakt + AV keine Freischaltung Melde-Links (konfigurierbar). Bestands-Orgs: siehe [Bestands-Orgs](#bestands-orgs).

---

## Bestands-Orgs

Existierende Hausverwaltungen werden **beim nächsten Login** durch einen Pflicht-Schritt geführt — kein Big-Bang vor Go-Live.

### Ablauf

1. HV meldet sich im Org-Portal an (`/portal`, `portal_modus = organisation`).
2. **Gate-Modal / Onboarding-Screen** (einmalig oder bis vollständig):
   - AV-Vertrag lesen + akzeptieren → `av_akzeptiert_am`, `av_version`
   - Mieter-Kontaktdaten pflegen → `mieter_kontakt_telefon`, `mieter_kontakt_email` (mindestens eines Pflicht)
   - optional: `mieter_kontakt_hinweis`, Impressum/Datenschutz-URLs
3. Erst danach voller Portal-Zugriff (oder Melde-Material-Freigabe).

### Fallback bis Pflicht erfüllt

Solange Mieter-Kontakt fehlt, verwenden **Mieter-Touchpoints** eine **generische Fallback-Fußzeile** (kein Bärenwald-Leak):

> „Bei Rückfragen wenden Sie sich an Ihre Hausverwaltung. Diese Nachricht kann nicht beantwortet werden.“

- Kein leerer Kontaktblock
- Kein Bärenwald-Telefon als Ersatz
- HV sieht im Profil Banner: „Mieter-Kontakt fehlt — bitte vervollständigen“

### Technik (Portal)

- Flag aus DB: `org_whitelabel_ready` (computed oder Spalte) = AV + mindestens ein Mieter-Kontaktweg
- Middleware oder Client-Gate in `OrganisationPortalClient` / `OrganisationProfilPanel`
- Audit: wer hat AV wann akzeptiert (`av_akzeptiert_am`, `av_akzeptiert_von`, `av_text_snapshot`)
- Gate: 30 Tage ab `wl_ansprache_am` nur Admin; danach alle Org-Nutzer blockiert bis WL ready

---

## Arbeitspaket 2 — Leak-Audit (Sofort, parallel)

**Abnahmekriterium** für jede Mieter-Änderung. Checkliste pro Touchpoint:

| Prüfpunkt | Beispiele |
|-----------|-----------|
| URL in Browser | Melde-Routen ohne Bärenwald-Marketing |
| ~~Mail-Absender Mieter~~ | entfällt — kein Mieter-Mail |
| Web-Copy / Footer | Org/HV, kein Bärenwald |
| Fehlerseiten | `/melden/fehler` neutral |
| `<title>` / Favicon | Org-Kontext auf Melde-Routen |

### Dateien (Priorität)

| Datei / Route | Aktion |
|---------------|--------|
| `src/lib/email/meldung-mail-templates.ts` | Org-Header, Signatur, No-Reply-Fußzeile |
| `src/lib/melde/mieter-status-mail.ts` | Org-Kontext |
| `src/components/melden/MeldeFormular.tsx` | Footer |
| `src/components/melden/MeldeStatusClient.tsx` | Copy + Footer |
| `src/app/melden/bestaetigung/page.tsx` | Erfolgstext |
| `src/app/melden/fehler/page.tsx` | neutrales Shell |
| `src/lib/org/melde-datenschutz-copy.ts` | Org-spezifische Links |
| `src/components/melden/MeldeDatenschutzHinweis.tsx` | Impressum/Datenschutz pro Org |

---

## ~~Arbeitspaket 3 — Mail-Versand (Wave 2 Infrastruktur)~~ → entfällt

**Entscheidung Juli 2026:** Keine E-Mails an Mieter. Neutrale Versanddomain, SPF/DKIM für Mieter-Kanal **nicht** nötig.

- Mieter-Mail-Templates in `meldung-mail-templates.ts` bleiben (**deprecated**, Re-Enable über `MIETER_EMAIL_ENABLED`)
- Stattdessen: Status-Link prominent + HV-Benachrichtigungen (`notify-hv-mieter-event.ts`)

### HV-Mails (weiterhin aktiv, Bärenwald-Branding ok)

| Mail | Trigger |
|------|---------|
| Neuer Vorgang | `POST /api/meldung` → Org-Mail inkl. Mieter-Status-Link |
| Status / Bautagebuch / Ablehnung | `notifyHvMieterEvent` statt Mieter-Mail |
| Freigabe, Angebot, … | unverändert HV-intern |

### ~~Mieter-Mail-Typen~~ → deaktiviert

| ~~Mail~~ | ~~Trigger~~ |
|----------|-------------|
| ~~Meldung eingegangen~~ | — |
| ~~Status / Termin~~ | → HV-Event |
| ~~Einladung Ergänzen~~ | → Link im Portal kopieren |

---

## Arbeitspaket 4 — Mieter-Web-Touchpoints branden

| Route | WL-Ziel |
|-------|---------|
| `/melden/[org]` | Org-Logo, Name, Primärfarbe, Titel, Favicon |
| `/melden/[org]/[objekt]` | Wizard, Datenschutz mit Org-Name; **Wunschtermin-Step** (überspringbar, s. unten) |
| `/melden/status/[token]` | Timeline, Termin, Feedback — nur HV-Sprache |
| `/melden/bestaetigung` | Erfolg ohne Bärenwald/MeinBärenwald |
| `/melden/ergaenzen/[token]` | wie Meldeformular |
| `/melden/fehler` | neutral |

**MeinBärenwald** (`/portal`, privat): Design-Entscheidung offen — entweder Org-White-Label oder bewusst Bärenwald-Produkt. Für WL-Ziel: Org-Branding, HV-Kontakt statt `SITE_CONFIG`-Telefon.

**Wunschtermin-Step (Implementierung):** Neuer Wizard-Schritt sendet `dringlichkeit` an die bestehende API (`leads.zeitraum` — kein DB-Feld). Nutzerauswahl **überschreibt** den heutigen Kategorie-Default (`meldeKategorieToZeitraum()`); ohne Auswahl oder bei Überspringen bleibt der Default. Der Step ist **optional/überspringbar** — keine Pflicht-Terminangabe bei der Meldung.

---

## Kommunikationsarchitektur (bewusst nicht bauen)

- Reply-To-Routing / Postfach-Threads
- Chat / Nachrichten Mieter ↔ Bärenwald
- Freitext „Nachricht an Mieter“ aus CRM
- Mieter-Rechnung / Mieter-Mahnwesen (Option A)
- SPF/DKIM pro HV-Domain
- Multi-Domain-Hosting pro HV (Slug reicht: `/melden/musterverwaltung`)

### Erlaubte Mieter-Kanäle

| Kanal | Typ |
|-------|-----|
| Meldeformular | einmalige strukturierte Eingabe |
| Status-Link | read-only + definierte Aktionen |
| Termin | Slot wählen / bestätigen |
| Ergänzen-Link | strukturiertes Nachreichen |
| Feedback | Sterne + Freitext nach Erledigt |

### HV-Transparenz (leichtgewichtig)

Im Org-Portal am Vorgang: **Status-Link kopieren** + Glocke/HV-Mail bei Ereignissen (kein Mieter-Mail-Log mehr nötig).

---

## Wording-Leitfaden

| Rolle | Sprache |
|-------|---------|
| **Mieter** | „Ihre Hausverwaltung“, „wir bearbeiten Ihre Meldung“ — kein Bärenwald |
| **HV (Portal)** | Bärenwald intern erlaubt („Bärenwald erstellt Angebot“) |
| **Handwerker** | Portal-Hinweis: „Im Auftrag der Hausverwaltung [Name] vorstellen“; Termin-Mail: „Der Betrieb [Name] wurde von Ihrer Hausverwaltung beauftragt“ |

---

## Rechtliches (Anwalt — einmalig, dann Template)

| Thema | Umsetzung |
|-------|-----------|
| **AV-Vertrag** | Checkbox bei Registrierung + Bestands-Gate; `av_akzeptiert_am` |
| **Impressum Mieter-Seiten** | Anwalt: HV, Betreiber, oder beide — dann Template |
| **Datenschutz** | Org als Verantwortlicher, Bärenwald als Auftragsverarbeiter (generisch) |
| **Melde-Einwilligung** | `MeldeDatenschutzHinweis` — Links auf korrekte Org-/Zentral-URLs |

Referenz: [DATENSCHUTZ_MELDEFLOW_TODOS.md](./DATENSCHUTZ_MELDEFLOW_TODOS.md), [DATENSCHUTZ_CRM_HANDOFF.md](./DATENSCHUTZ_CRM_HANDOFF.md), [docs/legal/](./legal/).

---

## Priorisierung

### Sofort (parallel zum CRM, Portal-Repo)

1. Migration: Mieter-Kontakt + AV-Felder
2. Leak-Audit + Template-Anpassungen (Copy, Footer, Signatur)
3. Bestands-Org-Gate (AV + Kontakt beim Login)
4. Fallback-Fußzeile bis Kontakt gepflegt
5. Melde-Wizard: Wunschtermin-Step (optional, `dringlichkeit` → `leads.zeitraum`; Nutzerwahl vor Kategorie-Default, Default bei Skip)

### Wave 2 (Infrastruktur)

5. Neutrale Versanddomain + DNS
6. Melde-/Status-UI: Primärfarbe, Favicon, Titel pro Org
7. Onboarding-Strecke neue HVs (AV + Kontakt Pflicht)

### Wave 3 (Feinschliff)

8. Kommunikations-Log im Org-Portal
9. Partner-Hinweise / Termin-Wording
10. Designer-Mockups → UI-Polish nach Freigabe

---

## Mockup-Brief (Kurz)

Für Designer — Prio und Deliverables:

| Prio | Paket |
|------|--------|
| P1 | Mieter: Melden (6 Steps) + Status (Timeline, Termin, Feedback) — **voll WL** |
| P1 | HV: Vorgänge Freigabe + Aktiv/Erledigt |
| P2 | MeinBärenwald (WL-Entscheidung) |
| P2 | HV: Objekte + Objektakte (8 Tabs) |
| P3 | Partner-Portal (Bärenwald Partner, kein WL) |
| — | CRM-Dashboard nicht mocken (anderes Repo) |

**WL Do/Don't-Seite:** Org oben, HV-Kontakt-Fußzeile, No-Reply; kein Bärenwald auf Mieter-Routen. **Kein** Mockup für Mieter-Rechnung (Option A).

Ausführliche Screen-Liste: Team-Handoff / Chat „Mockup-Brief“ (Juli 2026).

---

## Abnahme Wave

- [x] DB-Felder live + Bestands-Gate aktiv (Code; Migration `20260817120000` anwenden)
- [ ] Leak-Checkliste für alle Mieter-Touchpoints grün
- [ ] Mails: neutraler From, Org-Anzeigename, No-Reply + HV-Kontakt (oder Fallback)
- [ ] Kleinreparatur: keine Mieter-Rechnung in UI/Flows
- [ ] CRM-Reihenfolge 0→1→2 unverändert umgesetzt (kein Blocker aus diesem Wave)
- [ ] Anwalt: Impressum/Datenschutz-Templates freigegeben

---

## Verwandte Docs

- [DESIGN_GAP_ANALYSE_PORTALE.md](./DESIGN_GAP_ANALYSE_PORTALE.md) — Mockup vs. Live, Designer-Prioritäten
- [VORGANG_STATUS_ROLE_MAPPING.md](./VORGANG_STATUS_ROLE_MAPPING.md) — `resolveVorgang` → Rollensicht (Voraussetzung Status-Design)
- [ORGANISATION_PORTAL.md](./ORGANISATION_PORTAL.md) — Routen & APIs
- [ORGANISATION_PORTAL_BACKEND.md](./ORGANISATION_PORTAL_BACKEND.md) — CRM-Handoff
- [DATENSCHUTZ_MELDEFLOW_TODOS.md](./DATENSCHUTZ_MELDEFLOW_TODOS.md)
- [PORTAL_KUNDEN_PHASEN.md](./PORTAL_KUNDEN_PHASEN.md)
- [PARTNER_PORTAL_PHASEN.md](./PARTNER_PORTAL_PHASEN.md)
