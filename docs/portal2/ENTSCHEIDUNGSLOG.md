# Portal 2.0 — Entscheidungslog

Referenz-Mock: `Baerenwald Portale (5).html` (App-Quellcode im Template-Script).  
Regeln: ein Commit pro Abschnitt · Build grün · Belal pusht · Migrationen vor Apply zeigen · keine Attrappen · Bestands-Server-Flows unangetastet.

---

## A1 — Design-Tokens (`const C`)

| Entscheidung | Begründung |
|---|---|
| Tokens als `PORTAL_C` + CSS `--p2-*` unter `.portal-ui` | Mock-Werte 1:1; Marketing-Site behält eigene Tokens |
| `body`-Font aus Mock-CSS `body { font-family }`, nicht aus `const C` | `const C` enthält nur `head`; Spec verlangt `C.head`/`C.body` → Body = Mock-CSS |
| Tailwind: `p2.*` als Hex (nicht CSS-var) | Opacity-Modifier (`bg-surface-card/95`) brauchen Hex; Brand-Overrides weiter via `--p2-*` / `--org-*` in CSS |
| Bridge: `--surface-page`, `--text-*`, `--accent` in `.portal-ui` auf `--p2-*` | Bestehende Portal-Klassen + Custom-CSS übernehmen Mock-Look |
| Keine Rundung der Hex/RGBA-Werte | Spec A1 |
| Scope nur `.portal-ui` | Shell/Auth/Melde nutzen bereits `portal-ui`; Landing unberührt |

**Dateien:** `src/lib/portal2/tokens.ts`, `src/app/globals.css`, `tailwind.config.ts`

**Abnahme:** Visuell in Portal: Hintergrund `#e6e8e6`, Ink `#16201B`, Primary `#2E7D52`.

---

## A2 — White-Label (`ORG`, `BRAND_PRESETS`, `applyBrand`)

| Entscheidung | Begründung |
|---|---|
| `BRAND_PRESETS` 1:1 aus Mock (5 Farben) | Spec |
| `ORG` via `orgBrandFromKunde` aus `kunden` | Keine Demo-Stammdaten in Live-UI; Steiner nur Fallback mit `useDemoFallback` |
| Neue DB-Felder: `org_primary_color_dk/soft`, `org_logo_kuerzel`, `org_sub`, `org_telefon`, `org_strasse`, `org_ort` | Mock-ORG braucht Dk/Soft + Stammdaten; `org_primary_color` existiert bereits |
| `applyBrand` → CSS `--org-primary*` + `--p2-primary*` | PortalShell, Melde, Status, Auth-WL |
| Editor Branding | **D6/D12 erledigt** (`OrganisationBrandingEditor`) |
| D12 Rollen-Varianten | **v3 erledigt** — HV / HW Firmendaten / Mieter Konto+Sprache / Privat pf |
| Migration vor Apply zeigen | Spec-Stopp |

**Migration:** `supabase/migrations/20260818120000_org_branding_palette.sql` — **noch nicht applyen, bis Belal freigibt.**

**Dateien:** `brand-presets.ts`, `apply-brand.ts`, `PortalBrandRoot.tsx`, `PortalShell`, Melde-Pages, `load-organisation-kunde`, `resolve-melde-kontext`

---

## A4 — Status-Modell (`STATUS`, `FLOW`) — Pflicht-Mapping

### Mock-STATUS (Labels/Farben 1:1)

| Key | Label | Farbe (`c`) | Hintergrund (`bg`) |
|-----|-------|-------------|-------------------|
| `gemeldet` | Neu gemeldet | `#1F4FA8` | `#E4ECF7` |
| `freigegeben` | Freigegeben | `#1F4FA8` | `#E4ECF7` |
| `angefragt` | Handwerker angefragt | `#8A5A06` | `#FBF1D6` |
| `angebot` | Angebot vorgelegt | `#8A5A06` | `#FBF1D6` |
| `auftrag` | Beauftragt | `#1F6A3F` | `#DDEEDF` |
| `abschluss` | Abschluss / Signatur | `#1F6A3F` | `#DDEEDF` |
| `rechnung` | Rechnung offen | `#8A5A06` | `#FBF1D6` |
| `bezahlt` | Abgeschlossen | `#4B5563` | `#EAEDEC` |

**FLOW:** `gemeldet → freigegeben → angefragt → angebot → auftrag → abschluss → rechnung → bezahlt`

### Mapping Mock ↔ reale Felder (verbindlich)

| Mock | Reale Felder / Ableitung | Notes |
|------|--------------------------|-------|
| **gemeldet** | `leads` existiert; `resolveVorgang.phase=anfrage`; typisch `hv_meldung_status∈{neu,null}`; `org_freigabe_status∈{ausstehend,nicht_noetig}` | **`leads.vorgang_phase` wird nicht gelesen** |
| **freigegeben** | `org_freigabe_status=freigegeben` **oder** `hv_meldung_status=angebot_eingefordert`; `badges.wartet_freigabe=false` | Privatkunde: oft übersprungen („Automatisch freigegeben“) |
| **angefragt** | HW-Anfrage/Zuweisung; `angebot_handwerker` **oder** `handwerkerAktionOffen`; `phase=angebot`+`entwurf` **oder** `extra.hwAngefragt` | Noch kein vorgelegtes Angebot |
| **angebot** | `angebote` `gesendet`/`angenommen` **oder** HW-Kalkulation eingereicht (`extra.angebotVorgelegt`); `phase=angebot` | UI: ein „Empfohlenes“-Angebot (ENTSCHEIDUNG 10) |
| **auftrag** | `auftraege` mit `status∈{offen,in_arbeit}`; `phase=auftrag`; ggf. `hw_status=uebernommen` / `projektvertrag_bestaetigt_am` | Ausführung |
| **abschluss** | `auftraege.status=abnahme` **oder** `hv_portal_abnahmen` (Signatur) **oder** Partner-/Kunden-Signatur (G4); `extra.signaturVorhanden`/`abnahmeOffen` | Beidseitige Gegenzeichnung = G4 |
| **rechnung** | `rechnungen.status∈{entwurf,gesendet}`; `phase=rechnung`, ≠ bezahlt; `ueberfaellig` nur Badge | Mieter: STG verdichtet → „In Bearbeitung“ |
| **bezahlt** | `rechnungen.status=bezahlt` **oder** erledigt ohne Rechnung (`portalErledigt`) | Mock-Label „Abgeschlossen“ |

### Architektur-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| Kein 5. Statussystem in der DB | Display-Meilensteine über `resolvePortalFlowStatus`; Daten bleiben Lead/Angebot/Auftrag/Rechnung |
| Kanonisch: `resolveVorgang()` + `PortalFlowExtraSignals` | Resolver kennt Freigabe/HW-Angebot/Signatur nicht vollständig |
| Chip-Farben nur aus `PORTAL_STATUS` | Timelines/Chips/Notifications binden an Mapping-Modul |
| Mieter = `MIETER_STG` (4), nicht FLOW (8) | Spec D9; Mapping `portalFlowToMieterStg` |
| Notifications (B4) | Ereignistypen referenzieren FLOW-Keys / Mapping-Zeilen |

**Code:** `src/lib/portal2/status.ts`, `status-mapping.ts`, `PortalFlowStatusChip.tsx`  
**Tests:** `npm run test:portal2-status`  
**Verwandt:** `docs/VORGANG_STATUS_ROLE_MAPPING.md` (Resolver-Rollen; A4 ergänzt Mock-FLOW)

---

## A5 — Icon-System (`MockIcon`)

CRM-Lösung portiert aus `baerenwald-crm-dashboard_ARCHIV` (+ Portal-Glyphen).

| Entscheidung | Begründung |
|---|---|
| `MockIcon` mit **Pflicht-`ctx`** | CRM `--icon-*`-Token-Binding; TypeScript + Runtime + Scan-Guard |
| Stroke-Rendering (`stroke=currentColor`, `fill=none`, `strokeWidth=2`) | Lucide wie CRM; gefüllte Ausnahme `star-filled` |
| Unbekannter Name → Dev-Throw / Prod-null | Kein Platzhalter-Icon (Attrappen-Verbot) |
| Zwei Build-Guards (`npm run guard:portal2-icons`) | (1) Glyph/Nav → ICON_MAP konsistent (2) jedes `<MockIcon>` hat `ctx=` |
| Glyphen-Tabelle im Log + `PORTAL_GLYPH_TO_ICON` | Spec A5; Erweiterungen beim Screen-Bau |

### Glyph → lucide (Starttabelle)

| Glyph | MockIcon `n` | lucide |
|-------|--------------|--------|
| ◈ | `layout-dashboard` | LayoutDashboard |
| ▤ | `list` | List |
| ▦ | `building` | Building2 |
| ◇ | `package` | Package |
| ⚙ | `settings` | Settings |
| ✓ | `check` | Check |
| ✕ | `x` | X |
| ★ / ⭐ | `star` / `star-filled` | Star |
| ⚠ | `alert-triangle` | AlertTriangle |
| ✉ | `mail` | Mail |
| 📄 | `file-text` | FileText |
| 🔔 | `bell` | Bell |
| 🔒 | `lock` | Lock |
| 🏠 | `home` | Home |
| ⋯ | `dots` | MoreHorizontal |
| ✎ | `pencil` | Pencil |
| ⚡ | `zap` | Zap |
| 🔍 | `search` | Search |
| 📡 | `wifi-off` | WifiOff |

**ctx-Werte:** `default` · `muted` · `emphasis` · `active` · `nav` · `nav-active` · `row` · `row-hover` · `sidebar` · `sidebar-hover` · `sidebar-active`

**Dateien:** `src/lib/portal2/mock-icons.ts`, `src/components/shared/MockIcon.tsx`, `PortalNavIcon.tsx`, `globals.css` (`.portal-ui` Icon-Tokens), `scripts/check-portal2-icons.cjs`

**Hinweis B2:** `PortalShell` nutzt vorerst noch `LucideIcon`-Props; Nav-Umschaltung auf `<MockIcon n|glyph ctx="sidebar">` in Shell-Abschnitt.

---

## A6 — Fehler-/Leer-Zustände (`screenState`)

Mock-Texte 1:1 als globale Komponenten; jeder Portal-Screen nutzt sie.

| Entscheidung | Begründung |
|---|---|
| Copy-Quelle `resolvePortalStateCopy` / `portal-states.ts` | Einzelne Wahrheitsquelle; Spec-Strings in `PORTAL_STATE_SPEC_STRINGS` |
| UI: `PortalStateView` + Wrapper (`PortalEmptyState`, `…NotFound`, `…Forbidden`, `…ServerError`, `…Offline`) | Wiederverwendbar, `kind`/`role`/`canCreate` wie Mock |
| Leer-Subtitle nach `role` | Mock: Handwerker / Eigentümer·Mieter / Default (Kunde·HV) |
| Filter-Leer ≠ Mock-Leer | „Keine offenen/aktiven Vorgänge“ bleibt Kurztext; Mock-Leer nur bei 0 Datensätzen |
| `error.tsx` / `not-found.tsx` unter `/portal` und `/partner` | Route-Boundaries → `server` / `e404` |
| `PortalOfflineGate` in `PortalShell` | Offline-State auf allen Shell-Screens |
| Glyphen 🔍→`search`, 📡→`wifi-off` | State-Icons; A5-Tabelle ergänzt |

### Spec-Strings (Pflicht)

| Text | Verwendung |
|------|------------|
| Etwas ist schiefgelaufen | `server` Titel |
| Erneut versuchen | `server` / `offline` Primär |
| Keine Verbindung | `offline` Titel |
| Kein Zugriff | `zugriff` Titel |
| Seite nicht gefunden | `e404` Titel |
| Zur Übersicht | `e404` / `zugriff` Primär |
| Noch keine Vorgänge | `leer` Titel |
| Für Ihre Wohnung liegt aktuell keine Meldung vor. | `leer` Subtitle Eigentümer/Mieter |
| Support kontaktieren | `server` / `zugriff` Sekundär → `/kontakt` |

**Dateien:** `src/lib/portal2/portal-states.ts`, `PortalStateView.tsx`, `PortalOfflineGate.tsx`, Portal-/Partner-Clients, `portal|partner/{error,not-found}.tsx`  
**Tests:** `npm run test:portal2-states`  
**Icons:** A5-Glyph-Tabelle + `search` / `wifi-off`

---

## A7 — Basisdaten (MELDE_OBJEKTE / MELDE_SLOTS / HANDWERKER)

Anzeigeformen 1:1 zum Mock; **keine** hartkodierten Demo-Stammdaten zur Laufzeit.

| Entscheidung | Begründung |
|---|---|
| `toMeldeObjektDisplay` aus `kunden_objekte` | Spec: Anzeigeform = Objekte-Tabelle (Teil E); Felder `titel`→`name`, PLZ+Ort→`adr`, `einheiten_hinweis`→`we` |
| `we` optional / `null` weglassen | Kein Fake-„n Wohneinheiten“; Count nur wenn `einheitenCount` aus Teil E geliefert wird |
| `toMeldeSlotDisplay` aus `auftrag_terminslots` | Spec: aus Konfiguration/DB, nicht Mock-Arrays; Format „Do 10.07.“ · „09–11 Uhr“ |
| Melde-Wizard-Verfügbarkeit ≠ MELDE_SLOTS | Wizard bleibt qualitativ (`sofort`/`diese_woche`/`flexibel`); konkrete Slots = Partner-Terminvorschläge |
| `toHandwerkerDisplay` aus Handwerker-Stamm | `firma\|\|Name`, Gewerke als `trade` („A · B“), `rating` nur bei echten `bewertung_*` |
| Rating weglassen ohne Daten | Spec: kein Fake; Regel `bewertung_anzahl >= 1 && bewertung_gesamt != null` |
| Keine neue Migration | Felder existieren (`einheiten_hinweis`, `auftrag_terminslots`, `handwerker.bewertung_*`) |

### Mapping Mock → Real

| Mock | Real |
|------|------|
| `MELDE_OBJEKTE[].name` | `kunden_objekte.titel` |
| `MELDE_OBJEKTE[].adr` | `plz` + `ort` (Fallback Straße) |
| `MELDE_OBJEKTE[].we` | `einheiten_hinweis` (± Count Teil E) |
| `MELDE_SLOTS` | `auftrag_terminslots.slot_beginn` / `slot_ende` |
| `HANDWERKER.name` | `firma` \|\| Ansprechpartner-Vollname |
| `HANDWERKER.trade` | aufgelöste `gewerkNamen` joined „ · “ |
| `HANDWERKER.rating` | `bewertung_gesamt` nur wenn vorhanden |

**Dateien:** `src/lib/portal2/basisdaten*.ts`, `melde-objekte.ts`, `melde-slots.ts`, `handwerker-display.ts`; Verdrahtung Melde-Kontext/Pages; Termine via `formatMeldeSlotLine`  
**Tests:** `npm run test:portal2-basisdaten`  
**Mock-Extract:** `MELDE_OBJEKTE.json`, `MELDE_SLOTS.json`, `HANDWERKER.json`

---

## B1 — Topbar (`topbar()`)

| Entscheidung | Begründung |
|---|---|
| `PortalTopbar` = Mock-Struktur ohne Demo-Controls | Spec: Rollen aus Auth, Ansicht aus Viewport — keine Mock-Pills/Selects |
| Aufbau: Mark · Titel · Sub · Divider · Spacer · rechts Slot | 1:1 `topbar()` Layout (padding 11/16, Mark 26² radius 6, Sub uppercase) |
| Rechts: `notifications` (Glocke B4) | Spec; bestehende Glocken via Slot; Suche/Abmelden bis Settings/B5 weiterhin im Slot erlaubt |
| Kein Desktop/Mobile-Toggle | Viewport via CSS/`lg:` |
| Mark: Logo → sonst Kürzel-Buchstabe auf `--org-primary` | WL (A2); Mock-Default „B“ |
| Shell nutzt Topbar statt altem 68px-Header | Einheitliche Chrome für Org/Partner/Kunde |

**Dateien:** `PortalTopbar.tsx`, `PortalShell.tsx`, `globals.css` (`.portal-topbar*`)  
**Nicht in B1:** `portalHeader`/Avatar → B5; Notif-Panel-Inhalt → B4

---

## B2 — Sidebar (`sidebar()` + `navItems()`)

| Entscheidung | Begründung |
|---|---|
| `PORTAL_NAV_ITEMS` / `getPortalNavItems(role)` 1:1 Mock | Spec Labels/Keys/Glyphen exakt |
| App-Section-IDs via `PORTAL_NAV_SECTION_BY_VARIANT` | URLs (`?section=vorgaenge`) bleiben; Mock-Keys nur für Icons/Labels |
| Handwerker inkl. **Firmendaten** | Mock `navItems`; Spec-Kurzform „Start · Aufträge“ ergänzt um Settings |
| Org: „Servicepakete“ / „Einstellungen“ (nicht Leistungen/Profil) | Label-Mock; Section-IDs `leistungen`/`profil` |
| Aktiv = weiße Pill + Brand-Dunkel | Mock `act(k)` Styles; Icons `ctx=sidebar-active` |
| Sidebar 212px, Padding/Abstände Mock | `padding 14/10/12`, Item `10/12`, Gap Icon 12, radius 9 |
| Owner-Zeile oben (uppercase faint) | Mock `sidebar` owner; Topbar trägt Marke |
| Create-Button in Sidebar (`createAction`) | Mock `canCreate`+`createLabel`; Label-Feinheiten in B3 |
| GPT/Planer aus Partner-Nav entfernt | Nicht in Mock-navItems; Deep-Link/URL bleiben |
| Rolle aus Auth später (Teil F) | Clients setzen feste Role-Keys (`kunde_hv` / `kunde_privat` / `handwerker`) |

**Dateien:** `src/lib/portal2/nav-items.ts`, `PortalShell.tsx`, `PortalNavIcon`, Clients, `globals.css`  
**Tests:** `npm run test:portal2-nav`

---

## B3 — Bottom-Nav mobil (`bottomNav()` + Create)

| Entscheidung | Begründung |
|---|---|
| Gleiche Einträge wie Sidebar (`mobileNav ?? nav`) | Spec / Mock `bottomNav` = `navItems()` |
| Create nur wenn `createAction` gesetzt | Entspricht `canCreate()`; Handwerker ohne Prop |
| `portalCanCreate` / `portalCreateLabel` 1:1 Mock | Mieter „Schaden melden“ · Eigentümer „Anfrage erstellen“ · sonst „Neuer Vorgang“ |
| Create **zentral** in der Bottom-Nav | Spec „zentraler Create-Button“ (Mock hatte Corner-FAB; Spec priorisiert Mitte) |
| Sidebar behält `+ {label}`-Button | Mock `sidebar` Create |
| Floating-`fab`-Prop entfernt | Create nur über `createAction` (kein paralleles GPT-FAB) |
| Privat-Create → `/rechner` interim | Funnel-Screen Teil C; kein Attrappen-Modal |

**Dateien:** `src/lib/portal2/create.ts`, `PortalShell.tsx`, `globals.css` (`.portal-shell-mobile-*`)  
**Tests:** `npm run test:portal2-create`

---

## B4 — Benachrichtigungen (`bell`, `notifPanel`, `notifData`)

| Entscheidung | Begründung |
|---|---|
| Shared UI `PortalNotificationBell` 1:1 Mock | 38×38 Glocke, Badge `#D93B3B`, Panel 340px, Icon-Bubble 34² radius 9, „Alle gelesen“, „Keine Benachrichtigungen“, „Alle ansehen“ |
| Ereignistypen + Templates aus `notifData` | `PORTAL_NOTIF_VISUAL` / `PORTAL_NOTIF_TEMPLATES` pro Rolle (Kunde/Eigentümer/Mieter/Handwerker) |
| Neue Tabelle `portal_notifications` (nicht Partner-`notifications` umbenennen) | Partner-Tabelle hat anderes Schema (`handwerker_id`, `projekt_name`); Spec-Felder `empfänger_user`/`text` → `empfaenger_user_id`/`body` |
| HV weiter über `hv_notifications` + Adapter | Bestehende Org-Flows ungebrochen; UI einheitlich |
| Partner weiter über `notifications` + Adapter | Deep-Link/`onOpenVorgang` bleibt; Visual Mock-Typen (`neu`→`auftrag`) |
| Kunde/Eigentümer/Mieter: `/api/portal/notifications` | Liest neue Tabelle; vor Apply → leere Liste (`pendingMigration`) |
| `createPortalNotification` für CRM-Quellen | Status-Sync, Freigabe, Termin, Bautagebuch, HW-Angebot — Writer bereit, Cutover schrittweise |

### Schema (real)

| Spec | Spalte |
|------|--------|
| empfänger_user | `empfaenger_user_id` → `auth.users` |
| typ | `typ` (katalog: angebot/termin/status/freigabe/info/auftrag) |
| titel | `titel` |
| text | `body` |
| vorgang_ref | `vorgang_ref` |
| gelesen | `gelesen` (+ `gelesen_am`) |
| created_at | `created_at` |

**Migration:** `supabase/migrations/20260819120000_portal2_notifications.sql` — **STOP: noch nicht applyen, bis Belal freigibt.**

**Quellen (Writes):** CRM-Status-Sync · Freigabe-Anforderungen · Terminbestätigungen (CRM-Kommunikations-APIs) · Bautagebuch · HW-Angebots-Eingang.

**Dateien:** `notif-types.ts`, `notif-adapters.ts`, `create-portal-notification.ts`, `PortalNotificationBell.tsx`, `PortalUserNotificationBell.tsx`, `HvNotificationBell`/`PartnerNotificationBell` (Adapter), `api/portal/notifications`  
**Tests:** `npm run test:portal2-notif`  
**Mock-Extract:** `notifData.json`

---

## B5 — Portal-Header + Rollen-Badge (`portalHeader`, `roleBadge`)

| Entscheidung | Begründung |
|---|---|
| `PortalRoleBadge` 1:1 Mock-Farben/Labels | mieter/kunde/eigentuemer/handwerker; Pill 11.5 / 3×10 / radius 99 |
| `kunde_hv`/`kunde_privat` → Badge „Kunde“ | Mock hat nur `kunde`; Nav-Rollen mappen |
| `PortalHeader` = Bell-Slot + Desktop Avatar/Name | Mock `portalHeader`; mobil nur Bell (Avatar `lg:`) |
| Cluster in Topbar-rechts (nicht zweite Content-Leiste) | Brand bereits in Topbar (B1); doppelte Header-Zeilen vermeiden; Inhalt 1:1 |
| `headerUser.name` real aus Stamm/Auth | Keine Demo-Namen (Steiner/Sanitär Nord); Org=`org_anzeigename`/`name`, Partner=`firma`, Kunde=`name` |
| Avatar-Farben: Default Primary-Soft; Mieter `useOrgAvatarColors` | Mock: Mieter=ORG, sonst `C.primarySoft` |
| RoleBadge nicht standardmäßig neben Name | Mock zeigt Badge nur in Auth-Invite; Prop `headerRoleBadge` + Export für Invite (Teil F) |

**Dateien:** `role-badge.ts`, `PortalRoleBadge.tsx`, `PortalHeader.tsx`, `PortalShell` (`headerUser`), `globals.css`, Clients  
**Tests:** `npm run test:portal2-header`  
**Mock-Extract:** `portalHeader_roleBadge.json`

---

## B6 — Dokument-Viewer (`docViewer`, `openDoc`)

| Entscheidung | Begründung |
|---|---|
| Chrome 1:1 Mock (Leiste `#1b241f`, PDF-Badge `#FCE3E3`/`#A1242A`, „↓ Herunterladen“ Desktop, ×) | Spec / Mock `docViewer` |
| Inhalt = echte URL (iframe PDF / img Foto), keine grauen Platzhalter | Attrappen-Verbot; Mock-Linien nur Demo |
| `PortalDocViewerProvider` in `PortalShell` | Einheitlich Org/Partner/Kunde; `openDoc({name, meta?, url})` |
| Kind aus Ext/MIME: pdf · image · other | Spec „Fotos/PDFs/Dokumente“ |
| `DokumenteTabelle` öffnet Viewer (Fallback: neues Tab ohne Provider) | Bestehende Dokumentlisten verdrahtet |
| Download-Button mobil ausgeblendet | Mock `!mobile` |

**Dateien:** `doc-viewer.ts`, `PortalDocViewer.tsx`, `PortalDocViewerContext.tsx`, `PortalShell`, `DokumenteTabelle`, `globals.css`  
**Tests:** `npm run test:portal2-doc`  
**Mock-Extract:** `docViewer.json`

---

## B7 — Modal-Rahmen (`modalShell`)

| Entscheidung | Begründung |
|---|---|
| `PortalModalShell` 1:1 Mock | Scrim `rgba(16,25,20,.42)`, z-index 200, maxW 460, maxH 86vh |
| Mobil bottom-sheet / Desktop zentriert | Mock `alignItems` + Radius `20 20 0 0` vs `16` |
| Header: Titel · optional Sub · × | Spec „Titel, Body, Schließen“ |
| Backdrop-Klick + Escape schließen | Mock Backdrop; Escape a11y |
| Basis für B8–B10; Confirm/Storno migriert | Keine parallelen Overlay-Stile für neue Modals |

**Dateien:** `modal-shell.ts`, `PortalModalShell.tsx`, `PortalConfirmDialog`, `VorgangStornoDialog`, `globals.css`  
**Tests:** `npm run test:portal2-modal`  
**Mock-Extract:** `modalShell.json`

---

## B8 — Modal „Neuer Vorgang“ / `modalNeueAnfrage`

| Entscheidung | Begründung |
|---|---|
| Titel Mock **„Neue Anfrage“** + Sub „Wie möchten Sie starten?“ | Mock `modalShell`-Aufruf (Create-Label bleibt „Neuer Vorgang“ B3) |
| 5 Optionen Texte/Glyphen/Reihenfolge 1:1 | Spec / Mock `opts` |
| UI = `PortalModalShell` (B7) + Option-Rows | Spec Basis aller Modals |
| `OrganisationAnfrageHub` nutzt Modal; Folge-Flows real | Keine Attrappen; Meldung/Einladen/Projekt/Manuell/Servicepaket bleiben |
| Einladen öffnet bestehenden Einladen-Flow (B9 verfeinert) | Mock `modal:'einladen'`; E4-Details folgen |
| Ohne Objekte: Hinweis, keine Optionen | Bestehender Guard |

**Dateien:** `modal-neue-anfrage.ts`, `PortalModalNeueAnfrage.tsx`, `OrganisationAnfrageHub`, `OrganisationPortalClient`, Glyph `▧`→grid  
**Tests:** `npm run test:portal2-neue-anfrage`  
**Mock-Extract:** `modalNeueAnfrage.json`

---

## B9 — Modal „Einladen“ (`modalEinladen`) — ENTSCHEIDUNG: JETZT (Details E4)

| Entscheidung | Begründung |
|---|---|
| UI 1:1 Mock in `PortalModalShell` | Titel/Sub, Input+Kopieren, E-Mail/QR, Footnote |
| Link = Token-URL `/portal/einladung/{token}` | E4 Registrierung; Melde-Link bleibt D9 Weblink |
| „Per E-Mail senden“ = `mailto:` | D10/G5: keine Mieter-Mail von Bärenwald-Absender; Body mit HV-Name |
| QR via `buildMeldeQrUrl` | scannbar auf Einladungs-URL |
| Hub „Mieter einladen“ → `PortalModalEinladen` | B8-Option; Vorab-Formular (`meldung-vorab`) bleibt API für tiefere Erfassung |
| Tabelle `portal_einladungen` (token, einheit_ref, status, expires_at) | E4 Spec; `leads.einladung_token` unangetastet |

**Migration:** `supabase/migrations/20260820120000_portal2_einladungen.sql` — **STOP: noch nicht applyen, bis Belal freigibt.**

**Dateien:** `modal-einladen.ts`, `PortalModalEinladen.tsx`, `OrganisationAnfrageHub`, Migration  
**Tests:** `npm run test:portal2-einladen`  
**Mock-Extract:** `modalEinladen.json`

---

## TEIL E / E4 — Einladen + Registrierung — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Token pro Objekt/Einheit | `POST /api/org/portal-einladungen` → `portal_einladungen` |
| Ausgabe primär Link + QR | Modal erzeugt Token-URL; „Neu erzeugen“ möglich |
| Mail optional = mailto HV-Branding | Spec D10/G5 — nie Bärenwald-SMTP an Mieter |
| Registrierung `/portal/einladung/[token]` | HV-Branding (`MieterWlFrame` A2); Konto anlegen |
| Einlösen | `redeemPortalEinladung` → `einheit_bewohner` + Status `eingeloest` |
| Landing D10 | nach Einlösung Redirect `/portal` (Mieter-Konto / privat) |
| `leads.einladung_token` unangetastet | Vorab-Meldung (`meldung-vorab` / ergaenzen) bleibt |

**Migration (STOP):** `20260820120000_portal2_einladungen.sql` — token, einheit_ref, einheit_id, bewohner_id, status, expires_at, portal_kunde_id. Nicht applyen bis Freigabe.

**Dateien:** `portal-einladungen.ts`, `portal-einladungen-server.ts`, `PortalModalEinladen`, `PortalEinladungRegisterForm`, `/api/org/portal-einladungen`, `/api/portal/einladung/[token]`, `/portal/einladung/[token]`  
**Tests:** `npm run test:portal2-einladen`, `npm run test:portal2-einladungen`

---

## D10 — Mieter-Kommunikation / Konto-Landing — ENTSCHEIDUNG: JETZT (Regel)

| Entscheidung | Begründung |
|---|---|
| Keine Mieter-Mails von Bärenwald-Absender | Spec G5 / Wave WL; nur mailto (HV-Client) oder Status-Link |
| E4 Landing = `/portal` | Mieter-Konto nach Einladung; D12 Mieter Konto+Sprache |
| D9 Weblink bleibt ohne Login | Melden ohne Konto; E4 ist optionaler Konto-Pfad |

**Migration:** keine (siehe E4 `portal_einladungen`).

---

## B10 — Aushang/QR (`modalAushang`, `aushangPoster`, …) — ENTSCHEIDUNG: JETZT (Details E3)

| Entscheidung | Begründung |
|---|---|
| `PortalAushangPoster` Layout/Texte 1:1 Mock | HV-Kopf, Hero, QR-Centerpiece, Steps, Objekt-Zeile, Fuß |
| `PortalModalAushang` = Preview + Drucken + PDF | Mock `modalAushang` / `openAushang` |
| Live-URL = `buildMeldeUrl(org, melde_slug)` | E3; kein Mock-Domain-String |
| QR scannbar (`buildMeldeQrUrl`) | Spec „QR auf echten Melde-Link“; Mock-`qrMatrix` nur portiert als Referenz (nicht scannbar) |
| Print: `#aushang-print` @793px + `@media print` | Mock Print-Host; Meta „omelette-owns-print“ → CSS Print |
| Öffnen aus Objektliste („Aushang / QR“) | E3 „aus Objekt-Detail“ |
| PDF weiter über `/api/org/melde-aushang` | Bestehender Server-Flow ungebrochen |

**Dateien:** `aushang.ts`, `qr-matrix.ts`, `PortalAushangPoster`, `PortalModalAushang`, `OrganisationObjektePanel`, `globals.css`  
**Tests:** `npm run test:portal2-aushang`  
**Mock-Extract:** `aushang.json`

---

## TEIL C — Melde-Funnel (`screenCreate` + `meldenFrame` + Spec-Reihenfolge)

| Entscheidung | Begründung |
|---|---|
| Intro exakt Mock `meldenFrame` | „Vorgang melden“ / „Gleicher Meldeweg für Kunde, Eigentümer und Mieter.“ |
| Live-Schrittfolge = Spec (13 Schritte) | Spec TEIL C; Mock-`screenCreate` in v5 ist verkürzte Demo (objekt→kategorie→beschreibung→notfall→fertig) |
| `createStepValid`/`createNext` erweitert | Mock-Pflicht (objekt/kategorie/beschreibung≥10/notfall) + Spec-Schritte (bereich, fachdetail 3×, stamm Name+Mail, regeln, termin) |
| `FACHFRAGEN` 1:1 aus Mock (7 Kategorien × 3 Ja/Nein de+en) | Spec; `fenster_tuer` → Key `fenster` |
| Notfall = Normal / Akut mit Mock-Untertiteln | `screenCreate` notfall-Schritt wortwörtlich |
| Terminwunsch = generierte MELDE_SLOTS-Zeilen + qualitativ | Spec nennt MELDE_SLOTS; A7: keine Hardcode-Demo-Daten; `buildUpcomingMeldeSlotOptions` |
| Bestätigung = `meldenDoneCard` + Status-Link | Spec: keine Mieter-Mail; Link speichern |
| Fachfragen in `leads.funnel_daten.fachfragen` (+ `fachdetailAnswers`) | JSON-Feld existiert; **keine Migration** |
| Persistenz weiter `persistMeldungLead` | Server-Flow ungebrochen; `skipKundeMail` bleibt |

**Migration:** keine (Ablage in bestehendem `funnel_daten` JSON).

**Dateien:** `fachfragen.ts`, `fachfragen-data.json`, `melde-funnel.ts`, `melde-slots.ts`, `MeldeFormular`, `MeldenBestaetigungClient`, `melde-fachdetails.ts`, `persist-meldung-lead.ts`, `/api/meldung`  
**Tests:** `npm run test:portal2-melde-funnel`  
**Mock-Extract:** `FACHFRAGEN.json`, `MELDE_SLOTS.json`

---

## D1 — Kunde-HV Dashboard (`screenDashboard`)

| Entscheidung | Begründung |
|---|---|
| KPI-Labels 1:1 Mock | „Wartet auf Freigabe“ · „In Arbeit“ · „Gesamt offen“ |
| Zählungen über A4 `resolvePortalFlowStatus` | Spec: real aus Vorgängen laut Mapping |
| Wartet = `gemeldet` | Mock `status==='gemeldet'`; A4 Startzustand |
| In Arbeit = `auftrag` + `abschluss` | Mock `auftrag\|abschluss` |
| Gesamt offen = `gemeldet`+`freigegeben`+`angefragt`+`angebot` | Mock offen-Filter |
| Hero + „Zuletzt“ (4) + „Alle ansehen“ | Mock `screenDashboard` Aufbau |
| Wiedervorlagen + Create bleiben unter dem Mock-Block | Bestehende HV-Funktionen nicht entfernen |

**Dateien:** `hv-dashboard.ts`, `OrganisationHvDashboard.tsx`, `OrganisationPortalClient`  
**Tests:** `npm run test:portal2-hv-d1d2`

---

## D2 — Kunde-HV Vorgänge-Liste (`screenListe` / `hvChips`)

| Entscheidung | Begründung |
|---|---|
| `pageHead` „Hausverwaltung“ / „Vorgänge“ | Mock |
| `hvChips` Zur Freigabe (Badge) · Aktiv · Erledigt | Mock; Badge = Freigabe-Queue-Count (Meldungen+Angebote) |
| Sektion „Meldungen · Eingang“ | Mock Wortlaut + Count |
| Aktionen: Angebot einfordern · Kleinreparatur freigeben · Ablehnen | → `POST /api/org/meldung-aktion` (`actFreigeben`-Äquivalent) |
| Ablehnen-Mapping | `hv_meldung_status=abgelehnt`, `org_freigabe_status=abgelehnt` (bestehende Route) |
| Angebot einfordern → A4 `freigegeben`/`angefragt` | `hv_meldung_status=angebot_eingefordert` (wie Mapping A4) |
| Sektion „Angebots-Freigabe“ + Banner | Wortlaut exakt: „Bärenwald hat Angebote erstellt — bitte prüfen und freigeben.“ |
| Freigeben/Ablehnen Angebot | → `POST /api/org/freigabe` (Mock `actAngebotAnnehmen` ≈ freigegeben → Phase weiter) |
| Bulk-Löschen | **OFFENE-PUNKTE:** kein Live-Delete (Audit); Hinweis in UI |

**Dateien:** `hv-liste.ts`, `OrganisationVorgaengeSection`, `OrganisationFreigabePanel`, `OrganisationEingangPanel`, `HvMeldungListActions`, `HvAngebotListActions`, `OrgMeldungAktionBanner`, `OrgFreigabeBanner`  
**Tests:** `npm run test:portal2-hv-d1d2`

---

## D3 — Kunde-HV Vorgang-Detail (`screenDetail`)

| Entscheidung | Begründung |
|---|---|
| Layout-Reihenfolge Mock | cover → header → FLOW-timeline → Beschreibung → roleActionPanel → Bautagebuch \| metaCard + verlaufCard |
| `portalFlowTimeline` + `PortalFlowStatusChip` | A4 FLOW 8 Schritte im Detail |
| roleActionPanel-Texte 1:1 | Freigabe erforderlich · Angebote vergleichen · Empfohlenes … · In Ausführung · Abnahme & Signatur · Rechnung |
| Aktionen verdrahtet | Freigabe → `/api/org/meldung-aktion`; Empfohlenes annehmen → `/api/org/freigabe`; Abnahme → `OrgVorgangAbnahmeSection` |
| „Überweisung veranlassen“ | **kein toter Button** — Rechnungsstatus-Anzeige + OFFENE-PUNKTE; „Paket öffnen“ nur mit PDF-Href |
| ENTSCHEIDUNG 10 | `offers[]` mehrfachfähig, UI rendert genau 1× „★ Empfohlen“ |
| `angebotSumme` MwSt 19 % | Mock; `positionenTable` Netto/MwSt/Brutto |
| `abschlagsplan` 2×50 % | Mock-Logik aus Brutto |
| Verlauf-Format | `{Zeit} · {Text} · {Wer}` |
| Privatkunde-Hinweis | „Automatisch freigegeben (Privatkunde)“ |
| Einstieg | `PortalVorgangDetail` mit `showHvAbnahme` → `OrganisationHvVorgangDetail` |

**Dateien:** `hv-detail.ts`, `hv-detail-adapters.ts`, `OrganisationHvVorgangDetail.tsx`, `PortalVorgangDetail`, `PortalClient`, `OrganisationFreigabePanel`  
**Tests:** `npm run test:portal2-hv-d3`

---

## D4 / TEIL E — Kunde-HV Objekte (E1–E3)

| Entscheidung | Begründung |
|---|---|
| E1 Karten-Grid Mock | Name · Adresse · Typ·WE · Badges `{offen} offen` / `{n} Wohneinheiten` · Aushang · Bearbeiten · Löschen · Kopieren · Multi-Select |
| Andock Bestand | Spec-Felder → `kunden_objekte` (`kunde_id`/`titel`/Adresse) + `objekt_einheiten` |
| `typ`-Spalte | Migration STOP; Fallback Meta in `notizen_intern` |
| Einheiten-Count | aus `objekt_einheiten` für Badge/Melde wenn Hinweis leer |
| Offen-Count aus Leads (`kunde_objekt_id`) | Spec: real; `leadIsOffenAmObjekt` |
| E2 Wizard 5 Schritte `objWizValid`/`objWizNext` | Mock wortwörtlich; Persistenz `POST/PATCH /api/org/objekte` (+ `typ`) |
| Autopass-Objekt | **OFFENE-PUNKTE** (org: `notfall_direkt`) |
| Freigabe-Schwelle → `freigabe_schwelle_eur` | Spalte existiert |
| E2 Detail-Tabs Mock | Stamm · Einheiten · Mieter · Vorgänge · Regeln · Eigentümer · Dokumente |
| Löschen `DELETE /api/org/objekte` | Spec: blockiert bei offenen Vorgängen (409) |
| `copyObj` → POST Kopie | Mock-Namenslogik `(Kopie)` / `(Kopie n)` |
| E3 Aushang aus Liste **und** Detail | B10 `PortalModalAushang` |
| Mieter-Tab → `PortalModalEinladen` | E4/B9 |

**Migration (STOP):** `supabase/migrations/20260826120000_portal2_objekte_e1.sql` — `kunden_objekte.typ` + Kommentar-Mapping; `objekt_einheiten` idempotent. Nicht applyen bis Freigabe.

**Dateien:** `objekte.ts`, `OrganisationObjektCard`, `OrganisationObjektePanel`, `OrganisationObjektWizard`, `OrganisationObjektDetail`, `/api/org/objekte`, `get-organisation-portal-data`  
**Tests:** `npm run test:portal2-objekte`

---

## TEIL E / E1 — Objekte-Liste (`screenObjekte`) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Karte = Name, Adresse, Einheiten „n Wohneinheiten“ | Spec exakt; Melde-Format `formatEinheitenHinweis` |
| Real über bestehende Tabellen | Keine Parallel-Tabelle; Mapping organisation_ref→`kunde_id`, name→`titel` |
| `OrganisationObjektCard` | Shared E1-Karte (HV; Eigentümer-Lesesicht kann folgen) |
| Melde-Links unangetastet | weiter `melde_slug` / `/melden/{org}/{slug}` |

**Migration:** siehe D4/TEIL E (`20260826120000_portal2_objekte_e1.sql`) — **STOP**.

---

## TEIL E / E2 — Objekt-Wizard + Detail — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Wizard 5 Schritte `objWizValid` / `objWizNext` | Mock wortwörtlich (stamm/einheiten/verwaltung; Fehlertexte 1:1) |
| `openObjEdit` → `openObjEditDraft` | Draft aus `kunden_objekte` + Meta; Wizard-Edit |
| `copyObj` → POST Kopie + `typ` | Namenslogik `(Kopie)` / `(Kopie n)`; danach Detail der Kopie |
| Detail-Tabs `objTabBody` | Stamm · Einheiten · Mieter · Vorgänge · Regeln · Eigentümer · Dokumente |
| Einheiten-Tab | Badge vermietet/leer aus Bewohner-Zuordnung; CTA „＋ Einheit“ |
| `objMieterMenu` | Einladen / erneut · Bearbeiten (Stub) · Vorgänge · Entfernen; Einladen → E4 Modal |
| Mieter entfernen | `DELETE /api/org/einheit-bewohner`; Confirm; Vorgänge bleiben |
| Autopass-Toggle UI | Mock-Texte; Persistenz **OFFENE-PUNKTE** (kein DB-Feld) |
| Löschen: Confirm `objDeleteConfirm` | Mock-Wortlaut |
| **Lösch-Schutz bei offenen Vorgängen** | Spec: nicht löschbar bei aktiven Vorgängen · Client `objektHasActiveVorgaenge` + API **409** · Mock löscht ohne Check — **bewusste Abweichung** zugunsten Spec |

**Dateien:** `objekte.ts`, `OrganisationObjektWizard`, `OrganisationObjektDetail`, `OrganisationObjektMieterTab/Menu`, `OrganisationObjektEinheitenPanel`, `OrganisationObjektePanel`  
**Tests:** `npm run test:portal2-objekte`

---

## TEIL E / E3 — Aushang/QR (`aushangPoster`, `aushangUrl`, `qrSvg`) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Poster 1:1 Mock + A2 HV-Branding | Name/Logo/Palette; Objektname **und** Adresse |
| `aushangUrl` / `aushangSlug` | Live `buildMeldeUrl(org, melde_slug)` — kein Mock-Domain |
| QR scannbar auf Melde-URL | `buildMeldeQrUrl`; Mock-`qrSvg`/`qrMatrix` nur Referenz (nicht scannbar) |
| Print-Meta `omelette-owns-print: aushang` | Modal setzt Meta; Layout der Print-Route ebenfalls |
| Eigene Print-Ansicht | `/portal/aushang/[objektId]` — A4-Poster `#aushang-print` + `@media print` |
| Öffnen aus Liste **und** Detail | `PortalModalAushang` / QR-Aushang-CTA |
| PDF | bestehend `/api/org/melde-aushang` ungebrochen |

**Migration:** keine.

**Dateien:** `aushang.ts`, `qr-matrix.ts`, `PortalAushangPoster`, `PortalModalAushang`, `PortalAushangPrintClient`, `portal/aushang/[objektId]`, `globals.css`  
**Tests:** `npm run test:portal2-aushang`

---

## D5 — Kunde-HV Servicepakete (`screenServicepakete`) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| 3 Paketkarten 1:1 Mock | Basis-Wartung · Komfort-Service (Beliebt) · Full-Service Plus — Namen, Desc, Preis, Feats, CTA „Paket wählen“ |
| Intro + pageHead „Servicepakete“ | Mock wortwörtlich |
| Modal Titel „Paket angefragt“ | Mock `modalShell` / `paketOk` |
| Headline `„{Paketname}" angefragt` + Body + „Schließen“ | Spec exakt |
| Real: Lead via `POST /api/org/servicepaket-anfrage` | CRM-Ereignis; `anlass=servicepaket`, Audit `servicepaket_angefragt` |
| Kanal live = `org_service` | Enum existiert; Spec-Vorschlag Literal **`servicepaket`** → Migration bereit, **nicht angewandt** |
| Objekt optional / erstes Objekt als Hinweis | Modal: Zuordnung durch Bärenwald; kein Objekt-Picker im Mock |
| `skipKundeMail: true` | Bestätigung = Modal; interne CRM-Mail bleibt |
| Katalog-Panel aus Nav-Screen entfernt | Mock-Screen = Pakete; detaillierter Flow weiter über „Neue Anfrage“ → Servicepaket |
| Aktive Abos bleiben unter den Karten | Bestehende Abo-Verwaltung nicht entfernen |

**Migration (STOP):** `supabase/migrations/20260821120000_lead_kanal_servicepaket.sql` — erst nach Freigabe anwenden, dann Code auf `SERVICEPAKET_KANAL_VORSCHLAG` umstellen.

**Dateien:** `servicepakete.ts`, `OrganisationServicepaketePanel`, `/api/org/servicepaket-anfrage`, `OrganisationPortalClient`, Migration  
**Tests:** `npm run test:portal2-servicepakete`

---

## D6 / D12 — Kunde-HV Einstellungen (`screenSettings`, HV-Variante)

| Entscheidung | Begründung |
|---|---|
| Gemeinsamer Screen D12, Variante `hv` | Spec D6 → D12; Titel „Einstellungen“ (nicht „Profil“) |
| Mock-Blöcke Reihenfolge | Profil · Branding & White-Label · Globaler Schwellenwert · Objekt-Schwellen |
| Branding-Editor = `BRAND_PRESETS` + Stammdaten + Live-Vorschau | A2 deferred Editor; jetzt D12 |
| Auto-Save Debounce → `PATCH /api/org/branding` | Mock „automatisch gespeichert“ |
| Farben → `org_primary_color` + dk/soft | A2-Felder; Migration `20260818120000` weiter **STOP** bis Freigabe |
| Service-E-Mail → `mieter_kontakt_email` | Mock ORG.mail; bestehendes Mieter-Kontakt-Feld |
| Logo-Datei-Upload | **OFFENE-PUNKTE** — Anzeige `org_logo_url` / Kürzel |
| Globale Schwelle Range 0–2000 / 50 | Mock; → `/api/org/einstellungen` |
| Objekt-Schwellen Liste real | aus `kunden_objekte.freigabe_schwelle_eur`; Edit unter Objekt-Detail |
| MeldeMaterial / Team / AV / weitere Regeln darunter | Bestand nicht entfernen |
| Privatkunde/Mieter/HW-Varianten | **D12 v3 erledigt** (siehe Abschnitt darunter) |

**Migration:** Branding-Palette weiter `20260818120000_org_branding_palette.sql` (nicht neu). Ohne Apply: API meldet fehlende Spalten klar.

**Dateien:** `einstellungen.ts`, `OrganisationEinstellungenScreen`, `OrganisationBrandingEditor`, `/api/org/branding`, `OrganisationPortalClient`  
**Tests:** `npm run test:portal2-einstellungen`

---

## D12 — Einstellungen v3 (alle Rollen: `screenSettings`, pf, grid2, edField)

| Entscheidung | Begründung |
|---|---|
| Ein Screen, Varianten `hv` / `mieter` / `handwerker` / `privat` | Mock-Flags; Titel Konto / Firmendaten / Einstellungen |
| max-Breite hw **640**, sonst **560** | Mock `maxW = hw ? 640 : 560` |
| Shared `EinstellungenPfRow` / `EdField` / `Grid2` | Mock `pf` 12.5/13.5, `edField`, `grid2` gap 11 |
| HV: ORG-Felder + `BRAND_PRESETS` + `applyBrand` | Bestand D6; wirkt auf WL (D9 Melde, E3 Aushang, …) |
| HW: Mock-Felder 1:1 (erscheinen auf Angeboten) | Firmenname, Inhaber, Straße, PLZ/Ort, Tel, Mail, USt, Steuernr, HRB, IBAN, BIC, Bank; Autosave |
| Mieter Konto: Profil + Zugang + **Sprache (A3)** | Spec; DE/EN in `localStorage` (`portal2_ui_lang`); Zugang-Text Mock |
| Privat: pf-Profil ohne Branding | D7 beibehalten, Shared-UI |
| HW Extra-Spalten | Migration STOP (strasse/ort/handelsregister/bic/bank); Fallback ohne Spalten |

**Migration (STOP):** `supabase/migrations/20260825120000_handwerker_firmendaten_d12.sql` — noch nicht applyen.

**Dateien:** `einstellungen-ui.ts`, `PortalEinstellungenUi`, `PartnerFirmendatenScreen`, `PortalEinstellungenMieter`, `PortalEinstellungenPrivat`, `OrganisationEinstellungenScreen`, `OrganisationBrandingEditor`, `partner-profil.ts`  
**Tests:** `npm run test:portal2-einstellungen`

---

## D7 — Kunde Privat/Gewerbe (ENTSCHEIDUNG 2)

| Entscheidung | Begründung |
|---|---|
| Keine eigene App | Spec; `/portal` bleibt Entry — `portal_modus` + optional `kunden.typ` |
| `resolvePortalKundeTyp` | organisation→`hv`; sonst `privat`; `typ=gewerbe`→`gewerbe` |
| Gewerbe = gleiche UX wie Privat | Mock hat nur hv\|privat; Gewerbe teilt Nav/Dashboard/Liste |
| Sidebar B2 = `kunde_privat` Nav | Übersicht · Meine Aufträge · Einstellungen |
| Dashboard privat-Variante | Hero + Offen / In Arbeit / Gesamt offen + Zuletzt |
| Liste `listFor` | Daten bereits kundenbezogen; Chips Alle·Offen·In Arbeit·Abgeschlossen |
| Detail = D3-Layout + `privatkunde` | „Automatisch freigegeben (Privatkunde)“; kein Freigabe-Schritt |
| Signatur G4 | `OrganisationHvVorgangDetail` Abnahme wenn `auftragId` (aus Aufträgen) |
| Einstellungen D12 schlank | `PortalEinstellungenPrivat` — Profil + Abmelden, kein Branding |
| HV unverändert | `portal_modus=organisation` → `OrganisationPortalClient` |

**Migration:** keine Pflicht. Optional `kunden.typ` für Gewerbe-Kennung (Fallback ohne Spalte).

**Dateien:** `kunde-typ.ts`, `kunde-dashboard.ts`, `PortalKundePrivatDashboard`, `PortalEinstellungenPrivat`, `PortalClient`, `PortalVorgangDetail`, `portal/page`, `get-portal-data`  
**Tests:** `npm run test:portal2-kunde-d7`

---

## D8 — Eigentümer (`role=eigentuemer`) — ENTSCHEIDUNG: JETZT, neue Rolle

| Entscheidung | Begründung |
|---|---|
| Eigene Rolle `portal_modus=eigentuemer` | Spec; nicht Privat/HV-Variante |
| Sidebar B2 = Dashboard · Vorgänge · Objekte | Mock `navItems` eigentuemer; kein Settings |
| Create-Label „Anfrage erstellen“ → `/rechner` | Funnel C; `portalCreateLabel` |
| Vorgänge `listFor` | nur Leads mit `kunde_objekt_id` ∈ `eigentuemer_objekte` |
| Objekte = Lesesicht E1/E2 | Karten + Detail ohne Edit/Löschen/Wizard |
| Kern: Kostenfreigabe-Schwelle | Default 500 €; Notif-Titel „Kostenfreigabe nötig“ + Body Mock-Template |
| Freigabe-Aktion im Detail | `POST /api/portal/eigentuemer/freigabe` → `eigentuemer_freigabe_status` |
| Sichtbarkeit | ohne Zuordnung → leere Listen (kein Leak) |

**Migration (STOP):** `supabase/migrations/20260822120000_portal_eigentuemer.sql` — `portal_modus` + `eigentuemer_objekte` + `eigentuemer_freigabe_schwelle_eur` + `leads.eigentuemer_freigabe_status`. Erst nach Freigabe anwenden.

**Dateien:** `eigentuemer.ts`, `get-eigentuemer-portal-data`, `EigentuemerPortalClient`, `/api/portal/eigentuemer/freigabe`, `nav-items` Variant, `portal/page`, Migration  
**Tests:** `npm run test:portal2-eigentuemer`

---

## D9 — Mieter-Weblink (`mieterWLFrame`) — PRIORITÄT 1

| Entscheidung | Begründung |
|---|---|
| Echter `/melden/{slug}`-Flow, kein Login | Spec; bestehende Persistenz/Token unangetastet |
| UI = Mock `mieterWLFrame` + wlHeader/Footer/Card/Btn | HV-Branding A2 (Name, Logo/Kürzel, Farben, DE/EN) |
| Wizard = bestehendes Funnel C (`MeldeFormular`) | TEIL C; nur Shell gewechselt |
| Bestätigung = Status-Link, **keine Mail** | Spec/TEIL C über Mock-E-Mail-Satz; Titel „Meldung eingegangen“ |
| Status = STG 4 Stufen de+en wortwörtlich | `MIETER_STG` / Mock `STG.json`; Headline „Titel — Subtitle“ |
| Fehler = `wlFehler` Exact | „Link nicht verfügbar“ + Melde-Link-Wortlaut; Button „Zur Objektauswahl“ |
| Footer Exact | „Bei Rückfragen erreichen Sie {name} · {tel} · {mail}.“ + No-Reply |

**Migration:** keine.

**Dateien:** `mieter-wl.ts`, `MieterWlFrame`, `MieterStgTimeline`, `MeldeObjektAuswahl`, `MeldeFehlerClient`, `MeldeFormular`, `MeldenBestaetigungClient`, `MeldeStatusClient`, Melde-Pages  
**Tests:** `npm run test:portal2-mieter-wl`

---

## D11 — Handwerker (`role=handwerker`) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Portal = `/partner` (nicht `/portal` + Role) | Bestand; Sidebar B2 ohne Create (`canCreate` handwerker=false) |
| Start: „Offene Anfragen“ prominent | Overview-Liste; Aufträge = `listFor`/Vorgänge mit `org_freigabe`-Filter |
| Annehmen → bestehender `confirmPartnerAuftrag` | Statuswechsel unangetastet; danach HW-Kalkulation |
| HW-Kalkulation JETZT: Positionen CRUD, 19 %, Einreichen | Mock `screenHwKalkulation` / `DEFAULT_POSITIONEN`; echtes `angebote` + `angebot_handwerker` |
| Herkunft `handwerker` am Angebot | D3 `pickEmpfohlenesAngebot` bevorzugt `herkunft=handwerker` |
| Bautagebuch = bestehende Actions | `partner-bautagebuch` / `modalTagebuch` |
| Abschluss-Doku + Signatur JETZT | Checkliste Mock, Canvas (`SignatureCanvas`), PNG+Zeitstempel+Name am Protokoll |
| Gegenzeichnung Kunde/HV | unverändert D3/D7 (`hv_portal_abnahmen`) |

**Migrationen (STOP — noch nicht applyen, bis Belal freigibt):**
- `supabase/migrations/20260823120000_angebot_herkunft_handwerker.sql` — `angebote.herkunft`
- `supabase/migrations/20260824120000_handwerker_signatur_abschluss.sql` — `abnahme_protokolle.hw_signatur_*` / `kunde_signatur_*`, `auftraege.hw_abschluss_signiert_am`

**Dateien:** `hw-kalkulation.ts`, `partner-hw-kalkulation.ts`, `PartnerHwKalkulationScreen`, `PartnerOffenDetail`, `PartnerAuftragDetail`, `PartnerAbnahmeprotokollForm`, `partner-abnahmeprotokoll.ts`, `hv-detail`/`adapters`, `get-portal-data` (herkunft-Fallback)

**Tests:** `npm run test:portal2-hw-kalk`, `npm run test:portal2-hv-d3`


---

## TEIL F — Auth (`authFrame`, `authBody`, `authConfirm`, …) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Zwei-Spalten-`authFrame` (Brand + Body) | Mock-Optik; mobil gestapelt |
| `authWL` = mieter \| eigentuemer | HV-Branding A2; sonst Bärenwald |
| `authBrandName` / Brand-Texte 1:1 | Tagline, Body, Bullets, „Betrieben mit Bärenwald“ |
| Login/Forgot/`authConfirm` Wortlaut | Mock; Magic-Link = Supabase OTP |
| Rolle aus Route/`?role=` | Keine Demo-Rollen-Pills aus dem Mock |
| Partner = `authRole=handwerker` | `/partner/login` über `PartnerAuthShell` → Frame |
| Eigentümer/Mieter-Konto | D8/D10 Migrationen + E4 Einladung; Auth-UI WL |
| **Delta Impersonation** | Banner „Admin-Ansicht … Beenden“ + `/auth/crm-enter` — bleibt, nicht im Mock |
| Google/Microsoft-Buttons | Mock-Dekoration — **nicht** verdrahtet (keine Attrappen-OAuth) |

**Migration:** keine neuen; D8/D10 STOP bleiben.

**Dateien:** `auth.ts`, `PortalAuthFrame`, `PortalAuthBrandPanel`, `PortalAuthConfirm`, `AuthPrimitives`, `PortalAuthShell`, Login/Forgot/Partner-Shell, `AdminViewBanner`, `globals.css`  
**Tests:** `npm run test:portal2-auth`

---

## TEIL G — Querschnitt — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| **G1** `prependVerlaufEntry` / `formatVerlaufLine` | Mock `patchVg` („Gerade eben“, Text, Wer); UI weiter Timeline je Vorgang |
| **G2** `angebot-summe.ts` Re-Export | Eine Quelle: Netto Σ×menge, MwSt 19 %, Brutto — D3/D11 nutzen weiter `hv-detail` |
| **G3** `viewport.ts` + `usePortalView` | Breakpoint 1024px; **kein** iPhone-`mobileFrame`-Rahmen |
| **G4** `SignatureCanvas` = `PortalSignaturePad` | Gemeinsames Modul D3/D7 + D11 |
| **G5** `mailFrame`/`mailData`/`mailBody` **NICHT** | ENTSCHEIDUNG 12; bestehende Templates; **keine Mieter-Mails von Bärenwald** |

**Dateien:** `verlauf.ts`, `angebot-summe.ts`, `viewport.ts`, `use-portal-view.ts`, `SignatureCanvas`  
**Tests:** `npm run test:portal2-querschnitt`

---

## Layout — Card-Auflösung / desktopFrame — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Shell = Mock `desktopFrame` (eine Fläche Sidebar+Content, `#f6f7f6`) | Kein Gap zwischen Sidebar und Main; kein separates Sidebar-Card |
| `.portal-ui .card-bordered` → transparent | Card-Logik global im Portal weg; Marketing unberührt |
| Listen = `.portal-list-panel` + Hairline-Zeilen (`PortalListCard`) | Mock „Zuletzt“/Liste, keine gestapelten Einzel-Cards |
| KPI = `.portal-kpi-card` (weiße Tiles) | Mock Stat-Tiles; bewusst kein Card-Stack |
| Hero edge-to-edge im Content | Mock `screenDashboard` ohne inset rounded Hero |
| Screenshots Startseiten | Optional für QA; Mock-JS reicht für Umsetzung |

**Dateien:** `PortalShell`, `globals.css`, `PortalListCard`, Dashboards HV/Privat, `PortalClient`, `PartnerClient`, Org-Listenpanels


| Partner-Start = Hero + 3 KPIs (Mock HW) + Offene-Anfragen-Liste | Folge Explore: Partner war Rest-Gap; Controlling-4er-Grid ersetzt durch Mock-Tiles |
| `PartnerHwDashboard` | Analog HV/Privat; KPIs aus `VorgangState` |


| Startseiten = `PortalScreenDashboard` 1:1 Mock | Hero 150/200, Tiles, „Zuletzt“/„Alle ansehen“/„Noch nichts“; keine Live-Extras auf Start |
| Extras (Wiedervorlage, GPT, Kontakt, Freigabe-Block) | nicht auf Übersicht — Mock `screenDashboard` endet bei Liste |


---

## Vorgänge — Liste/Detail-Screens (Mock screenListe / screenDetail) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Kein Split-Pane (Liste\|Detail nebeneinander) | Mock: `setScreen('liste')` → `setScreen('detail')` |
| Alle Portale: Liste **oder** Detail vollbreit | HV / Partner / Privat / Eigentümer |
| HV Freigabe: Sektionen + Row-Aktionen; Detail eigener Screen | Mock `hvFilter==='freigabe'` |
| Detail: Cover + ‹ Zurück + Header + Timeline-Kreise + 2-Spalten | Mock `screenDetail` |
| URL `id` steuert Detail; Chips/pageHead nur auf Liste | Chrome ausgeblendet im Detail |

**Dateien:** `PortalClient`, `OrganisationVorgaengeSection`, `OrganisationEingangPanel`, `OrganisationFreigabePanel`, `OrganisationHvVorgangDetail`, `PartnerClient`, `EigentuemerPortalClient`


---

## Einstellungen — Subnav (Mock settingsTab) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Kein Stapel aller Blöcke untereinander | Mock: Subnav links + eine aktive Fläche |
| Desktop: vertikale Subnav · Mobile: horizontale Tabs | Mock-Annotation |
| HV: Profil · Branding & White-Label · Freigabe-Regeln | Mock HV |
| Handwerker: Anschrift · Steuer · Bank | Mock HW |
| Mieter: Profil · Zugang | Mock Mieter |
| Privat: nur Profil (ohne Subnav-Liste) | Mock Privatkunde |
| Tab in `sessionStorage` (`portal2_settings_tab_*`) | Mock `settingsTab` Persistenz |

**Dateien:** `PortalEinstellungenShell`, `einstellungen-nav.ts`, Org/Partner/Mieter/Privat-Einstellungen-Screens


---

## Funnel-Varianten (Web + Portale) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Web: Kontakt inkl. volle Adresse **vor** Preis → Ergebnis → Absenden | Preise nicht ohne Lead sichtbar |
| Shared Core `PortalFunnelHost` | Ein Design/Sequenz für Melde + Portale |
| Melde/Mieter: `kaputt`, kein Preis, Website-Fachdetails | Ersetzt altes Melde-13-Schritt-UI |
| HV: ein Funnel + Objekt neu (`POST /api/org/objekte`) + Fachdetails + Preis | Kein Hub-Multi-Choice |
| Privat/Eigentümer: Modal-Funnel statt `/rechner` | Kein Trust/GPT im Portal |
| Servicepakete: Cards → `persistLead` | Unverändert |
| Kein Termin-Schritt im Melde | Produkt |

**Dateien:** `PortalFunnelHost`, `MeldeFormular`, `OrganisationAnfrageHub`, `PortalCreateFunnelModal`, `PortalClient`, `EigentuemerPortalClient`, `funnel-variant.ts`


---

## Funnel-Varianten (Web + Portale) — ENTSCHEIDUNG: JETZT

| Entscheidung | Begründung |
|---|---|
| Web: Kontakt inkl. volle Adresse **vor** Preis → Ergebnis → Absenden | Preise nicht ohne Lead sichtbar (Konkurrenzschutz) |
| Portale: kein Trust, kein GPT-Einstieg | Nur Website |
| Mieter: nur `kaputt`, kein Preis | Melde-Kontext |
| HV: **ein** Funnel-Einstieg (Objekt/Mieter-Prefix + Fachfragen + Preis) | Kein Multi-Choice-Hub mehr |
| Eigentümer/Privat: Preis ja; Prefix Objekte | Wie Endkunde |
| Servicepakete: Cards → `persistLead` (`org_service`) | Nicht Create-Hub; CRM ok |
| Kein Termin-Schritt im Melde-Funnel | Koordination später im Portal |
| Varianten-Matrix | `src/lib/funnel/funnel-variant.ts` |

**Dateien:** `rechner/page.tsx`, `portal-tools/rechner`, `melde-funnel.ts`, `MeldeFormular`, `OrganisationAnfrageHub`, `OrganisationPortalCreateFunnel`, `funnel-variant.ts`

