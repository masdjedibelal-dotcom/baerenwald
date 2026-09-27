# Inventur Portal + Website — 2026-09-26

Quelle: **nur Code** (`src/`, `scripts/check-*.mjs`, `package.json`). Kein Browser, keine DB, kein `audit-status.mjs` als Wahrheitsquelle. Messungen lokal am Repo-Stand.

---

## 1 · Die Apps in diesem Repo

| Präfix | Zweck | Design |
|--------|-------|--------|
| `/` (+ `/leistungen`, `/ratgeber`, `/kontakt`, `/ueber-uns`, Legal, `/[slug]`) | Marketing-Website | Website `--fl-` · `baerenwald-landing.css` |
| `/handwerker-muenchen` | SEO-Gewerke-Hub | Website `--fl-` |
| `/rechner`, `/portal-tools/rechner` | Preisrechner (öffentlich / noindex-Alias) | Website `--fl-` + Funnel (`BwRechnerPageClient`) |
| `/melden/*` | Schaden melden (HV-WL, ohne Login) | Portal `--p2-` + `melden.css` + Brand |
| `/portal/*` | MeinBärenwald (HV/Privat/Gewerbe/Eigentümer/HM/Mieter) | Portal `--p2-` · `globals.css` |
| `/partner/*` | Partner-/Handwerker-Portal | Portal `--p2-` |
| `/auth/callback` | Supabase-Auth | — |

Root `src/app/layout.tsx` lädt immer `globals.css` (`--fl-*` + `--p2-*`). Seiten: 34× `page.tsx`.

---

## 2 · Die Portal-Rollen

Nav-Rollen (`PortalNavRole`, `src/lib/portal2/nav-items.ts`): `kunde_hv` · `kunde_privat` · `eigentuemer` · `hausmeister` · `handwerker`.  
Mieter = **kein** eigener Nav-Role → `kunde_privat` + HV-Brand. Einstieg alle `/portal` außer Partner `/partner`.

| Rolle | Einstieg / Hauptkomponente | Nav | Tun (schreibend) | White-Label |
|-------|----------------------------|-----|------------------|-------------|
| **kunde_hv** | `/portal` → `OrganisationPortalClient` | Übersicht, Vorgänge, Objekte, Serviceabos*, Marktplatz*, Einstellungen (*„In Kürze“) | Freigabe/Ablehnen Meldung, Angebot annehmen/ablehnen, Abnahme, Branding, Objekte/Einheiten, Einladungen | Org-eigene Farben; Gate `OrganisationWhitelabelGate` · `/api/org/whitelabel` |
| **kunde_privat** (Privat/Gewerbe) | `/portal` → `PortalClient` | Übersicht, Vorgänge, Einstellungen | Schaden melden (Create), Angebot an/ab, Auftragsänderungen annehmen | nein (Bärenwald) |
| **Mieter** | wie privat + `hausverwaltungBrand` | wie privat | Melden (Kanal `portal_mieter`), Termin bestätigen/ablehnen, Feedback; **keine** Preise/Positionen/Rechnungen in HV-Mieter-View | ja — Auth `authWL("mieter")`, Shell-Brand |
| **eigentuemer** | `/portal` → `EigentuemerPortalClient` | Übersicht, Vorgänge, Objekte | Anfrage erstellen, Angebot an/ab | ja — immer HV-Brand |
| **hausmeister** | `/portal` → `HausmeisterPortalClient` | Übersicht, Vorgänge, Objekte | Anfrage, Prüfauftrag, Befund (`OrgHmBefundPanel`) | ja — HV-Brand |
| **handwerker** | `/partner` → `PartnerClient` | Übersicht, Vorgänge, Einstellungen | Annahme/Ablehnung, Zeiten, Regie, Fotos, Docs, Rechnung, Vertrag; **kein** Create-FAB | nein |

Org-RBAC zusätzlich: `admin` \| `sachbearbeiter` \| `lesen` (`src/lib/org/org-rbac.ts`).

---

## 3 · Was der Kunde über einen Vorgang sieht

Daten: `get-portal-data.ts` → `build-kunde-vorgaenge.ts` → `PortalVorgangDetail` / HV: `OrganisationHvVorgangDetail`.

| Stufe | Sieht | Kann | Verborgen |
|-------|-------|------|-----------|
| **Anfrage** | Lead-Detail, Docs | — (Melden = neuer Vorgang) | internes CRM |
| **Angebot** | Positionen, Summe, Sticky CTA | Annehmen / Ablehnen | **Entwürfe** (`portal-angebot-sichtbarkeit.ts`) |
| **Auftrag** | Positionen, Updates, Docs | Änderungen annehmen; HV: Freigabe, Abnahme; Termin/Feedback | Partner-EK; ungefilterte HW-Updates |
| **Rechnung** | unter Dokumente (`art: rechnung`) | lesen | — |

**Regie / Nacharbeit — klar:**

| Zustand | Kunde sieht? |
|---------|--------------|
| `anerkennung_status` leer / `nicht_noetig` / `anerkannt` | ja (normale Positionszeile, **kein** Label „Regie“) |
| `in_pruefung` oder `abgelehnt` | **nein** — Filter `positionSichtbarFuerKunde` in `src/lib/portal/kunde-auftrag-aenderung.ts` |
| UI-Text „Regie“ in `components/portal` | **0 Treffer** |
| Nacharbeit als eigener Kundentyp | **nein** |

Weitere Filter: Bautagebuch nur `fuer_kunde_freigegeben`, kein `eintrag_typ=befund` (`get-portal-data.ts`). Upload im Kunden-Vorgangsdetail: **nein**.

---

## 4 · Was der Handwerker sieht und tut

| Thema | Komponente | R/W | Action |
|-------|------------|-----|--------|
| Auftragsannahme | `PartnerOffenDetail` / `PartnerAuftragAnfrageDetail` / `PartnerEinholungDetail` | W | `partner-auftrag-bestaetigen.ts`, `partner-anfragen.ts`, `partner-vertrag.ts` |
| Zeiterfassung | `PartnerPositionLebenszyklusList` | W | `startPartnerPosition`, `addPartnerPositionFortschritt`, `completePartnerPosition` |
| Regie melden | dieselbe Liste („+ Nachtrag / Regie“) | W | `createPartnerWeitereArbeit` → `typ:"regie"`, `in_pruefung` |
| Fotos | `PartnerMultiFotoSlot` / `PartnerFachdokuSlots` | W | Position-FormData; `partner-fachdoku.ts` |
| Bautagebuch | UI in Lebenszyklus-Liste | W | `createPartnerTagebuchEintrag` (`partner-position-eintraege.ts`); Legacy `partner-bautagebuch.ts` **ohne** Component-Import |
| Abrechnung | `PartnerAuftragDetail` + Auto-Docs | W | `submitPartnerRechnung`, `submitPartnerAutoRechnung`, `markPartnerAuftragErledigt` |
| Dokumente | AuftragDetail + Preview-Modal | W+R | `partner-angebote.ts`, Compliance-Upload |

Partner sieht Regie auch in Prüfung (`get-partner-data.ts`).

---

## 5 · Datenzugang und Trennung

| Frage | Befund |
|-------|--------|
| Datenweg | Cookie-Auth: `createClient()` (`src/lib/supabase/server.ts`); Business-Daten: **`supabaseAdmin`** (`src/lib/supabase.ts`); API: `src/app/api/portal/` (8), `api/partner/` (4+abnahme), `api/org/` (51) |
| CRM-HTTP | `partner-crm-api.ts`, `notify-crm-*`, `pdf/render-via-crm.ts` → `NEXT_PUBLIC_DASHBOARD_URL` / `CRM_DASHBOARD_URL` |
| Trennung | **Code-Gates** (`requireOrganisationSession`, `requireAccountSession`, `requireEigentuemer…`, Partner-Asserts, Secrets). RLS in App-Logik praktisch ungenutzt |
| Service-Role | **190** Dateien in `src/` mit `supabaseAdmin` und/oder `SUPABASE_SERVICE_ROLE_KEY`; Key-String explizit in **5**: `supabase.ts`, `dev/auto-login`, `crm-enter`, `crm-impersonation-session`, `persist-lead` |

**shared-domain / Sync-Manifest (16):**

| Portal-Pfad |
|-------------|
| `src/lib/shared-domain/` (9): `aushang-template`, `build-subject`, `colors`, `geld-datum`, `html-to-plain-text`, `pdf-chrome`, `regie-betrag`, `status-map`, `status-vokabular` |
| `src/lib/crm-vorgang/` (6): `types`, `vorgang-labels`, `vorgang-anzeige-titel`, `hv-lead-helpers`, `anfrage-akut-schwelle`, `resolve-vorgang` |
| `src/lib/media/optimize-image-for-upload.ts` |

---

## 6 · Mails und Benachrichtigungen

| Kanal | Mechanismus |
|-------|-------------|
| Mail | **Portal selbst via Resend** (`send-branded-mail.ts` + **12** Call-Sites); kein nodemailer |
| CRM | Notifies/PDF zusätzlich (`notify-crm-*`), nicht der Haupt-Mailversand |
| Glocke Kunde | `PortalUserNotificationBell` → `GET /api/portal/notifications` → `portal_notifications` |
| Glocke Partner | `PartnerNotificationBell` → `fetchPartnerNotifications` → `notifications` |
| Glocke HV | `HvNotificationBell` → `/api/org/hv-notifications` → `hv_notifications` |
| Push | `web-push` + VAPID; `scheduleWebPushToUsers`; Prefs `push_prefs` / `push_subscriptions` |
| Badge | `PortalCountBadge` an den Glocken |

---

## 7 · Was der Build erzwingt

Build-Kette (`package.json` `build`): drift-warn → empty-catch-warn → service-role-gate → no-hardcoded-supabase-ref → portal-btn-warn → shared-domain-sync → status-writes → **db-spalten** → preis-seiten → inline-css-werte → audit-status → `next build`.

| Script | Prüft | Build? | Zustand jetzt | Allowlist |
|--------|-------|--------|---------------|-----------|
| `check-drift-warn` | Hex/TW/raw button/Modals/data-ohne-error | ja | warn, **exit 0** | — |
| `check-empty-catch-warn` | leere catch | ja | warn, exit 0 | `P4-2-ok` |
| `check-service-role-gate` | Service-Role ohne Gate | ja | OK | ~16 Pfade |
| `check-no-hardcoded-supabase-ref` | feste Projekt-Refs | ja | OK | — |
| `check-portal-btn-warn` | `portal-btn` auf raw button | ja | OK | nur PortalButton |
| `check-shared-domain-sync` | Byte-Sync CRM | ja | OK (16) | — |
| `check-status-writes` | Status-`.update` nur write-* | ja | OK | **30** Zeilen |
| `check-db-spalten` | Spalten vs Typen | ja | **25 Verstöße, exit 1** | **0** (max 0) |
| `check-preis-seiten` | Partner≠Kunde Preise | ja | OK | **0** (max 0) |
| `check-inline-css-werte` | kaputte Inline-CSS | ja | OK | — |
| `check-nav-suche` | Suche/Nav-Labels | nein (`guard:nav-suche`) | OK | — |

**Selbst-Skip bei fehlender Voraussetzung:**

| Guard | Bedingung | Verhalten |
|-------|-----------|-----------|
| `check-shared-domain-sync` | kein CRM-Manifest (`baerenwald-system` / `CRM_ROOT`) | **übersprungen, exit 0** |
| `check-db-spalten` | keine `supabase.ts` und CI/Netlify ohne Sibling | **übersprungen, exit 0**; lokal ohne Typen: exit 1; mit Sibling: prüft streng |

---

## 8 · Wo Doku und Code auseinandergehen

| Doku-Behauptung | Code | Beleg |
|-----------------|------|-------|
| `RoleStatusPill` = Wrapper (`PORTAL-PATTERN-KATALOG.md` Z.43) | Datei **fehlt**; nur `PortalStatusPill` | `COMMIT-PLAN` meldet Löschung; `ls` negativ |
| `files_over_1000` = 20 (`TODO-ENTWICKLUNG.md`) | **27** Dateien >1000 Zeilen | `wc`/`find` |
| `logDbError_calls` = 2 in Kennzahlen-Tabelle | **997** Calls in `src/` | `rg logDbError`; P4-1-Zeile sagt 804 — Tabelle intern widersprüchlich |
| `VorgangTimeline` noch im Katalog (Z.146) / P6-9 offen | Komponente **gelöscht** | kein File; nur CSS-Rest möglich |
| Katalog „~70“ portal-toast Call-Sites | **64** Importe von `@/lib/shared/portal-toast` | `rg -l` |
| `sync_guard: false` in TODO-Kennzahlen | Sync-Guard lokal **grün** (16 Dateien) | `check-shared-domain-sync` |
| `FunnelClient` tot gelöscht (`OFFENE-FRAGEN`) | bestätigt — 0 Dateien | OK |

---

## 9 · Zustand des Designsystems, gemessen

Datei: `src/app/globals.css` · Tokens: `src/lib/portal2/tokens.ts` (0 Hex).

| Metrik | Zahl |
|--------|------|
| Zeilen `globals.css` | **6956** |
| `border-radius`-Deklarationen / unique Werte | **159** / **13** (fast nur `--p2-radius-*`, `0`, `50%`, `--portal-btn-radius`) |
| Pille-Schreibweisen | Token `--p2-radius-pill` (=999px) + Legacy `--radius-pill`, `--r-pill`; in Rules: `var(--p2-radius-pill)` **38**; `rounded-full` **4**; literal `999px`/`9999px` als radius **0** |
| `box-shadow` gesamt / mit `var(` / mit `--p2-shadow` | **113** / **86** / **80** |
| Hex roh (Vorkommen / unique) | **617** / **158** |
| `var(--…, Rückfall)` | **453** (`var(--…,`) |
| `:focus-visible` / `outline: none` | **7** / **7** |
| `aria-busy` in CSS / in `src` TSX | **0** / **6** (5 Dateien) |
| Abstands-Tokens | **ja**: `--p2-space-1…6` + `--p2-row-gap` / `--p2-stack` / `--p2-row-pad` / `--p2-card-pad` |
| unique `gap:`-Werte | **28** (Tokens + viele Roh-px/rem) |
| Unlayered Regelblöcke (außerhalb `@layer`) | ≈ **131** (`@layer base` + `@layer components` ab Z.555/608) |
| `<PortalButton` / davon `action={false}` | **296** / **62** |

---

## 10 · Offene Baustellen, gemessen

| Thema | Ist |
|-------|-----|
| Dateien `src/` >1000 Zeilen | **27**; Top5: `baerenwald-landing.css` 9169 · `globals.css` 6956 · `BwRechnerPageClient.tsx` 3098 · `conversion-widget.css` 2488 · `price-calc.ts` 1970 |
| `useIsPortalMobile` Call-Sites | **4** Komponenten (+ Hook); `matchMedia` zusätzlich in Timeline, Composer-Inset, Doc-Viewer, Push (display-mode) |
| Spalten-Guard | geprüft **2169** · übersprungen **338** · Verstöße **25** · Allowlist **0** → **exit 1** (Sibling-Typen) |
| `logDbError` nach Write ohne throw/return in Folgezeilen | Heuristik **~86** (mit Abort ~187; Calls gesamt **997**) |
| `TODO` / `FIXME` in `src/` | **0** / **0** |

---

## 11 · Was beim Lesen überrascht hat

1. **Service-Role-Dominanz:** ~190 Dateien Admin — Sicherheit = Code-Gates, nicht RLS.
2. **`check-db-spalten` im Build, lokal rot (25), CI oft skip** — Guard asymmetrisch.
3. **Drei Notification-Tabellen**, eine Bell-UI-Familie.
4. **Regie beim Kunden:** Daten geladen, aber bis CRM-Anerkennung unsichtbar; kein „Regie“-Label je.
5. **`partner-bautagebuch.ts` Actions** ohne UI-Import — Schreiben läuft über `partner-position-eintraege`.
6. **`PartnerListCard`** = 7-Zeilen-Reexport von `PortalListCard`.
7. **`PortalEntityCard` gelöscht**, 0 Refs — Katalog/`RoleStatusPill` nicht nachgezogen.
8. **Shared-Domain-Ordner 9**, Sync-Manifest **16** (inkl. `crm-vorgang` + media).
9. **Doppelte Pill-Legacy-Vars** (`--radius-pill`, `--r-pill`, `--p2-radius-pill`).
10. **`gap` stark gemischt** trotz D1-Space-Tokens.

---

*Ende Inventur 2026-09-26*
